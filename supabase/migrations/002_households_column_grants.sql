-- Desde la app solo se pueden editar nombres, alias e hijos de la familia.
-- (Revocar columnas sueltas no alcanza si existe el permiso UPDATE sobre toda la tabla.)
revoke update on public.households from authenticated, anon;
grant update (padre_name, padre_alias, madre_name, madre_alias, children) on public.households to authenticated;
