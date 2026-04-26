-- Row Level Security: every row is owner-scoped (one resident's data is invisible to others)

alter table public.users                enable row level security;
alter table public.patients             enable row level security;
alter table public.encounters           enable row level security;
alter table public.consultations        enable row level security;
alter table public.transcripts          enable row level security;
alter table public.clinical_entities    enable row level security;
alter table public.vitals               enable row level security;
alter table public.labs                 enable row level security;
alter table public.documents            enable row level security;
alter table public.tasks                enable row level security;
alter table public.alerts               enable row level security;
alter table public.patient_summaries    enable row level security;
alter table public.clinical_suggestions enable row level security;
alter table public.embeddings           enable row level security;
alter table public.audit_log            enable row level security;

-- users: a row per auth user, viewable/updatable by self
create policy users_self_select on public.users for select using (id = auth.uid());
create policy users_self_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());

-- helper: every other table has owner_id; CRUD restricted to owner
do $$
declare t text;
begin
  for t in select unnest(array[
    'patients','encounters','consultations','transcripts','clinical_entities',
    'vitals','labs','documents','tasks','alerts','patient_summaries',
    'clinical_suggestions','embeddings','audit_log'
  ]) loop
    execute format('create policy %I on public.%I for select using (owner_id = auth.uid())', t||'_owner_select', t);
    execute format('create policy %I on public.%I for insert with check (owner_id = auth.uid())', t||'_owner_insert', t);
    execute format('create policy %I on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t||'_owner_update', t);
    execute format('create policy %I on public.%I for delete using (owner_id = auth.uid())', t||'_owner_delete', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Storage: bucket for audio + documents
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('clinical', 'clinical', false)
on conflict (id) do nothing;

create policy "clinical_owner_read" on storage.objects
  for select using (bucket_id = 'clinical' and (auth.uid()::text = (storage.foldername(name))[1]));

create policy "clinical_owner_write" on storage.objects
  for insert with check (bucket_id = 'clinical' and (auth.uid()::text = (storage.foldername(name))[1]));

create policy "clinical_owner_update" on storage.objects
  for update using (bucket_id = 'clinical' and (auth.uid()::text = (storage.foldername(name))[1]));

create policy "clinical_owner_delete" on storage.objects
  for delete using (bucket_id = 'clinical' and (auth.uid()::text = (storage.foldername(name))[1]));
