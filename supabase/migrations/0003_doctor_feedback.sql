-- 0003 — surgeon feedback fixes
--
-- Two field additions:
--   1. tasks.patient_id (mandatory). In guardia workflow tasks are mentally
--      tied to the patient, not just the encounter. We keep encounter_id too
--      so existing queries keep working.
--   2. vitals.glasgow (3–15). Distinct measurement from glucemia — adding
--      both fields explicitly so the form can label them correctly.
--
-- task_priority enum and tasks.priority column are NOT dropped — UI just stops
-- collecting/showing them. Keeping the column avoids data loss and makes this
-- migration zero-risk to roll back.

-- ============================================================
-- tasks.patient_id
-- ============================================================
alter table public.tasks
  add column if not exists patient_id uuid references public.patients(id) on delete cascade;

-- Backfill from encounter for any existing rows.
update public.tasks t
   set patient_id = e.patient_id
  from public.encounters e
 where t.encounter_id = e.id
   and t.patient_id is null;

alter table public.tasks
  alter column patient_id set not null;

create index if not exists tasks_patient_idx on public.tasks(patient_id, status);

-- ============================================================
-- vitals.glasgow
-- ============================================================
alter table public.vitals
  add column if not exists glasgow int check (glasgow between 3 and 15);
