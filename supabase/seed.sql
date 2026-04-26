-- Seed data — only meaningful AFTER you sign up at least one auth user.
-- Run from psql with:    psql ... -v owner=<your auth uid> -f supabase/seed.sql

\set ON_ERROR_STOP on

-- defaults so the file also runs without -v owner=…
\if :{?owner}
\else
  \set owner '00000000-0000-0000-0000-000000000000'
\endif

insert into public.users (id, full_name, matricula, rol, hospital, servicio)
values (:'owner', 'Dra. Demo', 'MN 99999', 'residente', 'Hospital de Clínicas', 'Clínica Médica')
on conflict (id) do update set full_name = excluded.full_name;

with p as (
  insert into public.patients (owner_id, nombre, apellido, documento, fecha_nacimiento, edad, sexo, antecedentes, alergias, medicacion_habitual)
  values
    (:'owner', 'María',  'González', '28333111', '1962-03-12', 63, 'femenino', array['HTA','Diabetes tipo 2'], array['Penicilina'], array['Enalapril 10mg','Metformina 850mg']),
    (:'owner', 'Roberto','Pereyra',  '34211998', '1989-07-04', 35, 'masculino', array['Tabaquista'], array[]::text[], array[]::text[]),
    (:'owner', 'Lucía',  'Fernández','42100008', '2002-11-21', 23, 'femenino', array[]::text[], array[]::text[], array['Anticonceptivo oral'])
  returning id, nombre
)
insert into public.encounters (patient_id, owner_id, sector, cama, triage, motivo_consulta, diagnostico_presuntivo)
select p.id, :'owner',
       case when p.nombre = 'María' then 'Guardia' when p.nombre = 'Roberto' then 'Guardia' else 'Guardia' end,
       case when p.nombre = 'María' then 'G-12'    when p.nombre = 'Roberto' then 'G-04'    else 'G-08' end,
       case when p.nombre = 'María' then 'rojo'::triage_color
            when p.nombre = 'Roberto' then 'amarillo'::triage_color
            else 'verde'::triage_color end,
       case when p.nombre = 'María'   then 'dolor torácico opresivo de 2hs'
            when p.nombre = 'Roberto' then 'tos productiva + fiebre 38.5'
            else 'cefalea de 1 día' end,
       case when p.nombre = 'María'   then 'SCA a descartar'
            when p.nombre = 'Roberto' then 'NAC vs bronquitis'
            else 'cefalea tensional' end
from p;
