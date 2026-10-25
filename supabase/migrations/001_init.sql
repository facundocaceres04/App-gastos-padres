-- Cuentas Claras: familias compartidas entre dos progenitores.
-- Cada usuario pertenece a una sola familia; se une con un código de invitación.

create extension if not exists pgcrypto;

-- ─── Tablas ──────────────────────────────────────────────────────────────────

create table if not exists public.households (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text not null unique,
  padre_name   text not null default 'Padre',
  padre_alias  text not null default '',
  madre_name   text not null default 'Madre',
  madre_alias  text not null default '',
  children     text[] not null default '{}',
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  role         text not null check (role in ('padre', 'madre')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (household_id, role)
);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  concept      text not null check (length(trim(concept)) > 0),
  amount       numeric(14, 2) not null check (amount > 0),
  paid_by      text not null check (paid_by in ('padre', 'madre')),
  child        text not null default '',
  category     text not null default 'varios',
  date         date not null,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_household_date_idx on public.expenses (household_id, date desc);

create table if not exists public.month_configs (
  household_id uuid not null references public.households (id) on delete cascade,
  month_key    text not null check (month_key ~ '^\d{4}-\d{2}$'),
  father_pct   int  not null default 50 check (father_pct between 0 and 100),
  settled      boolean not null default false,
  settled_at   date,
  primary key (household_id, month_key)
);

-- ─── Seguridad por filas ─────────────────────────────────────────────────────

create or replace function public.is_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.expenses          enable row level security;
alter table public.month_configs     enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated using (public.is_member(id));
drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
  for select to authenticated using (public.is_member(household_id));

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists month_configs_all on public.month_configs;
create policy month_configs_all on public.month_configs
  for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

-- El código de invitación no se puede cambiar desde el cliente.
revoke update (invite_code, created_by) on public.households from authenticated;

-- ─── Funciones: crear familia y unirse con código ───────────────────────────

create or replace function public.create_household(
  p_role text, p_my_name text, p_other_name text, p_children text[]
)
returns public.households
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
  v_row  public.households;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if p_role not in ('padre', 'madre') then raise exception 'Rol inválido'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Ya pertenecés a una familia';
  end if;

  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from households where invite_code = v_code);
  end loop;

  insert into households (invite_code, padre_name, madre_name, children, created_by)
  values (
    v_code,
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

create or replace function public.join_household(p_code text)
returns public.households
language plpgsql security definer set search_path = public
as $$
declare
  v_row  public.households;
  v_role text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into v_row from households where invite_code = upper(trim(p_code));
  if not found then raise exception 'Código inválido'; end if;

  if exists (select 1 from household_members where user_id = auth.uid() and household_id = v_row.id) then
    return v_row;
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'Ya pertenecés a otra familia';
  end if;

  select r into v_role from unnest(array['padre', 'madre']) as r
  where r not in (select role from household_members where household_id = v_row.id)
  limit 1;
  if v_role is null then raise exception 'Esta familia ya tiene a los dos integrantes'; end if;

  insert into household_members (household_id, user_id, role) values (v_row.id, auth.uid(), v_role);
  return v_row;
end;
$$;

revoke execute on function public.create_household(text, text, text, text[]) from public, anon;
revoke execute on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text, text, text, text[]) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ─── Tiempo real ─────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['households', 'household_members', 'expenses', 'month_configs'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
