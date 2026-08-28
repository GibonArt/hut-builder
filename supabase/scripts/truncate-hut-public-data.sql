-- Vyprázdní data HUT Builder v public před importem z cloudu.
-- Schéma zůstane; auth.users se nemění (sdílené s hut-turnaj).

TRUNCATE TABLE
  public.cards,
  public.hut_typy_karet_dynamic,
  public.bonus_kombinace_global,
  public.bonus_kombinace_nastaveni,
  public.ea_hraci_napoveda
RESTART IDENTITY CASCADE;
