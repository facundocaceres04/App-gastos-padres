-- Bloque B: confianza entre los dos progenitores.
-- · Autoría que no se puede falsificar (created_by / updated_by los pone la base).
-- · Un mes saldado queda bloqueado: no se modifican sus gastos ni su acuerdo hasta reabrirlo.
-- · Cada uno edita solo su propio nombre y CBU/Alias.
-- · Historial de actividad (append-only), visible para los dos y con Realtime.
-- Las operaciones de sistema (auth.uid() nulo: service role, borrados en cascada) no se bloquean.

-- ─── Columnas de autoría ─────────────────────────────────────────────────────

alter table public.expenses
  add column if not exists updated_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_at timestamptz;
alter table public.expenses alter column created_by set default auth.uid();

alter table public.month_configs
  add column if not exists updated_by uuid references auth.users (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists settled_by uuid references auth.users (id) on delete set null;

-- ─── Gastos: autoría + bloqueo de meses saldados ─────────────────────────────

create or replace function public.month_is_settled(hid uuid, d date)
returns boolean
language sql stable set search_path = ''
as $$
  select exists (
    select 1 from public.month_configs
    where household_id = hid and month_key = to_char(d, 'YYYY-MM') and settled
  );
$$;

create or replace function public.guard_expense()
returns trigger
language plpgsql set search_path = ''
as $$
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
  else
    new.household_id := old.household_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_guard on public.expenses;
create trigger expenses_guard
  before insert or update or delete on public.expenses
  for each row execute function public.guard_expense();

-- ─── Acuerdo del mes: autoría, quién saldó y bloqueo del % ───────────────────

create or replace function public.guard_month_config()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.settled and new.settled and new.father_pct <> old.father_pct then
    raise exception 'El mes está saldado: reabrilo para cambiar el acuerdo';
  end if;

  new.updated_by := auth.uid();
  new.updated_at := now();
  if new.settled and (tg_op = 'INSERT' or not old.settled) then
    new.settled_by := auth.uid();
    new.settled_at := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  elsif not new.settled then
    new.settled_by := null;
    new.settled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists month_configs_guard on public.month_configs;
create trigger month_configs_guard
  before insert or update on public.month_configs
  for each row execute function public.guard_month_config();

-- ─── Familia: cada uno edita solo su nombre y su CBU/Alias ───────────────────
-- (el nombre del otro se puede corregir mientras todavía no se sumó)

create or replace function public.guard_household()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_role text;
  v_other_joined boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  select role into v_role from public.household_members where household_id = new.id and user_id = auth.uid();
  select exists (
    select 1 from public.household_members where household_id = new.id and role <> v_role
  ) into v_other_joined;

  if v_role <> 'padre' and new.padre_alias is distinct from old.padre_alias then
    raise exception 'Solo el padre puede cambiar su CBU/Alias';
  end if;
  if v_role <> 'madre' and new.madre_alias is distinct from old.madre_alias then
    raise exception 'Solo la madre puede cambiar su CBU/Alias';
  end if;
  if v_other_joined and v_role <> 'padre' and new.padre_name is distinct from old.padre_name then
    raise exception 'Solo el padre puede cambiar su nombre';
  end if;
  if v_other_joined and v_role <> 'madre' and new.madre_name is distinct from old.madre_name then
    raise exception 'Solo la madre puede cambiar su nombre';
  end if;
  return new;
end;
$$;

drop trigger if exists households_guard on public.households;
create trigger households_guard
  before update on public.households
  for each row execute function public.guard_household();

-- ─── Historial de actividad ──────────────────────────────────────────────────

create table if not exists public.activity (
  id           bigint generated always as identity primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  actor        uuid references auth.users (id) on delete set null,
  kind         text not null,
  data         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists activity_household_idx on public.activity (household_id, created_at desc);

alter table public.activity enable row level security;
drop policy if exists activity_select on public.activity;
create policy activity_select on public.activity
  for select to authenticated using (public.is_member(household_id));
-- Nadie escribe a mano: solo los triggers (security definer).
revoke insert, update, delete, truncate on public.activity from authenticated, anon;

create or replace function public.expense_snapshot(e public.expenses)
returns jsonb
language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'concept', e.concept, 'amount', e.amount, 'paid_by', e.paid_by,
    'date', e.date, 'child', e.child, 'category', e.category
  );
$$;

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
    values (new.household_id, auth.uid(), 'expense_added', public.expense_snapshot(new));
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
    if v_changes <> '{}' then
      insert into public.activity (household_id, actor, kind, data)
      values (new.household_id, auth.uid(), 'expense_updated', public.expense_snapshot(new) || jsonb_build_object('changes', v_changes));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists expenses_activity on public.expenses;
create trigger expenses_activity
  after insert or update or delete on public.expenses
  for each row execute function public.log_expense_activity();

create or replace function public.log_month_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  if tg_op = 'INSERT' or new.father_pct <> old.father_pct then
    insert into public.activity (household_id, actor, kind, data)
    values (new.household_id, auth.uid(), 'split_changed', jsonb_build_object(
      'month', new.month_key,
      'from', case when tg_op = 'UPDATE' then old.father_pct end,
      'to', new.father_pct));
  end if;
  if new.settled and (tg_op = 'INSERT' or not old.settled) then
    insert into public.activity (household_id, actor, kind, data)
    values (new.household_id, auth.uid(), 'month_settled', jsonb_build_object('month', new.month_key));
  elsif tg_op = 'UPDATE' and old.settled and not new.settled then
    insert into public.activity (household_id, actor, kind, data)
    values (new.household_id, auth.uid(), 'month_reopened', jsonb_build_object('month', new.month_key));
  end if;
  return null;
end;
$$;

drop trigger if exists month_configs_activity on public.month_configs;
create trigger month_configs_activity
  after insert or update on public.month_configs
  for each row execute function public.log_month_activity();

create or replace function public.log_household_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_fields text[] := '{}';
begin
  if auth.uid() is null then
    return null;
  end if;
  if new.padre_name is distinct from old.padre_name then v_fields := array_append(v_fields, 'padre_name'); end if;
  if new.madre_name is distinct from old.madre_name then v_fields := array_append(v_fields, 'madre_name'); end if;
  if new.padre_alias is distinct from old.padre_alias then v_fields := array_append(v_fields, 'padre_alias'); end if;
  if new.madre_alias is distinct from old.madre_alias then v_fields := array_append(v_fields, 'madre_alias'); end if;
  if new.children is distinct from old.children then v_fields := array_append(v_fields, 'children'); end if;
  if cardinality(v_fields) > 0 then
    insert into public.activity (household_id, actor, kind, data)
    values (new.id, auth.uid(), 'family_updated', jsonb_build_object('fields', to_jsonb(v_fields)));
  end if;
  return null;
end;
$$;

drop trigger if exists households_activity on public.households;
create trigger households_activity
  after update on public.households
  for each row execute function public.log_household_activity();

create or replace function public.log_member_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.activity (household_id, actor, kind, data)
  values (new.household_id, new.user_id, 'member_joined', jsonb_build_object('role', new.role));
  return null;
end;
$$;

drop trigger if exists members_activity on public.household_members;
create trigger members_activity
  after insert on public.household_members
  for each row execute function public.log_member_activity();

-- Realtime para avisar al otro de los cambios.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity'
  ) then
    alter publication supabase_realtime add table public.activity;
  end if;
end $$;
