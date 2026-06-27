-- ============================================================
-- EcoRed - Supabase setup completo
-- Ejecutar en Supabase SQL Editor.
-- Incluye: extensiones, tablas, relaciones, indices, triggers,
-- backfill de perfiles, grants y RLS policies para frontend.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. TABLAS
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre varchar(100) not null default 'Usuario',
  apellido varchar(100) not null default 'EcoRed',
  email varchar(150) unique not null,
  telefono varchar(20),
  ciudad varchar(100),
  foto text,
  descripcion text,
  rol varchar(30) not null default 'usuario'
    check (rol in ('usuario','empresa','reciclador','municipalidad','universidad','ong','admin','superadmin')),
  eco_score integer not null default 0,
  hojas integer not null default 0 check (hojas between 0 and 5),
  estado varchar(20) not null default 'activo'
    check (estado in ('activo','suspendido','eliminado')),
  ultimo_login timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  nombre_empresa varchar(150) not null,
  ruc varchar(11),
  tipo varchar(30) check (tipo in ('recicladora','comercial')),
  modulo varchar(20) check (modulo in ('recicla','reutiliza')),
  descripcion text,
  estado_verificacion varchar(20) not null default 'pendiente'
    check (estado_verificacion in ('pendiente','aprobada','rechazada')),
  motivo_rechazo text,
  verificada boolean not null default false,
  verificado_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.publicaciones_reciclaje (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  material varchar(100) not null,
  cantidad numeric(10,2) not null,
  unidad varchar(20) not null default 'kg',
  descripcion text,
  ciudad varchar(100),
  estado varchar(20) not null default 'disponible'
    check (estado in ('disponible','reservado','recogido')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  titulo varchar(200) not null,
  categoria varchar(100),
  descripcion text,
  precio numeric(10,2),
  imagen text,
  ciudad varchar(100),
  destacado boolean not null default false,
  estado varchar(20) not null default 'activo'
    check (estado in ('activo','vendido')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.campanas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  titulo varchar(200) not null,
  material varchar(100),
  meta_kg numeric(10,2),
  pago_kg numeric(10,2),
  ciudad varchar(100),
  fecha date,
  estado varchar(20) not null default 'activa'
    check (estado in ('activa','finalizada')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.participaciones (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  kilos numeric(10,2),
  estado varchar(20) not null default 'pendiente',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid references public.profiles(id) on delete set null,
  titulo varchar(200) not null,
  descripcion text,
  ciudad varchar(100),
  fecha date,
  estado varchar(20) not null default 'activo'
    check (estado in ('activo','finalizado','cancelado')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.comunidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  contenido text not null,
  imagen text,
  likes integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.comunidad(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  comentario text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.medallas (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(100) not null,
  descripcion text,
  icono text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.usuario_medallas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  medalla_id uuid not null references public.medallas(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  unique (usuario_id, medalla_id)
);

create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete set null,
  tipo varchar(50),
  objeto_id uuid,
  motivo text,
  estado varchar(20) not null default 'pendiente'
    check (estado in ('pendiente','revisado','resuelto','rechazado')),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  nombre varchar(150) not null,
  correo varchar(180) not null,
  celular varchar(30),
  tipo_consulta varchar(80),
  mensaje text not null,
  estado varchar(20) not null default 'pendiente'
    check (estado in ('pendiente','revisado','resuelto')),
  created_at timestamp with time zone not null default now()
);

-- ============================================================
-- 3. ALTERACIONES SEGURAS POR SI LAS TABLAS YA EXISTIAN
-- ============================================================

alter table public.campanas add column if not exists created_at timestamp with time zone not null default now();
alter table public.participaciones add column if not exists created_at timestamp with time zone not null default now();
alter table public.eventos add column if not exists created_at timestamp with time zone not null default now();
alter table public.medallas add column if not exists created_at timestamp with time zone not null default now();
alter table public.usuario_medallas add column if not exists created_at timestamp with time zone not null default now();
alter table public.reportes add column if not exists created_at timestamp with time zone not null default now();
alter table public.empresas add column if not exists descripcion text;
alter table public.empresas add column if not exists estado_verificacion varchar(20) not null default 'pendiente';
alter table public.empresas add column if not exists motivo_rechazo text;
alter table public.empresas add column if not exists verificado_at timestamp with time zone;

do $$
begin
  alter table public.empresas drop constraint if exists empresas_ruc_key;
  if not exists (
    select 1 from pg_constraint
    where conname = 'empresas_estado_verificacion_check'
      and conrelid = 'public.empresas'::regclass
  ) then
    alter table public.empresas
      add constraint empresas_estado_verificacion_check
      check (estado_verificacion in ('pendiente','aprobada','rechazada'));
  end if;
end $$;

-- ============================================================
-- 4. INDICES
-- ============================================================

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_rol on public.profiles(rol);
create index if not exists idx_empresas_usuario on public.empresas(usuario_id);
create index if not exists idx_empresas_modulo on public.empresas(modulo);
create unique index if not exists idx_empresas_ruc_modulo_unique on public.empresas(ruc, modulo) where ruc is not null;
create index if not exists idx_productos_usuario on public.productos(usuario_id);
create index if not exists idx_productos_estado on public.productos(estado);
create index if not exists idx_productos_destacado on public.productos(destacado);
create index if not exists idx_reciclaje_usuario on public.publicaciones_reciclaje(usuario_id);
create index if not exists idx_reciclaje_estado on public.publicaciones_reciclaje(estado);
create index if not exists idx_campanas_estado on public.campanas(estado);
create index if not exists idx_eventos_estado on public.eventos(estado);
create index if not exists idx_comunidad_created on public.comunidad(created_at desc);
create index if not exists idx_comentarios_publicacion on public.comentarios(publicacion_id);
create index if not exists idx_reportes_estado on public.reportes(estado);
create index if not exists idx_contact_messages_estado on public.contact_messages(estado);
create index if not exists idx_contact_messages_created on public.contact_messages(created_at desc);

-- ============================================================
-- 5. FUNCIONES AUXILIARES
-- ============================================================

create or replace function public.normalize_ecored_role(raw_role text)
returns text
language sql
stable
as $$
  select case
    when raw_role in ('usuario','empresa','reciclador','municipalidad','universidad','ong') then raw_role
    when raw_role in ('empresa_recicla','empresa_reutiliza') then 'empresa'
    else 'usuario'
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and rol in ('admin','superadmin')
      and estado = 'activo'
  );
$$;

create or replace function public.prevent_company_self_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and (
    old.verificada is distinct from new.verificada
    or old.estado_verificacion is distinct from new.estado_verificacion
    or old.motivo_rechazo is distinct from new.motivo_rechazo
    or old.verificado_at is distinct from new.verificado_at
  ) then
    raise exception 'Solo un administrador puede cambiar la verificacion de empresas.';
  end if;

  return new;
end;
$$;

drop trigger if exists empresas_prevent_self_verification on public.empresas;
create trigger empresas_prevent_self_verification
before update on public.empresas
for each row execute function public.prevent_company_self_verification();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  full_name text;
  first_name text;
  last_name text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name := nullif(trim(coalesce(meta->>'nombre', '')), '');
  first_name := coalesce(nullif(meta->>'first_name', ''), split_part(coalesce(full_name, ''), ' ', 1), 'Usuario');
  last_name := coalesce(nullif(meta->>'apellido', ''), nullif(meta->>'last_name', ''), 'EcoRed');

  insert into public.profiles (
    id,
    nombre,
    apellido,
    email,
    telefono,
    ciudad,
    descripcion,
    rol,
    ultimo_login
  )
  values (
    new.id,
    coalesce(nullif(first_name, ''), 'Usuario'),
    coalesce(nullif(last_name, ''), 'EcoRed'),
    new.email,
    coalesce(meta->>'celular', meta->>'telefono', ''),
    coalesce(meta->>'ciudad', 'Huanuco'),
    'Miembro de EcoRed',
    public.normalize_ecored_role(meta->>'rol'),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    ultimo_login = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ecored on auth.users;
create trigger on_auth_user_created_ecored
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
-- 6. BACKFILL DE PERFILES YA EXISTENTES EN AUTH
-- ============================================================

insert into public.profiles (id, nombre, apellido, email, telefono, ciudad, descripcion, rol)
select
  users.id,
  coalesce(nullif(split_part(coalesce(users.raw_user_meta_data->>'nombre', ''), ' ', 1), ''), 'Usuario') as nombre,
  coalesce(nullif(users.raw_user_meta_data->>'apellido', ''), 'EcoRed') as apellido,
  users.email,
  coalesce(users.raw_user_meta_data->>'celular', users.raw_user_meta_data->>'telefono', '') as telefono,
  coalesce(users.raw_user_meta_data->>'ciudad', 'Huanuco') as ciudad,
  'Miembro de EcoRed' as descripcion,
  public.normalize_ecored_role(users.raw_user_meta_data->>'rol') as rol
from auth.users as users
where not exists (
  select 1 from public.profiles where profiles.id = users.id
);

-- ============================================================
-- 7. GRANTS PARA POSTGREST
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.empresas to anon, authenticated;
grant insert, update on public.empresas to authenticated;

grant select on public.publicaciones_reciclaje to anon, authenticated;
grant insert, update on public.publicaciones_reciclaje to authenticated;

grant select on public.productos to anon, authenticated;
grant insert, update on public.productos to authenticated;

grant select on public.campanas to anon, authenticated;
grant insert, update on public.campanas to authenticated;

grant select on public.participaciones to authenticated;
grant insert, update on public.participaciones to authenticated;

grant select on public.eventos to anon, authenticated;
grant insert, update on public.eventos to authenticated;

grant select on public.comunidad to anon, authenticated;
grant insert, update on public.comunidad to authenticated;

grant select on public.comentarios to anon, authenticated;
grant insert, update on public.comentarios to authenticated;

grant select on public.medallas to anon, authenticated;
grant select, insert on public.usuario_medallas to authenticated;

grant select, insert, update on public.reportes to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;

grant execute on function public.normalize_ecored_role(text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- 8. RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.empresas enable row level security;
alter table public.publicaciones_reciclaje enable row level security;
alter table public.productos enable row level security;
alter table public.campanas enable row level security;
alter table public.participaciones enable row level security;
alter table public.eventos enable row level security;
alter table public.comunidad enable row level security;
alter table public.comentarios enable row level security;
alter table public.medallas enable row level security;
alter table public.usuario_medallas enable row level security;
alter table public.reportes enable row level security;
alter table public.contact_messages enable row level security;

-- ============================================================
-- 9. POLICIES: PROFILES
-- ============================================================

drop policy if exists profiles_select_public_active on public.profiles;
create policy profiles_select_public_active on public.profiles
for select using (estado = 'activo' or auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id and rol not in ('admin','superadmin'));

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update using (auth.uid() = id or public.is_admin())
with check (
  public.is_admin()
  or (auth.uid() = id and rol not in ('admin','superadmin'))
);

-- ============================================================
-- 10. POLICIES: EMPRESAS
-- ============================================================

drop policy if exists empresas_select_public on public.empresas;
create policy empresas_select_public on public.empresas
for select using (true);

drop policy if exists empresas_insert_own on public.empresas;
create policy empresas_insert_own on public.empresas
for insert with check (auth.uid() = usuario_id);

drop policy if exists empresas_update_own_or_admin on public.empresas;
create policy empresas_update_own_or_admin on public.empresas
for update using (auth.uid() = usuario_id or public.is_admin())
with check (auth.uid() = usuario_id or public.is_admin());

-- ============================================================
-- 11. POLICIES: RECICLAJE
-- ============================================================

drop policy if exists reciclaje_select_public on public.publicaciones_reciclaje;
create policy reciclaje_select_public on public.publicaciones_reciclaje
for select using (true);

drop policy if exists reciclaje_insert_own on public.publicaciones_reciclaje;
create policy reciclaje_insert_own on public.publicaciones_reciclaje
for insert with check (auth.uid() = usuario_id);

drop policy if exists reciclaje_update_own_or_admin on public.publicaciones_reciclaje;
create policy reciclaje_update_own_or_admin on public.publicaciones_reciclaje
for update using (auth.uid() = usuario_id or public.is_admin())
with check (auth.uid() = usuario_id or public.is_admin());

-- ============================================================
-- 12. POLICIES: PRODUCTOS
-- ============================================================

drop policy if exists productos_select_active on public.productos;
create policy productos_select_active on public.productos
for select using (estado = 'activo' or auth.uid() = usuario_id or public.is_admin());

drop policy if exists productos_insert_own on public.productos;
create policy productos_insert_own on public.productos
for insert with check (auth.uid() = usuario_id);

drop policy if exists productos_update_own_or_admin on public.productos;
create policy productos_update_own_or_admin on public.productos
for update using (auth.uid() = usuario_id or public.is_admin())
with check (auth.uid() = usuario_id or public.is_admin());

-- ============================================================
-- 13. POLICIES: CAMPANAS Y PARTICIPACIONES
-- ============================================================

drop policy if exists campanas_select_active on public.campanas;
create policy campanas_select_active on public.campanas
for select using (estado = 'activa' or public.is_admin());

drop policy if exists campanas_insert_empresa_or_admin on public.campanas;
create policy campanas_insert_empresa_or_admin on public.campanas
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.empresas
    where empresas.id = empresa_id
      and empresas.usuario_id = auth.uid()
  )
);

drop policy if exists campanas_update_empresa_or_admin on public.campanas;
create policy campanas_update_empresa_or_admin on public.campanas
for update using (
  public.is_admin()
  or exists (
    select 1 from public.empresas
    where empresas.id = empresa_id
      and empresas.usuario_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.empresas
    where empresas.id = empresa_id
      and empresas.usuario_id = auth.uid()
  )
);

drop policy if exists participaciones_select_own_or_admin on public.participaciones;
create policy participaciones_select_own_or_admin on public.participaciones
for select using (auth.uid() = usuario_id or public.is_admin());

drop policy if exists participaciones_insert_own on public.participaciones;
create policy participaciones_insert_own on public.participaciones
for insert with check (auth.uid() = usuario_id);

drop policy if exists participaciones_update_own_or_admin on public.participaciones;
create policy participaciones_update_own_or_admin on public.participaciones
for update using (auth.uid() = usuario_id or public.is_admin())
with check (auth.uid() = usuario_id or public.is_admin());

-- ============================================================
-- 14. POLICIES: EVENTOS
-- ============================================================

drop policy if exists eventos_select_active on public.eventos;
create policy eventos_select_active on public.eventos
for select using (estado = 'activo' or public.is_admin());

drop policy if exists eventos_insert_own on public.eventos;
create policy eventos_insert_own on public.eventos
for insert with check (auth.uid() = organizador_id);

drop policy if exists eventos_update_own_or_admin on public.eventos;
create policy eventos_update_own_or_admin on public.eventos
for update using (auth.uid() = organizador_id or public.is_admin())
with check (auth.uid() = organizador_id or public.is_admin());

-- ============================================================
-- 15. POLICIES: COMUNIDAD Y COMENTARIOS
-- ============================================================

drop policy if exists comunidad_select_public on public.comunidad;
create policy comunidad_select_public on public.comunidad
for select using (true);

drop policy if exists comunidad_insert_own on public.comunidad;
create policy comunidad_insert_own on public.comunidad
for insert with check (auth.uid() = usuario_id);

drop policy if exists comunidad_update_own_or_public_likes on public.comunidad;
create policy comunidad_update_own_or_public_likes on public.comunidad
for update using (auth.uid() = usuario_id or auth.role() = 'authenticated' or public.is_admin())
with check (auth.uid() = usuario_id or auth.role() = 'authenticated' or public.is_admin());

drop policy if exists comentarios_select_public on public.comentarios;
create policy comentarios_select_public on public.comentarios
for select using (true);

drop policy if exists comentarios_insert_own on public.comentarios;
create policy comentarios_insert_own on public.comentarios
for insert with check (auth.uid() = usuario_id);

drop policy if exists comentarios_update_own_or_admin on public.comentarios;
create policy comentarios_update_own_or_admin on public.comentarios
for update using (auth.uid() = usuario_id or public.is_admin())
with check (auth.uid() = usuario_id or public.is_admin());

-- ============================================================
-- 16. POLICIES: MEDALLAS
-- ============================================================

drop policy if exists medallas_select_public on public.medallas;
create policy medallas_select_public on public.medallas
for select using (true);

drop policy if exists medallas_admin_manage on public.medallas;
create policy medallas_admin_manage on public.medallas
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists usuario_medallas_select_public on public.usuario_medallas;
create policy usuario_medallas_select_public on public.usuario_medallas
for select using (true);

drop policy if exists usuario_medallas_admin_insert on public.usuario_medallas;
create policy usuario_medallas_admin_insert on public.usuario_medallas
for insert with check (public.is_admin());

-- ============================================================
-- 17. POLICIES: REPORTES
-- ============================================================

drop policy if exists reportes_insert_own on public.reportes;
create policy reportes_insert_own on public.reportes
for insert with check (auth.uid() = usuario_id);

drop policy if exists reportes_select_own_or_admin on public.reportes;
create policy reportes_select_own_or_admin on public.reportes
for select using (auth.uid() = usuario_id or public.is_admin());

drop policy if exists reportes_update_admin on public.reportes;
create policy reportes_update_admin on public.reportes
for update using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- 18. POLICIES: MENSAJES DE CONTACTO
-- ============================================================

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
for insert with check (true);

drop policy if exists contact_messages_select_admin on public.contact_messages;
create policy contact_messages_select_admin on public.contact_messages
for select using (public.is_admin());

drop policy if exists contact_messages_update_admin on public.contact_messages;
create policy contact_messages_update_admin on public.contact_messages
for update using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- 19. DATOS BASE NO DEMO: MEDALLAS DEL SISTEMA
-- ============================================================

insert into public.medallas (nombre, descripcion, icono)
values
  ('Guardian del carton', 'Reconoce aportes constantes de papel y carton.', 'leaf'),
  ('Vecino circular', 'Reconoce participacion en comunidad y eventos.', 'community'),
  ('Aliado verificado', 'Reconoce entidades verificadas por EcoRed.', 'verified')
on conflict do nothing;

-- ============================================================
-- 20. ADMIN PRINCIPAL
-- ============================================================

-- Crea primero este usuario en Supabase Auth con la contrasena 123456.
-- Luego reemplaza el correo de ejemplo y ejecuta este bloque para convertirlo
-- en el unico administrador operativo desde el frontend.
--
-- update public.profiles
-- set rol = 'admin', estado = 'activo'
-- where email = 'REEMPLAZAR_CORREO_ADMIN@ecored.pe';
--
-- Opcional: si quieres impedir que otros perfiles queden como admin:
-- update public.profiles
-- set rol = 'usuario'
-- where rol in ('admin','superadmin')
--   and email <> 'REEMPLAZAR_CORREO_ADMIN@ecored.pe';

-- ============================================================
-- FIN
-- ============================================================
