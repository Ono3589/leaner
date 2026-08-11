-- ============================================================
-- Leaner — Erweiterung: Rezepte, eigene Zutaten, Produktcache
--
-- Einmal komplett in den SQL Editor von Supabase kopieren und
-- ausführen. Läuft auch problemlos ein zweites Mal.
--
-- Bis hierher lagen eigene Rezepte als JSON-Block in app_state.
-- Das funktioniert für einen Nutzer, lässt sich aber nicht
-- durchsuchen und wächst mit jedem Speichern als Ganzes.
-- Ab jetzt: richtige Zeilen.
-- ============================================================


-- ---------- Eigene Rezepte ----------

create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  hook        text default '',
  minutes     int  not null default 15,
  portions    int  not null default 1,
  items       jsonb not null default '[]'::jsonb,   -- [{ id, g }]
  steps       jsonb not null default '[]'::jsonb,   -- ["Schritt", …]
  -- Beim Speichern mitberechnet, damit Listen ohne Nachrechnen auskommen
  kcal        numeric,
  protein     numeric,
  grade       text check (grade is null or grade in ('A','B','C','D','E')),
  legacy_id   text,                                  -- alte id aus dem JSON-Block
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists recipes_user on public.recipes (user_id, updated_at desc);
create unique index if not exists recipes_legacy
  on public.recipes (user_id, legacy_id) where legacy_id is not null;

alter table public.recipes enable row level security;

drop policy if exists "eigene Rezepte lesen"   on public.recipes;
drop policy if exists "eigene Rezepte anlegen" on public.recipes;
drop policy if exists "eigene Rezepte ändern"  on public.recipes;
drop policy if exists "eigene Rezepte löschen" on public.recipes;

create policy "eigene Rezepte lesen"   on public.recipes for select using (auth.uid() = user_id);
create policy "eigene Rezepte anlegen" on public.recipes for insert with check (auth.uid() = user_id);
create policy "eigene Rezepte ändern"  on public.recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Rezepte löschen" on public.recipes for delete using (auth.uid() = user_id);


-- ---------- Eigene Zutaten ----------
-- Alles, was nicht in foods.js steht: selbst eingetragen oder aus
-- Open Food Facts übernommen. Werte pro 100 g, gleiche Felder wie
-- die mitgelieferte Datenbank.

create table if not exists public.custom_foods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text default 'Eigene',
  kcal        numeric not null default 0,
  protein     numeric not null default 0,
  carbs       numeric not null default 0,
  sugar       numeric not null default 0,
  fat         numeric not null default 0,
  sat_fat     numeric not null default 0,
  fibre       numeric not null default 0,
  salt        numeric not null default 0,
  fvl         numeric not null default 0,   -- Anteil Obst/Gemüse/Hülsenfrüchte/Nüsse in Prozent
  barcode     text,
  source      text default 'eigen',         -- 'eigen' | 'openfoodfacts'
  created_at  timestamptz not null default now()
);

create index if not exists custom_foods_user on public.custom_foods (user_id, name);
create unique index if not exists custom_foods_barcode
  on public.custom_foods (user_id, barcode) where barcode is not null;

alter table public.custom_foods enable row level security;

drop policy if exists "eigene Zutaten lesen"   on public.custom_foods;
drop policy if exists "eigene Zutaten anlegen" on public.custom_foods;
drop policy if exists "eigene Zutaten ändern"  on public.custom_foods;
drop policy if exists "eigene Zutaten löschen" on public.custom_foods;

create policy "eigene Zutaten lesen"   on public.custom_foods for select using (auth.uid() = user_id);
create policy "eigene Zutaten anlegen" on public.custom_foods for insert with check (auth.uid() = user_id);
create policy "eigene Zutaten ändern"  on public.custom_foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Zutaten löschen" on public.custom_foods for delete using (auth.uid() = user_id);


-- ---------- Zwischenspeicher für Open Food Facts ----------
-- Deren Ratelimit für Suchanfragen liegt bei zehn pro Minute.
-- Ohne Cache wäre das beim Tippen sofort erreicht.
-- Die Tabelle ist bewusst nicht nutzergebunden: Produktdaten sind
-- öffentlich, und ein geteilter Cache spart Anfragen.

create table if not exists public.off_cache (
  key        text primary key,        -- 'q:haferflocken' oder 'b:4000540001112'
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists off_cache_age on public.off_cache (fetched_at);

alter table public.off_cache enable row level security;
-- Kein Zugriff für Clients: Nur die Edge Function schreibt und liest,
-- und die läuft mit erhöhten Rechten.


-- ---------- Nutzungsbremse, allgemein ----------
-- Ersetzt die frühere Variante nur für den Coach.

create table if not exists public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null,
  day     date not null default current_date,
  calls   int  not null default 0,
  primary key (user_id, kind, day)
);

alter table public.api_usage enable row level security;

drop policy if exists "eigene Nutzung lesen" on public.api_usage;
create policy "eigene Nutzung lesen" on public.api_usage for select using (auth.uid() = user_id);

create or replace function public.bump_usage(p_kind text, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls int;
begin
  insert into public.api_usage (user_id, kind, day, calls)
  values (auth.uid(), p_kind, current_date, 1)
  on conflict (user_id, kind, day)
    do update set calls = public.api_usage.calls + 1
  returning calls into v_calls;

  return v_calls <= p_limit;
end;
$$;

revoke all on function public.bump_usage(text, int) from public;
grant execute on function public.bump_usage(text, int) to authenticated;


-- ---------- Aufräumen ----------
-- Alte Cache-Einträge nach 30 Tagen entfernen. Wer will, hängt das
-- unter Database → Cron an einen täglichen Job.

create or replace function public.clean_off_cache()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.off_cache where fetched_at < now() - interval '30 days';
$$;
