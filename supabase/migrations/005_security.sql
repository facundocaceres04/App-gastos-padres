-- Bloque C: seguridad.
-- · Código de invitación criptográficamente aleatorio, con vencimiento (7 días) y rotación.
-- · Límite de intentos fallidos al unirse (por usuario y por IP): no se puede adivinar probando.
-- · Salir de la familia y quitar al otro integrante (el código se rota para que no pueda volver).
-- · Límites de largo y valores válidos en la base, no solo en el formulario.

-- ─── Código de invitación ────────────────────────────────────────────────────

alter table public.households
  add column if not exists invite_expires_at timestamptz not null default now() + interval '7 days';

-- 6 caracteres de un alfabeto de 32 (sin 0/O/1/I). 256 es múltiplo de 32: sin sesgo.
create or replace function public.new_invite_code()
returns text
language plpgsql volatile set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

create or replace function public.create_household(
  p_role text, p_my_name text, p_other_name text, p_children text[]
)
returns public.households
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.households;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_role not in ('padre', 'madre') then raise exception 'Rol inválido'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Ya pertenecés a una familia';
  end if;

  insert into households (invite_code, padre_name, madre_name, children, created_by)
  values (
    public.new_invite_code(),
    coalesce(nullif(trim(case when p_role = 'padre' then p_my_name else p_other_name end), ''), 'Padre'),
    coalesce(nullif(trim(case when p_role = 'madre' then p_my_name else p_other_name end), ''), 'Madre'),
    coalesce(p_children, '{}'),
    auth.uid()
  )
  returning * into v_row;

  insert into household_members (household_id, user_id, role) values (v_row.id, auth.uid(), p_role);
  return v_row;
end;
$$;

-- Intentos fallidos de unirse. Nadie los lee desde la app: solo join_household.
create table if not exists public.join_attempts (
  id      bigint generated always as identity primary key,
  user_id uuid,
  ip      text,
  at      timestamptz not null default now()
);
create index if not exists join_attempts_user_idx on public.join_attempts (user_id, at);
create index if not exists join_attempts_ip_idx on public.join_attempts (ip, at);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from public, anon, authenticated;

-- Devuelve el id de la familia, o null si el código no sirve (inválido, vencido o familia completa:
-- el mismo resultado para los tres, así no se puede saber qué códigos existen).
-- Un código inválido NO lanza error: si lo hiciera se desharía el registro del intento.
drop function if exists public.join_household(text);
create function public.join_household(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_row  public.households;
  v_role text;
  v_ip   text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  if (select count(*) from join_attempts where user_id = auth.uid() and at > now() - interval '15 minutes') >= 5
     or (v_ip <> '' and (select count(*) from join_attempts where ip = v_ip and at > now() - interval '15 minutes') >= 20) then
    raise exception 'Demasiados intentos con códigos inválidos. Esperá 15 minutos.';
  end if;

  select * into v_row from households where invite_code = upper(trim(p_code));

  if found and exists (select 1 from household_members where user_id = auth.uid() and household_id = v_row.id) then
    return v_row.id;
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Ya pertenecés a otra familia';
  end if;

  if found and v_row.invite_expires_at > now() then
    select r into v_role from unnest(array['padre', 'madre']) as r
    where r not in (select role from household_members where household_id = v_row.id)
    limit 1;
  end if;

  if v_role is null then
    insert into join_attempts (user_id, ip) values (auth.uid(), nullif(v_ip, ''));
    delete from join_attempts where at < now() - interval '1 day';
    return null;
  end if;

  insert into household_members (household_id, user_id, role) values (v_row.id, auth.uid(), v_role);
  return v_row.id;
end;
$$;
revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.join_household(text) to authenticated;

-- Genera un código nuevo (el anterior deja de servir) válido por 7 días.
create or replace function public.rotate_invite_code()
returns public.households
language plpgsql security definer set search_path = public
as $$
declare
  v_hid uuid;
  v_row public.households;
begin
  select household_id into v_hid from household_members where user_id = auth.uid();
  if v_hid is null then raise exception 'No pertenecés a ninguna familia'; end if;
  update households
     set invite_code = public.new_invite_code(), invite_expires_at = now() + interval '7 days'
   where id = v_hid
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function public.rotate_invite_code() from public, anon;
grant execute on function public.rotate_invite_code() to authenticated;

-- ─── Salir de la familia / quitar al otro ────────────────────────────────────

-- Salir. Si eras el último integrante, la familia y sus datos se borran
-- (los comprobantes de Storage los borra la app antes de llamar a esta función).
create or replace function public.leave_household()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_m household_members;
begin
  select * into v_m from household_members where user_id = auth.uid();
  if not found then return; end if;

  delete from household_members where user_id = auth.uid();
  if not exists (select 1 from household_members where household_id = v_m.household_id) then
    -- En orden: si se borrara la familia directo, el cascade dispararía el historial de los
    -- gastos borrados apuntando a una familia que ya no existe. Primero los meses (así ninguno
    -- queda "saldado" y bloqueado), después los gastos, y al final la familia con su historial.
    delete from month_configs where household_id = v_m.household_id;
    delete from expenses where household_id = v_m.household_id;
    delete from households where id = v_m.household_id;
    return;
  end if;
  insert into activity (household_id, actor, kind, data)
  values (v_m.household_id, auth.uid(), 'member_left', jsonb_build_object('role', v_m.role));
  -- Quien se fue no puede volver con el código que conocía.
  update households
     set invite_code = public.new_invite_code(), invite_expires_at = now() + interval '7 days'
   where id = v_m.household_id;
end;
$$;

-- Quitar al otro integrante (p. ej. si se unió alguien equivocado). Los gastos quedan.
create or replace function public.remove_partner()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_m     household_members;
  v_other household_members;
begin
  select * into v_m from household_members where user_id = auth.uid();
  if not found then raise exception 'No pertenecés a ninguna familia'; end if;
  select * into v_other from household_members where household_id = v_m.household_id and user_id <> auth.uid();
  if not found then raise exception 'Todavía no se sumó nadie más'; end if;

  delete from household_members where household_id = v_m.household_id and user_id = v_other.user_id;
  insert into activity (household_id, actor, kind, data)
  values (v_m.household_id, auth.uid(), 'member_removed', jsonb_build_object('role', v_other.role));
  update households
     set invite_code = public.new_invite_code(), invite_expires_at = now() + interval '7 days'
   where id = v_m.household_id;
end;
$$;

revoke execute on function public.leave_household() from public, anon;
revoke execute on function public.remove_partner() from public, anon;
grant execute on function public.leave_household() to authenticated;
grant execute on function public.remove_partner() to authenticated;

-- ─── Límites de datos ────────────────────────────────────────────────────────

create or replace function public.children_ok(c text[])
returns boolean
language sql immutable set search_path = ''
as $$
  select cardinality(c) <= 10 and coalesce((select bool_and(length(x) between 1 and 40) from unnest(c) x), true);
$$;

alter table public.expenses
  drop constraint if exists expenses_limits,
  add constraint expenses_limits check (
    length(concept) <= 120
    and length(child) <= 40
    and amount <= 1000000000
    and category in ('educacion', 'salud', 'indumentaria', 'recreacion', 'alimentos', 'varios')
    and date between '2000-01-01' and '2100-12-31'
  );

alter table public.households
  drop constraint if exists households_limits,
  add constraint households_limits check (
    length(padre_name) between 1 and 40
    and length(madre_name) between 1 and 40
    and length(padre_alias) <= 60
    and length(madre_alias) <= 60
    and public.children_ok(children)
  );
