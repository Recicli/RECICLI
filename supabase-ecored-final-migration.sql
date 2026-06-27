-- ============================================================
-- EcoRed - migracion final incremental
-- Ejecutar despues de supabase-setup-complete.sql.
-- Completa imagenes, campos de publicacion, recojos, afiliaciones
-- y auditoria minima para admin.
-- ============================================================

-- 1. Storage publico para imagenes de publicaciones
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ecored-media',
  'ecored-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ecored_media_select_public on storage.objects;
create policy ecored_media_select_public on storage.objects
for select using (bucket_id = 'ecored-media');

drop policy if exists ecored_media_insert_authenticated on storage.objects;
create policy ecored_media_insert_authenticated on storage.objects
for insert to authenticated
with check (bucket_id = 'ecored-media' and auth.uid()::text = (storage.foldername(name))[2]);

drop policy if exists ecored_media_update_owner on storage.objects;
create policy ecored_media_update_owner on storage.objects
for update to authenticated
using (bucket_id = 'ecored-media' and auth.uid()::text = (storage.foldername(name))[2])
with check (bucket_id = 'ecored-media' and auth.uid()::text = (storage.foldername(name))[2]);

-- 2. Campos faltantes en publicaciones
alter table public.productos add column if not exists zona varchar(120);
alter table public.productos add column if not exists estado_producto varchar(80);
alter table public.productos add column if not exists peso_kg numeric(10,2);
alter table public.productos add column if not exists metodo_entrega varchar(80);
alter table public.productos add column if not exists metodo_pago varchar(80);
alter table public.productos add column if not exists detector_json jsonb;
alter table public.productos add column if not exists updated_at timestamp with time zone default now();

alter table public.publicaciones_reciclaje add column if not exists zona varchar(120);
alter table public.publicaciones_reciclaje add column if not exists disponibilidad_recojo varchar(80);
alter table public.publicaciones_reciclaje add column if not exists imagen text;
alter table public.publicaciones_reciclaje add column if not exists detector_json jsonb;
alter table public.publicaciones_reciclaje add column if not exists precio_estimado_min numeric(10,2);
alter table public.publicaciones_reciclaje add column if not exists precio_estimado_max numeric(10,2);
alter table public.publicaciones_reciclaje add column if not exists updated_at timestamp with time zone default now();

create index if not exists idx_productos_categoria on public.productos(categoria);
create index if not exists idx_productos_ciudad on public.productos(ciudad);
create index if not exists idx_reciclaje_ciudad on public.publicaciones_reciclaje(ciudad);
create index if not exists idx_reciclaje_material on public.publicaciones_reciclaje(material);

-- 3. Afiliaciones y solicitudes de recojo
create table if not exists public.afiliaciones_reciclaje (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete cascade,
  rol_afiliacion varchar(30) not null default 'usuario'
    check (rol_afiliacion in ('usuario','reciclador')),
  estado varchar(20) not null default 'pendiente'
    check (estado in ('pendiente','aprobada','rechazada','inactiva')),
  mensaje text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now(),
  unique (empresa_id, usuario_id, rol_afiliacion)
);

create table if not exists public.solicitudes_recojo (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  publicacion_reciclaje_id uuid references public.publicaciones_reciclaje(id) on delete set null,
  direccion text not null,
  referencia text,
  ciudad varchar(100),
  zona varchar(120),
  dia date,
  hora time,
  material varchar(100),
  kg numeric(10,2),
  estado varchar(20) not null default 'pendiente'
    check (estado in ('pendiente','programada','recogida','cancelada')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_afiliaciones_empresa on public.afiliaciones_reciclaje(empresa_id);
create index if not exists idx_afiliaciones_usuario on public.afiliaciones_reciclaje(usuario_id);
create index if not exists idx_recojo_usuario on public.solicitudes_recojo(usuario_id);
create index if not exists idx_recojo_empresa on public.solicitudes_recojo(empresa_id);
create index if not exists idx_recojo_estado on public.solicitudes_recojo(estado);

-- 4. Interacciones sociales y auditoria admin
create table if not exists public.producto_interacciones (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  usuario_id uuid references public.profiles(id) on delete cascade,
  tipo varchar(20) not null check (tipo in ('like','consulta','guardar')),
  mensaje text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.admin_auditoria (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  accion varchar(80) not null,
  tabla varchar(80),
  objeto_id uuid,
  detalle jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_producto_interacciones_producto on public.producto_interacciones(producto_id);
create index if not exists idx_producto_interacciones_usuario on public.producto_interacciones(usuario_id);
create index if not exists idx_admin_auditoria_admin on public.admin_auditoria(admin_id);

-- 5. Grants y RLS
grant select, insert, update on public.afiliaciones_reciclaje to authenticated;
grant select, insert, update on public.solicitudes_recojo to authenticated;
grant select, insert on public.producto_interacciones to authenticated;
grant select, insert on public.admin_auditoria to authenticated;

alter table public.afiliaciones_reciclaje enable row level security;
alter table public.solicitudes_recojo enable row level security;
alter table public.producto_interacciones enable row level security;
alter table public.admin_auditoria enable row level security;

drop policy if exists afiliaciones_select_related on public.afiliaciones_reciclaje;
create policy afiliaciones_select_related on public.afiliaciones_reciclaje
for select using (
  auth.uid() = usuario_id
  or public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
);

drop policy if exists afiliaciones_insert_own on public.afiliaciones_reciclaje;
create policy afiliaciones_insert_own on public.afiliaciones_reciclaje
for insert with check (auth.uid() = usuario_id or public.is_admin());

drop policy if exists afiliaciones_update_company_or_admin on public.afiliaciones_reciclaje;
create policy afiliaciones_update_company_or_admin on public.afiliaciones_reciclaje
for update using (
  public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
);

drop policy if exists recojo_select_related on public.solicitudes_recojo;
create policy recojo_select_related on public.solicitudes_recojo
for select using (
  auth.uid() = usuario_id
  or public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
);

drop policy if exists recojo_insert_own on public.solicitudes_recojo;
create policy recojo_insert_own on public.solicitudes_recojo
for insert with check (auth.uid() = usuario_id);

drop policy if exists recojo_update_related on public.solicitudes_recojo;
create policy recojo_update_related on public.solicitudes_recojo
for update using (
  auth.uid() = usuario_id
  or public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
)
with check (
  auth.uid() = usuario_id
  or public.is_admin()
  or exists (select 1 from public.empresas e where e.id = empresa_id and e.usuario_id = auth.uid())
);

drop policy if exists producto_interacciones_select_public on public.producto_interacciones;
create policy producto_interacciones_select_public on public.producto_interacciones
for select using (true);

drop policy if exists producto_interacciones_insert_auth on public.producto_interacciones;
create policy producto_interacciones_insert_auth on public.producto_interacciones
for insert with check (auth.uid() = usuario_id);

drop policy if exists auditoria_admin_only on public.admin_auditoria;
create policy auditoria_admin_only on public.admin_auditoria
for all using (public.is_admin())
with check (public.is_admin());

-- 6. Admin oficial
update public.profiles
set rol = 'usuario'
where rol in ('admin','superadmin')
  and email <> 'ewarcitocrucito@gmail.com';

update public.profiles
set rol = 'admin', estado = 'activo'
where email = 'ewarcitocrucito@gmail.com';

-- ============================================================
-- FIN
-- ============================================================
