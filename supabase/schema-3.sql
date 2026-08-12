-- ============================================================
-- Leaner — Erweiterung: Bilder
--
-- Einmal komplett in den SQL Editor kopieren und ausführen.
-- Läuft auch problemlos ein zweites Mal.
--
-- Die Bilddateien selbst liegen in Supabase Storage, nicht in der
-- Datenbank. Gespeichert wird hier nur der Pfad. Der Bucket ist
-- privat: Zugriff gibt es ausschließlich über zeitlich begrenzte
-- Links, die die App bei Bedarf erzeugt.
-- ============================================================


-- ---------- Speicherort für Bilder ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', false, 5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Jede Datei liegt unter <user-id>/… — die Regeln vergleichen den
-- ersten Pfadabschnitt mit der angemeldeten Kennung. Damit kommt
-- niemand an fremde Bilder, auch nicht mit dem öffentlichen Schlüssel.

drop policy if exists "eigene Bilder lesen"    on storage.objects;
drop policy if exists "eigene Bilder anlegen"  on storage.objects;
drop policy if exists "eigene Bilder ersetzen" on storage.objects;
drop policy if exists "eigene Bilder löschen"  on storage.objects;

create policy "eigene Bilder lesen"
  on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "eigene Bilder anlegen"
  on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "eigene Bilder ersetzen"
  on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "eigene Bilder löschen"
  on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------- Bildverweise an bestehenden Tabellen ----------

alter table public.recipes      add column if not exists photo text;
alter table public.custom_foods add column if not exists photo_url text;   -- extern, z. B. Open Food Facts


-- ---------- Fortschrittsfotos ----------
-- Bewusst eine eigene Tabelle: Diese Bilder haben einen Zeitbezug
-- und sollen sich später als Verlauf zeigen lassen.

create table if not exists public.progress_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  path       text not null,
  taken_on   date not null default current_date,
  weight_kg  numeric,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists progress_photos_user
  on public.progress_photos (user_id, taken_on desc);

alter table public.progress_photos enable row level security;

drop policy if exists "eigene Fotos lesen"   on public.progress_photos;
drop policy if exists "eigene Fotos anlegen" on public.progress_photos;
drop policy if exists "eigene Fotos ändern"  on public.progress_photos;
drop policy if exists "eigene Fotos löschen" on public.progress_photos;

create policy "eigene Fotos lesen"   on public.progress_photos for select using (auth.uid() = user_id);
create policy "eigene Fotos anlegen" on public.progress_photos for insert with check (auth.uid() = user_id);
create policy "eigene Fotos ändern"  on public.progress_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Fotos löschen" on public.progress_photos for delete using (auth.uid() = user_id);


-- ---------- Fotos an Tagebucheinträgen ----------
-- Das Tagebuch liegt als JSON im Zustand. Statt es umzubauen,
-- steht der Bildpfad künftig im Eintrag selbst — dafür ist hier
-- nichts anzulegen. Diese Zeile ist nur ein Hinweis für später.
