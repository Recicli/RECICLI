-- ============================================================
-- EcoRed - Tabla de puntuaciones del juego
-- Ejecutar en Supabase SQL Editor después del setup principal
-- ============================================================

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  score integer not null default 0,
  level_reached integer not null default 1,
  created_at timestamptz default now()
);

-- Indices para consultas rápidas
create index if not exists idx_game_scores_score on public.game_scores(score desc);
create index if not exists idx_game_scores_user on public.game_scores(user_id);

-- Permisos para PostgREST
grant select on public.game_scores to anon, authenticated;
grant insert, update on public.game_scores to authenticated;

-- RLS: cualquier usuario autenticado puede insertar su propio score
alter table public.game_scores enable row level security;

drop policy if exists "Usuarios insertan su propio score" on public.game_scores;
create policy "Usuarios insertan su propio score"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

drop policy if exists "Cualquiera puede leer scores" on public.game_scores;
create policy "Cualquiera puede leer scores"
  on public.game_scores for select
  using (true);

-- Vista de ranking top 10
create or replace view public.game_ranking as
select
  gs.score,
  gs.level_reached,
  gs.created_at,
  p.nombre,
  p.apellido
from public.game_scores gs
left join public.profiles p on gs.user_id = p.id
order by gs.score desc
limit 10;
