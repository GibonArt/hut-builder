-- Jednorázová migrace: bonus_typ v JSONB radky SAL → PLAT, AP → BS
-- (stejná logika jako migrujLegacyBonusTypyVSdileneTabulce v lib/bonusKombinaceDb.ts).
-- Spusť v Supabase SQL Editoru jako postgres / service role, pokud nechceš spoléhat na auto-migraci
-- při prvním otevření Nastavení bonusů editorem.

update public.bonus_kombinace_global b
set radky = (
  select coalesce(
    jsonb_agg(
      case
        when e.elem->>'bonus_typ' = 'SAL' then e.elem || jsonb_build_object('bonus_typ', 'PLAT')
        when e.elem->>'bonus_typ' = 'AP' then e.elem || jsonb_build_object('bonus_typ', 'BS')
        else e.elem
      end
      order by e.ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(b.radky) with ordinality as e(elem, ord)
);
