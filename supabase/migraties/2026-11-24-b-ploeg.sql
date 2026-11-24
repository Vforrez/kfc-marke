-- Kaarten van de B-ploeg: de competitie "b" moet toegelaten worden.
-- Eenmalig uitvoeren in Supabase, SQL Editor. Veilig om opnieuw uit te voeren.
alter table matches drop constraint if exists matches_competition_check;
alter table matches add constraint matches_competition_check
  check (competition in ('competitie', 'beker', 'oefen', 'b'));
