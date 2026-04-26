# pacientesYa

Asistente clínico para residentes en guardia hospitalaria (Argentina). PWA mobile-first que captura paciente en <30s, graba la consulta, transcribe, estructura los datos, mantiene tareas/alertas, redacta evolución / historia clínica y emite **sugerencias no autónomas** basadas en memoria del residente (pgvector).

> El médico decide siempre. La app no toma decisiones autónomas.

## Stack

- **Next.js 14** (App Router) · TypeScript · TailwindCSS · shadcn-style primitives
- **Supabase** PostgreSQL · Auth · Storage · pgvector · Row Level Security por usuario
- **OpenAI** Whisper (transcripción) + GPT (extracción/sugerencias) + text-embedding-3-small
- React Query · React Hook Form · Zod · sonner · lucide-react

Cada paso de IA es modular; con `AI_MODE=mock` la app corre sin internet ni API key (datos simulados).

## Arquitectura

```
src/
  app/
    page.tsx                     # Dashboard de guardia (sort por triage)
    pacientes/nuevo/             # Carga rápida (<30s)
    pacientes/[id]/              # Detalle con tabs
    alertas/                     # Alertas abiertas
    historias/                   # Historias y evoluciones generadas
    api/
      consultations/             # POST: subir audio
      consultations/[id]/process # POST: pipeline IA completo
      documents/                 # POST: ECG / labs / imágenes
      documents/signed-url       # GET: signed URL temporal
      alerts/evaluate            # POST: re-evaluar alertas
    actions/                     # Server actions (zod-validated)

  components/
    ui/                          # Button, Card, Input, Tabs, Dialog, Badge, ...
    patients/                    # PatientCard, FastForm, TriageBadge
    patient-detail/              # ResumenTab, EvolucionTab, TareasTab, ...
    audio/AudioRecorder.tsx      # MediaRecorder en navegador
    shell/                       # TopBar, BottomNav

  lib/
    supabase/                    # browser / server / admin clients
    domain/                      # patients, tasks, alerts, summaries
    validation/schemas.ts        # zod
    ai/
      transcription/             # interfaz + openai-whisper + mock
      extraction/                # interfaz + openai + mock + prompt
      summarization/             # historia / evolución / egreso
      embeddings/                # text-embedding-3-small + mock
      suggestions/               # sugerencias no autónomas
      pipeline.ts                # orquestación end-to-end

supabase/
  migrations/0001_init.sql       # 14 tablas + pgvector + RPC match_embeddings
  migrations/0002_rls.sql        # RLS owner-scoped + storage policies
  seed.sql                       # Datos demo
```

## Modelo de datos

14 tablas (todas con `id uuid` + `created_at` + `updated_at` cuando aplica), todas RLS por `owner_id = auth.uid()`:

`users`, `patients`, `encounters` (internaciones/visitas separadas del paciente), `consultations` (sesiones de audio, linkeadas a encounter), `transcripts` (linkeados a consultation), `clinical_entities` (datos extraídos), `vitals`, `labs`, `documents`, `tasks`, `alerts`, `patient_summaries`, `clinical_suggestions`, `embeddings` (linkeadas a summaries / transcripts / entities, con `vector(1536)` + RPC `match_embeddings`).

## Pipeline de IA

```
audio  →  transcribe  →  clean  →  extract  →  structure (entities/vitals/labs/tasks)
                                          ↘
                              summarize (evolución estilo argentino)  →  embed
                                                                          ↓
                                                        match_embeddings (memoria propia)
                                                                          ↓
                                                       suggestions (dx dif / estudios / tto / IC)
```

Cada paso es swappeable: la interfaz `transcribe(...)`, `extract(...)`, `embed(...)`, `generateSuggestions(...)` despacha por `AI_MODE`. Para usar otro proveedor, agregá un archivo nuevo (p.ej. `transcription/deepgram.ts`) y cambiá el dispatcher.

## Setup local

### 1. Dependencias

```bash
npm install
```

### 2. Supabase (cloud o local)

**Cloud (recomendado):**

1. Crear proyecto en https://supabase.com.
2. Settings → API: copiar `Project URL` + `anon key` + `service_role key` al `.env.local`.
3. Aplicar migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
4. (Opcional) seed:
   ```bash
   psql "$(npx supabase status -o env | grep DATABASE_URL | cut -d= -f2)" \
     -v owner=<auth-user-uuid> -f supabase/seed.sql
   ```

**Local:**

```bash
npx supabase start
npx supabase db reset    # aplica migraciones
```

### 3. Storage

El bucket `clinical` se crea por la migración `0002_rls.sql` (privado, lectura solo por dueño).

### 4. `.env.local`

```bash
cp .env.example .env.local
# Completar URL + ANON_KEY + SERVICE_ROLE_KEY + OPENAI_API_KEY
# Para correr sin OpenAI: AI_MODE=mock
```

### 5. Dev

```bash
npm run dev
```

Abrí http://localhost:3000, registrá una cuenta, y cargá tu primer paciente.

> Para que el micrófono funcione fuera de localhost necesitás HTTPS (Vercel ya lo da).

## Deploy a Vercel

1. Push del repo a GitHub.
2. Importar en https://vercel.com.
3. Variables de entorno (Project Settings → Environment Variables): copiar todo `.env.example`.
4. Deploy. La URL pública resultante (`https://*.vercel.app`) es accesible desde el celular del residente.

## Seguridad y privacidad

- RLS estricto: cada residente solo ve sus pacientes. Verificable con `select * from public.patients` desde el panel SQL como otro usuario.
- Storage: las rutas `clinical/<auth_uid>/...` están scopeadas por las policies de Storage.
- Service role key **solo** en el server (jamás expuesta al browser).
- Sugerencias clínicas siempre marcadas como **no autónomas**; la decisión la toma el médico (UI con botón Aceptar/Descartar y banner explícito).
- Audit log liviano (`audit_log`) listo para extenderlo.

## Decisiones de diseño / no-objetivos

- **No** se hizo offline-first completo: la app tolera latencia (botones con estados) pero requiere conectividad para grabar/procesar.
- **No** hay multi-tenant todavía: un residente = un owner. Para hospital-wide, hay que reemplazar las policies por tenant.
- **No** se firma electrónicamente: los textos generados son editables y deben pegarse en el HCE institucional.
- Los códigos `code` (SNOMED/CIE-10) están en el schema pero no se completan automáticamente — punto de extensión.

## Próximos pasos sugeridos

- Reconocimiento OCR para imágenes de laboratorio.
- Cron `evaluateEncounter` cada 5 min para alertas de tareas vencidas (Vercel Cron + `/api/alerts/evaluate`).
- Push notifications para alertas críticas (Web Push API).
- `npm run db:types` luego de linkear: regenera `src/types/database.ts` desde el schema real.
