// Hand-written subset matching supabase/migrations/0001_init.sql.
// Regenerate with `npm run db:types` once you've linked the project.

export type TriageColor = "rojo" | "amarillo" | "verde";
export type SexoGenero = "masculino" | "femenino" | "otro" | "no_informado";
export type EncounterState = "activo" | "alta" | "derivado" | "obito";
export type TaskStatus = "pendiente" | "en_curso" | "completada" | "cancelada";
export type TaskPriority = "baja" | "media" | "alta" | "critica";
export type AlertKind = "tarea_vencida" | "laboratorio_anormal" | "dato_critico_faltante" | "signo_vital_anormal";
export type AlertSeverity = "info" | "warn" | "critico";
export type DocumentKind = "ecg" | "laboratorio" | "imagen" | "informe" | "otro";
export type EntityKind =
  | "sintoma" | "antecedente" | "diagnostico" | "medicacion"
  | "estudio" | "signo_vital" | "valor_laboratorio" | "indicacion" | "alergia";
export type SuggestionKind = "diagnostico_diferencial" | "estudio_complementario" | "tratamiento" | "interconsulta";

type Timestamps = { created_at: string; updated_at?: string };

export interface User extends Timestamps {
  id: string; full_name: string | null; matricula: string | null;
  rol: string | null; hospital: string | null; servicio: string | null;
}

export interface Patient extends Timestamps {
  id: string; owner_id: string;
  nombre: string; apellido: string; documento: string | null;
  fecha_nacimiento: string | null; edad: number | null; sexo: SexoGenero;
  obra_social: string | null;
  alergias: string[] | null; antecedentes: string[] | null; medicacion_habitual: string[] | null;
  notas: string | null;
}

export interface Encounter extends Timestamps {
  id: string; patient_id: string; owner_id: string;
  ingreso_at: string; egreso_at: string | null;
  sector: string | null; cama: string | null;
  triage: TriageColor;
  diagnostico_presuntivo: string | null; motivo_consulta: string | null;
  estado: EncounterState;
}

export interface Consultation extends Timestamps {
  id: string; encounter_id: string; owner_id: string;
  audio_path: string | null; audio_duration_s: number | null;
  status: "recorded" | "transcribing" | "transcribed" | "extracted" | "failed";
  error: string | null; started_at: string; finished_at: string | null;
}

export interface Transcript extends Timestamps {
  id: string; consultation_id: string; owner_id: string;
  raw_text: string; cleaned_text: string | null;
  language: string | null; model: string | null;
}

export interface ClinicalEntity {
  id: string; encounter_id: string; consultation_id: string | null; owner_id: string;
  kind: EntityKind; label: string; value: string | null; unit: string | null;
  code: string | null; confidence: number | null; source_span: string | null;
  created_at: string;
}

export interface Vitals {
  id: string; encounter_id: string; owner_id: string; measured_at: string;
  ta_sistolica: number | null; ta_diastolica: number | null; fc: number | null; fr: number | null;
  temperatura: number | null; saturacion: number | null; glucemia: number | null; dolor_eva: number | null;
  notas: string | null; created_at: string;
}

export interface Lab {
  id: string; encounter_id: string; owner_id: string;
  analito: string; valor: number | null; unidad: string | null;
  ref_min: number | null; ref_max: number | null; flag: string | null;
  observed_at: string; source: string | null; created_at: string;
}

export interface DocumentRow {
  id: string; encounter_id: string | null; patient_id: string; owner_id: string;
  kind: DocumentKind; title: string | null; storage_path: string;
  mime_type: string | null; bytes: number | null; created_at: string;
}

export interface Task extends Timestamps {
  id: string; encounter_id: string; owner_id: string;
  title: string; detail: string | null;
  priority: TaskPriority; status: TaskStatus;
  due_at: string | null; completed_at: string | null;
}

export interface Alert {
  id: string; encounter_id: string; owner_id: string;
  kind: AlertKind; severity: AlertSeverity; message: string;
  related_id: string | null; acknowledged: boolean; acknowledged_at: string | null;
  created_at: string;
}

export interface PatientSummary extends Timestamps {
  id: string; patient_id: string; encounter_id: string | null; owner_id: string;
  kind: "historia_clinica" | "evolucion" | "snapshot" | "egreso";
  content: string; metadata: Record<string, unknown>;
}

export interface ClinicalSuggestion {
  id: string; encounter_id: string; owner_id: string;
  kind: SuggestionKind; title: string; reasoning: string;
  confidence: number; source: Array<{ type: string; ref_id?: string; snippet?: string }>;
  accepted: boolean | null; accepted_at: string | null; created_at: string;
}

export interface Embedding {
  id: string; owner_id: string; source_kind: "summary" | "transcript" | "entity";
  source_id: string; patient_id: string | null; content: string;
  embedding: number[]; metadata: Record<string, unknown>; created_at: string;
}

// Minimal Database type for supabase-js generics — sufficient at compile time;
// regenerate properly with `npm run db:types` for full type-safe queries.
export type Database = {
  public: {
    Tables: {
      users:                { Row: User;               Insert: Partial<User>;               Update: Partial<User> };
      patients:             { Row: Patient;            Insert: Partial<Patient>;            Update: Partial<Patient> };
      encounters:           { Row: Encounter;          Insert: Partial<Encounter>;          Update: Partial<Encounter> };
      consultations:        { Row: Consultation;       Insert: Partial<Consultation>;       Update: Partial<Consultation> };
      transcripts:          { Row: Transcript;         Insert: Partial<Transcript>;         Update: Partial<Transcript> };
      clinical_entities:    { Row: ClinicalEntity;     Insert: Partial<ClinicalEntity>;     Update: Partial<ClinicalEntity> };
      vitals:               { Row: Vitals;             Insert: Partial<Vitals>;             Update: Partial<Vitals> };
      labs:                 { Row: Lab;                Insert: Partial<Lab>;                Update: Partial<Lab> };
      documents:            { Row: DocumentRow;        Insert: Partial<DocumentRow>;        Update: Partial<DocumentRow> };
      tasks:                { Row: Task;               Insert: Partial<Task>;               Update: Partial<Task> };
      alerts:               { Row: Alert;              Insert: Partial<Alert>;              Update: Partial<Alert> };
      patient_summaries:    { Row: PatientSummary;     Insert: Partial<PatientSummary>;     Update: Partial<PatientSummary> };
      clinical_suggestions: { Row: ClinicalSuggestion; Insert: Partial<ClinicalSuggestion>; Update: Partial<ClinicalSuggestion> };
      embeddings:           { Row: Embedding;          Insert: Partial<Embedding>;          Update: Partial<Embedding> };
    };
    Views: {};
    Functions: {
      match_embeddings: {
        Args: { query_embedding: number[]; match_count?: number; match_threshold?: number; filter_patient?: string | null };
        Returns: Array<{ id: string; source_kind: string; source_id: string; patient_id: string | null; content: string; metadata: Record<string, unknown>; similarity: number }>;
      };
    };
    Enums: {
      triage_color: TriageColor; sexo_genero: SexoGenero; encounter_state: EncounterState;
      task_status: TaskStatus; task_priority: TaskPriority;
      alert_kind: AlertKind; alert_severity: AlertSeverity;
      document_kind: DocumentKind; entity_kind: EntityKind; suggestion_kind: SuggestionKind;
    };
  };
};
