-- ============================================================
-- Leaner — Datenbank
-- Einmal komplett in den SQL Editor von Supabase kopieren
-- und ausführen (SETUP.md, Schritt 3).
--
-- Kernidee: Jede Zeile gehört genau einem Nutzer, und die
-- Row-Level-Security-Regeln erlauben nur Zugriff auf die eigene
-- Zeile. Selbst wenn jemand den öffentlichen anon key nimmt und
-- direkt gegen die API geht, kommt er an keine fremden Daten.
-- ============================================================

-- ---------- Zustand der App ----------

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "eigene Zeile lesen"    on public.app_state;
drop policy if exists "eigene Zeile anlegen"  on public.app_state;
drop policy if exists "eigene Zeile ändern"   on public.app_state;
drop policy if exists "eigene Zeile löschen"  on public.app_state;

create policy "eigene Zeile lesen"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "eigene Zeile anlegen"
  on public.app_state for insert
  with check (auth.uid() = user_id);

create policy "eigene Zeile ändern"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "eigene Zeile löschen"
  on public.app_state for delete
  using (auth.uid() = user_id);


-- ---------- Chatverlauf des Coaches ----------
-- Getrennt vom Zustand, weil er anders wächst und irgendwann
-- aufgeräumt werden soll.

create table if not exists public.coach_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('me', 'ai')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_time
  on public.coach_messages (user_id, created_at desc);

alter table public.coach_messages enable row level security;

drop policy if exists "eigene Nachrichten lesen"   on public.coach_messages;
drop policy if exists "eigene Nachrichten anlegen" on public.coach_messages;
drop policy if exists "eigene Nachrichten löschen" on public.coach_messages;

create policy "eigene Nachrichten lesen"
  on public.coach_messages for select
  using (auth.uid() = user_id);

create policy "eigene Nachrichten anlegen"
  on public.coach_messages for insert
  with check (auth.uid() = user_id);

create policy "eigene Nachrichten löschen"
  on public.coach_messages for delete
  using (auth.uid() = user_id);


-- ---------- Nutzungsbremse für den Coach ----------
-- Schützt dich davor, dass ein Fehler in einer Schleife deine
-- API-Rechnung hochtreibt. Die Edge Function prüft das vor
-- jedem Aufruf.

create table if not exists public.coach_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  calls   int  not null default 0,
  primary key (user_id, day)
);

alter table public.coach_usage enable row level security;

drop policy if exists "eigene Nutzung lesen" on public.coach_usage;

create policy "eigene Nutzung lesen"
  on public.coach_usage for select
  using (auth.uid() = user_id);

-- Zählt einen Aufruf und meldet zurück, ob das Tageslimit erreicht ist.
-- security definer, damit die Funktion schreiben darf, ohne dass
-- Nutzer selbst in die Tabelle schreiben können.
create or replace function public.bump_coach_usage(p_limit int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls int;
begin
  insert into public.coach_usage (user_id, day, calls)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day)
    do update set calls = public.coach_usage.calls + 1
  returning calls into v_calls;

  return v_calls <= p_limit;
end;
$$;

revoke all on function public.bump_coach_usage(int) from public;
grant execute on function public.bump_coach_usage(int) to authenticated;
