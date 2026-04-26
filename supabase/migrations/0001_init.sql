-- pacientesYa — initial schema
-- Argentine guard / hospital workflow

create extension if not exists "uuid-ossp";
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- enums
-- ------------------------------------------------------------
create type triage_color    as enum ('rojo','amarillo','verde');
create type sexo_genero     as enum ('masculino','femenino','otro','no_informado');
create type encounter_state as enum ('activo','alta','derivado','obito');
create type task_status     as enum ('pendiente','en_curso','completada','cancelada');
create type task_priority   as enum ('baja','media','alta','critica');
create type alert_kind      as enum ('tarea_vencida','laboratorio_anormal','dato_critico_faltante','signo_vital_anormal');
create type alert_severity  as enum ('info','warn','critico');
create type document_kind   as enum ('ecg','laboratorio','imagen','informe','otro');
create type entity_kind     as enum (
  'sintoma','antecedente','diagnostico','medicacion','estudio',
  'signo_vital','valor_laboratorio','indicacion','alergia'
);
create type suggestion_kind as enum ('diagnostico_diferencial','estudio_complementario','tratamiento','interconsulta');

-- ------------------------------------------------------------
-- profiles (linked to auth.users)
-- ------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  matricula     text,
  rol           text default 'residente',
  hospital      text,
  servicio      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- patients
-- ------------------------------------------------------------
create table public.patients (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references public.users(id) on delete cascade,
  nombre            text not null,
  apellido          text not null,
  documento         text,
  fecha_nacimiento  date,
  edad              int,
  sexo              sexo_genero default 'no_informado',
  obra_social       text,
  alergias          text[],
  antecedentes      text[],
  medicacion_habitual text[],
  notas             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index patients_owner_idx on public.patients(owner_id);
create index patients_search_idx on public.patients
  using gin (to_tsvector('spanish', coalesce(nombre,'') || ' ' || coalesce(apellido,'') || ' ' || coalesce(documento,'')));

-- ------------------------------------------------------------
-- encounters (internaciones / visitas)
-- ------------------------------------------------------------
create table public.encounters (
  id                    uuid primary key default uuid_generate_v4(),
  patient_id            uuid not null references public.patients(id) on delete cascade,
  owner_id              uuid not null references public.users(id) on delete cascade,
  ingreso_at            timestamptz not null default now(),
  egreso_at             timestamptz,
  sector                text,
  cama                  text,
  triage                triage_color not null default 'verde',
  diagnostico_presuntivo text,
  motivo_consulta       text,
  estado                encounter_state not null default 'activo',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index encounters_patient_idx on public.encounters(patient_id);
create index encounters_active_idx  on public.encounters(owner_id, estado, triage);

-- ------------------------------------------------------------
-- consultations (an audio session within an encounter)
-- ------------------------------------------------------------
create table public.consultations (
  id              uuid primary key default uuid_generate_v4(),
  encounter_id    uuid not null references public.encounters(id) on delete cascade,
  owner_id        uuid not null references public.users(id) on delete cascade,
  audio_path      text,
  audio_duration_s int,
  status          text not null default 'recorded' check (status in ('recorded','transcribing','transcribed','extracted','failed')),
  error           text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index consultations_encounter_idx on public.consultations(encounter_id);

-- ------------------------------------------------------------
-- transcripts
-- ------------------------------------------------------------
create table public.transcripts (
  id              uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  owner_id        uuid not null references public.users(id) on delete cascade,
  raw_text        text not null,
  cleaned_text    text,
  language        text default 'es-AR',
  model           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index transcripts_consultation_idx on public.transcripts(consultation_id);

-- ------------------------------------------------------------
-- clinical_entities (structured extraction output)
-- ------------------------------------------------------------
create table public.clinical_entities (
  id              uuid primary key default uuid_generate_v4(),
  encounter_id    uuid not null references public.encounters(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete set null,
  owner_id        uuid not null references public.users(id) on delete cascade,
  kind            entity_kind not null,
  label           text not null,             -- e.g. "cefalea", "amoxicilina 500mg"
  value           text,                      -- e.g. "8/10", "c/8h x 7 días"
  unit            text,
  code            text,                      -- snomed/cie10 if known
  confidence      numeric(3,2),
  source_span     text,                      -- raw fragment that produced this entity
  created_at      timestamptz not null default now()
);
create index entities_encounter_idx on public.clinical_entities(encounter_id, kind);

-- ------------------------------------------------------------
-- vitals (signos vitales)
-- ------------------------------------------------------------
create table public.vitals (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  measured_at   timestamptz not null default now(),
  ta_sistolica  int,
  ta_diastolica int,
  fc            int,
  fr            int,
  temperatura   numeric(4,1),
  saturacion    int,
  glucemia      int,
  dolor_eva     int,
  notas         text,
  created_at    timestamptz not null default now()
);
create index vitals_encounter_idx on public.vitals(encounter_id, measured_at desc);

-- ------------------------------------------------------------
-- labs
-- ------------------------------------------------------------
create table public.labs (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  analito       text not null,             -- e.g. "hemoglobina", "creatinina"
  valor         numeric,
  unidad        text,
  ref_min       numeric,
  ref_max       numeric,
  flag          text,                      -- "alto", "bajo", "critico"
  observed_at   timestamptz not null default now(),
  source        text,                      -- "manual" | "documento:xxx" | "transcripcion"
  created_at    timestamptz not null default now()
);
create index labs_encounter_idx on public.labs(encounter_id, observed_at desc);

-- ------------------------------------------------------------
-- documents (uploaded ECG / lab images / PDFs)
-- ------------------------------------------------------------
create table public.documents (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid references public.encounters(id) on delete cascade,
  patient_id    uuid not null references public.patients(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  kind          document_kind not null default 'otro',
  title         text,
  storage_path  text not null,
  mime_type     text,
  bytes         int,
  created_at    timestamptz not null default now()
);
create index documents_encounter_idx on public.documents(encounter_id);

-- ------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  title         text not null,
  detail        text,
  priority      task_priority not null default 'media',
  status        task_status not null default 'pendiente',
  due_at        timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tasks_encounter_idx on public.tasks(encounter_id, status, due_at);

-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
create table public.alerts (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  kind          alert_kind not null,
  severity      alert_severity not null default 'warn',
  message       text not null,
  related_id    uuid,                      -- task / lab / etc
  acknowledged  boolean not null default false,
  acknowledged_at timestamptz,
  created_at    timestamptz not null default now()
);
create index alerts_open_idx on public.alerts(owner_id, acknowledged, severity);

-- ------------------------------------------------------------
-- patient_summaries (memoria por paciente)
-- ------------------------------------------------------------
create table public.patient_summaries (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references public.patients(id) on delete cascade,
  encounter_id  uuid references public.encounters(id) on delete set null,
  owner_id      uuid not null references public.users(id) on delete cascade,
  kind          text not null default 'evolucion' check (kind in ('historia_clinica','evolucion','snapshot','egreso')),
  content       text not null,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index summaries_patient_idx on public.patient_summaries(patient_id, created_at desc);

-- ------------------------------------------------------------
-- clinical_suggestions (NON autonomous)
-- ------------------------------------------------------------
create table public.clinical_suggestions (
  id            uuid primary key default uuid_generate_v4(),
  encounter_id  uuid not null references public.encounters(id) on delete cascade,
  owner_id      uuid not null references public.users(id) on delete cascade,
  kind          suggestion_kind not null,
  title         text not null,
  reasoning     text not null,
  confidence    numeric(3,2) not null default 0.5,
  source        jsonb default '[]'::jsonb,   -- [{type, ref_id, snippet}]
  accepted      boolean,                     -- null = no decision; true/false = doctor's call
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index suggestions_encounter_idx on public.clinical_suggestions(encounter_id, created_at desc);

-- ------------------------------------------------------------
-- embeddings (for similarity over summaries / transcripts)
-- ------------------------------------------------------------
create table public.embeddings (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.users(id) on delete cascade,
  source_kind   text not null check (source_kind in ('summary','transcript','entity')),
  source_id     uuid not null,
  patient_id    uuid references public.patients(id) on delete cascade,
  content       text not null,
  embedding     vector(1536) not null,        -- text-embedding-3-small
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index embeddings_owner_idx   on public.embeddings(owner_id);
create index embeddings_patient_idx on public.embeddings(patient_id);
create index embeddings_ann_idx     on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ------------------------------------------------------------
-- audit log (light)
-- ------------------------------------------------------------
create table public.audit_log (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references public.users(id) on delete set null,
  action      text not null,
  target      text,
  target_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index audit_owner_idx on public.audit_log(owner_id, created_at desc);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array['users','patients','encounters','consultations','transcripts','tasks','patient_summaries']) loop
    execute format('create trigger trg_%s_updated before update on public.%s for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- on auth signup → row in public.users
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- similarity search RPC
-- ------------------------------------------------------------
create or replace function public.match_embeddings(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.75,
  filter_patient uuid default null
)
returns table (
  id uuid,
  source_kind text,
  source_id uuid,
  patient_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable as $$
  select e.id, e.source_kind, e.source_id, e.patient_id, e.content, e.metadata,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  where e.owner_id = auth.uid()
    and (filter_patient is null or e.patient_id = filter_patient)
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
