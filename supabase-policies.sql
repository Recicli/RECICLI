-- EcoRed policies for frontend access with Supabase publishable/anon key.
-- Run this in Supabase SQL Editor after reviewing for your security model.

alter table profiles enable row level security;
alter table empresas enable row level security;
alter table publicaciones_reciclaje enable row level security;
alter table productos enable row level security;
alter table campanas enable row level security;
alter table participaciones enable row level security;
alter table eventos enable row level security;
alter table comunidad enable row level security;
alter table comentarios enable row level security;
alter table reportes enable row level security;
alter table medallas enable row level security;
alter table usuario_medallas enable row level security;

drop policy if exists "profiles_select_public" on profiles;
create policy "profiles_select_public" on profiles
for select using (estado = 'activo');

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "empresas_select_public" on empresas;
create policy "empresas_select_public" on empresas
for select using (true);

drop policy if exists "empresas_insert_own" on empresas;
create policy "empresas_insert_own" on empresas
for insert with check (auth.uid() = usuario_id);

drop policy if exists "productos_select_active" on productos;
create policy "productos_select_active" on productos
for select using (estado = 'activo');

drop policy if exists "productos_insert_own" on productos;
create policy "productos_insert_own" on productos
for insert with check (auth.uid() = usuario_id);

drop policy if exists "productos_update_own" on productos;
create policy "productos_update_own" on productos
for update using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "reciclaje_select_public" on publicaciones_reciclaje;
create policy "reciclaje_select_public" on publicaciones_reciclaje
for select using (true);

drop policy if exists "reciclaje_insert_own" on publicaciones_reciclaje;
create policy "reciclaje_insert_own" on publicaciones_reciclaje
for insert with check (auth.uid() = usuario_id);

drop policy if exists "campanas_select_active" on campanas;
create policy "campanas_select_active" on campanas
for select using (estado = 'activa');

drop policy if exists "participaciones_select_own" on participaciones;
create policy "participaciones_select_own" on participaciones
for select using (auth.uid() = usuario_id);

drop policy if exists "participaciones_insert_own" on participaciones;
create policy "participaciones_insert_own" on participaciones
for insert with check (auth.uid() = usuario_id);

drop policy if exists "eventos_select_active" on eventos;
create policy "eventos_select_active" on eventos
for select using (estado = 'activo');

drop policy if exists "eventos_insert_own" on eventos;
create policy "eventos_insert_own" on eventos
for insert with check (auth.uid() = organizador_id);

drop policy if exists "comunidad_select_public" on comunidad;
create policy "comunidad_select_public" on comunidad
for select using (true);

drop policy if exists "comunidad_insert_own" on comunidad;
create policy "comunidad_insert_own" on comunidad
for insert with check (auth.uid() = usuario_id);

drop policy if exists "comunidad_update_likes_public" on comunidad;
create policy "comunidad_update_likes_public" on comunidad
for update using (true) with check (true);

drop policy if exists "comentarios_select_public" on comentarios;
create policy "comentarios_select_public" on comentarios
for select using (true);

drop policy if exists "comentarios_insert_own" on comentarios;
create policy "comentarios_insert_own" on comentarios
for insert with check (auth.uid() = usuario_id);

drop policy if exists "reportes_insert_own" on reportes;
create policy "reportes_insert_own" on reportes
for insert with check (auth.uid() = usuario_id);

drop policy if exists "reportes_select_own_or_admin" on reportes;
create policy "reportes_select_own_or_admin" on reportes
for select using (
  auth.uid() = usuario_id
  or exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.rol in ('admin', 'superadmin')
  )
);

drop policy if exists "medallas_select_public" on medallas;
create policy "medallas_select_public" on medallas
for select using (true);

drop policy if exists "usuario_medallas_select_public" on usuario_medallas;
create policy "usuario_medallas_select_public" on usuario_medallas
for select using (true);

-- Optional backfill: creates missing profile rows for users that already exist in Auth.
insert into profiles (id, nombre, apellido, email, rol, ciudad, telefono, descripcion)
select
  users.id,
  coalesce(nullif(split_part(coalesce(users.raw_user_meta_data->>'nombre', ''), ' ', 1), ''), 'Usuario') as nombre,
  coalesce(nullif(users.raw_user_meta_data->>'apellido', ''), 'EcoRed') as apellido,
  users.email,
  case
    when users.raw_user_meta_data->>'rol' in ('usuario','empresa','reciclador','municipalidad','universidad','ong','admin','superadmin')
      then users.raw_user_meta_data->>'rol'
    when users.raw_user_meta_data->>'rol' in ('empresa_recicla','empresa_reutiliza')
      then 'empresa'
    else 'usuario'
  end as rol,
  coalesce(users.raw_user_meta_data->>'ciudad', 'Huanuco') as ciudad,
  coalesce(users.raw_user_meta_data->>'celular', '') as telefono,
  'Miembro de EcoRed' as descripcion
from auth.users as users
where not exists (
  select 1 from profiles where profiles.id = users.id
);
