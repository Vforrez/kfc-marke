-- KFC Marke statistieken: databasestructuur voor Supabase.
-- Plak dit hele bestand in Supabase, onder "SQL Editor", en klik op "Run". Eén keer uitvoeren is genoeg.

create table if not exists seasons (
  id          text primary key,
  name        text not null,
  start_year  int  not null,
  rules       jsonb not null default '{}'::jsonb,   -- puntentelling van dat seizoen (leeg = standaardregels)
  note        text
);

create table if not exists people (
  id          text primary key,
  first_name  text not null,
  last_name   text not null default ''
);

create table if not exists roster (                  -- wie zit in welk seizoen, met nummer en positie
  id          text primary key,
  season_id   text not null references seasons(id) on delete cascade,
  person_id   text not null references people(id)  on delete cascade,
  role        text not null default 'speler' check (role in ('speler', 'staf')),
  number      text,
  position    text,                                  -- keeper, verdediger, middenvelder, aanvaller of staffunctie
  adjust      int  not null default 0,               -- handmatige correctie op de fantasypunten
  adjust_note text
);

create table if not exists matches (
  id            text primary key,
  season_id     text not null references seasons(id) on delete cascade,
  date          date,
  kickoff       text,
  opponent      text not null,
  home          boolean not null default true,
  competition   text not null default 'competitie' check (competition in ('competitie', 'beker', 'oefen')),
  score_for     int,
  score_against int,
  ga_corner int, ga_free int, ga_pen int, ga_error int, ga_quality int,
  sp_corners int, sp_free int, sp_pens int,
  opp_corners int, opp_free int, opp_pens int,
  note          text
);

create table if not exists lines (                   -- één rij per speler per wedstrijd
  id          text primary key,
  match_id    text not null references matches(id) on delete cascade,
  roster_id   text not null references roster(id)  on delete cascade,
  minutes     int,                                   -- leeg = niet in selectie, 0 = op de bank
  g_play int, g_corner int, g_free int, g_pen int,
  assists     int,
  yellow      int,
  red         int,
  motm        int check (motm between 1 and 3),      -- plaats bij man van de match
  own_goals   int,
  pen_missed  int,
  pen_saved   int,
  suspended   int
);

create index if not exists roster_season_idx  on roster(season_id);
create index if not exists roster_person_idx  on roster(person_id);
create index if not exists matches_season_idx on matches(season_id);
create index if not exists lines_match_idx    on lines(match_id);
create index if not exists lines_roster_idx   on lines(roster_id);

-- Toegang: iedereen mag lezen (de kijkversie), enkel een ingelogde gebruiker mag wijzigen.
alter table seasons enable row level security;
alter table people  enable row level security;
alter table roster  enable row level security;
alter table matches enable row level security;
alter table lines   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['seasons', 'people', 'roster', 'matches', 'lines'] loop
    execute format('drop policy if exists "lezen voor iedereen" on %I', t);
    execute format('drop policy if exists "schrijven voor ingelogde gebruiker" on %I', t);
    execute format('create policy "lezen voor iedereen" on %I for select to anon, authenticated using (true)', t);
    execute format('create policy "schrijven voor ingelogde gebruiker" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
