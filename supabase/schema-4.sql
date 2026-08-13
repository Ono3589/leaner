-- ============================================================
-- Leaner — Erweiterung: Erinnerungen
--
-- Einmal komplett in den SQL Editor kopieren und ausführen.
-- Läuft auch problemlos ein zweites Mal.
--
-- Vorher nötig: die VAPID-Schlüssel als Secrets hinterlegen
-- (SETUP.md, Schritt 10). Ohne sie schickt der Versand nichts.
-- ============================================================


-- ---------- Geräte, die Erinnerungen bekommen ----------
-- Ein Eintrag je Gerät. Wer die App auf iPhone und MacBook
-- installiert, hat zwei — beide sollen etwas bekommen.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  label      text,                       -- "iPhone", "MacBook"
  failures   int not null default 0,     -- ab 5 wird aufgeräumt
  created_at timestamptz not null default now()
);

create unique index if not exists push_subs_endpoint on public.push_subscriptions (endpoint);
create index if not exists push_subs_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "eigene Geräte lesen"   on public.push_subscriptions;
drop policy if exists "eigene Geräte anlegen" on public.push_subscriptions;
drop policy if exists "eigene Geräte löschen" on public.push_subscriptions;

create policy "eigene Geräte lesen"   on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "eigene Geräte anlegen" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "eigene Geräte löschen" on public.push_subscriptions for delete using (auth.uid() = user_id);


-- ---------- Was, wann und wie oft ----------
-- Als eigene Tabelle statt im Zustands-JSON, damit der
-- zeitgesteuerte Job sauber danach filtern kann.

create table if not exists public.notify_prefs (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  morning     boolean not null default true,
  morning_at  time    not null default '08:00',
  evening     boolean not null default true,
  evening_at  time    not null default '19:30',
  weekly      boolean not null default true,
  quiet_from  time    not null default '22:00',
  quiet_to    time    not null default '07:00',
  timezone    text    not null default 'Europe/Berlin',
  last_sent   timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.notify_prefs enable row level security;

drop policy if exists "eigene Einstellungen lesen"   on public.notify_prefs;
drop policy if exists "eigene Einstellungen anlegen" on public.notify_prefs;
drop policy if exists "eigene Einstellungen ändern"  on public.notify_prefs;

create policy "eigene Einstellungen lesen"   on public.notify_prefs for select using (auth.uid() = user_id);
create policy "eigene Einstellungen anlegen" on public.notify_prefs for insert with check (auth.uid() = user_id);
create policy "eigene Einstellungen ändern"  on public.notify_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------- Was schon verschickt wurde ----------
-- Verhindert Doppelungen, wenn ein Job zweimal anläuft, und
-- begrenzt die Menge pro Tag. Zwei Nachrichten am Tag sind die
-- Obergrenze — mehr wird ignoriert, egal was eingestellt ist.

create table if not exists public.notify_log (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null,                       -- morning | evening | weekly | test
  day       date not null default current_date,
  sent_at   timestamptz not null default now()
);

create unique index if not exists notify_log_once
  on public.notify_log (user_id, kind, day) where kind <> 'test';
create index if not exists notify_log_user on public.notify_log (user_id, sent_at desc);

alter table public.notify_log enable row level security;

drop policy if exists "eigenes Protokoll lesen" on public.notify_log;
create policy "eigenes Protokoll lesen" on public.notify_log for select using (auth.uid() = user_id);


-- ---------- Aufräumen ----------

create or replace function public.clean_notify_log()
returns void language sql security definer set search_path = public as $$
  delete from public.notify_log where sent_at < now() - interval '60 days';
$$;


-- ============================================================
-- Zeitsteuerung
--
-- Der Job läuft jede Viertelstunde und entscheidet selbst, für wen
-- gerade etwas ansteht. Das ist einfacher und verlässlicher, als
-- für jede Uhrzeit einen eigenen Job anzulegen — und es erlaubt
-- jedem Nutzer eine eigene Weckzeit.
--
-- Vorher zwei Werte eintragen:
--   PROJEKT   deine Project-Ref, z. B. lasqqdmhsldorvgzbffj
--   GEHEIM    derselbe Wert wie das Secret NOTIFY_SECRET
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('leaner-notify')
  where exists (select 1 from cron.job where jobname = 'leaner-notify');

select cron.schedule(
  'leaner-notify',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://PROJEKT.supabase.co/functions/v1/notify',
    headers := jsonb_build_object(
                 'Content-Type',    'application/json',
                 'x-notify-secret', 'GEHEIM'
               ),
    body    := jsonb_build_object('mode', 'due'),
    timeout_milliseconds := 20000
  );
  $$
);

-- Kontrolle: hier muss danach eine Zeile stehen
-- select jobname, schedule, active from cron.job;
