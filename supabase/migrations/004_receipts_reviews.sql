-- Bloque D: comprobantes adjuntos y revisión de gastos por el otro progenitor.

-- ─── Columnas nuevas ─────────────────────────────────────────────────────────

alter table public.expenses
  add column if not exists receipt_path text,
  add column if not exists review_status text not null default 'pendiente'
    check (review_status in ('pendiente', 'aceptado', 'observado')),
  add column if not exists review_note text check (review_note is null or length(review_note) <= 140),
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- ─── Guardia de gastos (reemplaza la de 003) ─────────────────────────────────
-- · Las columnas de revisión solo cambian vía review_expense() (flag de sesión).
-- · Si se edita el contenido de un gasto, vuelve a "pendiente": hay que revisarlo de nuevo.

create or replace function public.guard_expense()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_reviewing boolean := coalesce(current_setting('cuentas.review', true), '') = '1';
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and public.month_is_settled(old.household_id, old.date) then
    raise exception 'Ese mes está saldado: reabrilo para modificar sus gastos';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if public.month_is_settled(new.household_id, new.date) then
    raise exception 'Ese mes está saldado: reabrilo para cargar gastos en esa fecha';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.updated_by := null;
    new.updated_at := null;
    new.review_status := 'pendiente';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  new.household_id := old.household_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if v_reviewing then
    return new; -- la revisión no cuenta como "edición" del gasto
  end if;

  if new.review_status is distinct from old.review_status
     or new.review_note is distinct from old.review_note
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'La revisión de un gasto se hace con Aceptar u Observar';
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();
  if (new.concept, new.amount, new.paid_by, new.date, new.child, new.category, new.receipt_path)
     is distinct from (old.concept, old.amount, old.paid_by, old.date, old.child, old.category, old.receipt_path) then
    new.review_status := 'pendiente';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  return new;
end;
$$;

-- ─── Revisar un gasto: solo el progenitor que NO lo cargó ────────────────────

create or replace function public.review_expense(p_id uuid, p_status text, p_note text default null)
returns public.expenses
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.expenses;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_status not in ('aceptado', 'observado', 'pendiente') then raise exception 'Estado inválido'; end if;

  select * into v_row from public.expenses where id = p_id;
  if not found or not public.is_member(v_row.household_id) then raise exception 'Gasto inexistente'; end if;
  if v_row.created_by = auth.uid() then raise exception 'El gasto lo revisa el otro progenitor'; end if;
  if p_status = 'observado' and v_note is null then raise exception 'Contá brevemente qué hay que revisar'; end if;
  if length(v_note) > 140 then raise exception 'El motivo puede tener hasta 140 caracteres'; end if;

  perform set_config('cuentas.review', '1', true);
  update public.expenses
     set review_status = p_status,
         review_note = case when p_status = 'observado' then v_note end,
         reviewed_by = case when p_status = 'pendiente' then null else auth.uid() end,
         reviewed_at = case when p_status = 'pendiente' then null else now() end
   where id = p_id
  returning * into v_row;
  perform set_config('cuentas.review', '', true);

  insert into public.activity (household_id, actor, kind, data)
  values (v_row.household_id, auth.uid(), 'expense_reviewed',
          public.expense_snapshot(v_row) || jsonb_build_object('status', p_status, 'note', v_row.review_note));
  return v_row;
end;
$$;

revoke execute on function public.review_expense(uuid, text, text) from public, anon;
grant execute on function public.review_expense(uuid, text, text) to authenticated;

-- ─── Historial: también registra cambios de comprobante ──────────────────────

create or replace function public.log_expense_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_changes jsonb := '{}';
begin
  if auth.uid() is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.activity (household_id, actor, kind, data)
    values (new.household_id, auth.uid(), 'expense_added', public.expense_snapshot(new) || jsonb_build_object('receipt', new.receipt_path is not null));
  elsif tg_op = 'DELETE' then
    insert into public.activity (household_id, actor, kind, data)
    values (old.household_id, auth.uid(), 'expense_deleted', public.expense_snapshot(old));
  else
    if new.concept is distinct from old.concept then v_changes := v_changes || jsonb_build_object('concept', jsonb_build_array(old.concept, new.concept)); end if;
    if new.amount is distinct from old.amount then v_changes := v_changes || jsonb_build_object('amount', jsonb_build_array(old.amount, new.amount)); end if;
    if new.paid_by is distinct from old.paid_by then v_changes := v_changes || jsonb_build_object('paid_by', jsonb_build_array(old.paid_by, new.paid_by)); end if;
    if new.date is distinct from old.date then v_changes := v_changes || jsonb_build_object('date', jsonb_build_array(old.date, new.date)); end if;
    if new.child is distinct from old.child then v_changes := v_changes || jsonb_build_object('child', jsonb_build_array(old.child, new.child)); end if;
    if new.category is distinct from old.category then v_changes := v_changes || jsonb_build_object('category', jsonb_build_array(old.category, new.category)); end if;
    if new.receipt_path is distinct from old.receipt_path then
      v_changes := v_changes || jsonb_build_object('receipt', jsonb_build_array(old.receipt_path is not null, new.receipt_path is not null));
    end if;
    if v_changes <> '{}' then
      insert into public.activity (household_id, actor, kind, data)
      values (new.household_id, auth.uid(), 'expense_updated', public.expense_snapshot(new) || jsonb_build_object('changes', v_changes));
    end if;
  end if;
  return null;
end;
$$;

-- ─── Storage: comprobantes privados por familia ──────────────────────────────
-- Ruta: <household_id>/<expense_id>/<archivo>. Solo los miembros de esa familia leen/escriben.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.receipt_household(object_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 1)::uuid
  end;
$$;

drop policy if exists comprobantes_select on storage.objects;
create policy comprobantes_select on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and public.is_member(public.receipt_household(name)));

drop policy if exists comprobantes_insert on storage.objects;
create policy comprobantes_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and public.is_member(public.receipt_household(name)));

drop policy if exists comprobantes_delete on storage.objects;
create policy comprobantes_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and public.is_member(public.receipt_household(name)));
