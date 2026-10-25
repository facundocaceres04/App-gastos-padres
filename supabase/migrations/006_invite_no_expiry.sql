-- El código de invitación ya no vence (pedido de uso: es más simple compartirlo una vez).
-- Sigue protegido por el límite de intentos fallidos, deja de servir cuando la familia está
-- completa y se puede renovar a mano ("Generar código nuevo") o se renueva solo al quitar/salir.

create or replace function public.join_household(p_code text)
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

  if found then
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
     set invite_code = public.new_invite_code()
   where id = v_hid
  returning * into v_row;
  return v_row;
end;
$$;

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
     set invite_code = public.new_invite_code()
   where id = v_m.household_id;
end;
$$;

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
     set invite_code = public.new_invite_code()
   where id = v_m.household_id;
end;
$$;

alter table public.households drop column if exists invite_expires_at;
