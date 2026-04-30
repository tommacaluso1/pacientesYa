import { z } from "zod";

export const triageSchema = z.enum(["rojo", "amarillo", "verde"]);
export const sexoSchema = z.enum(["masculino", "femenino", "otro", "no_informado"]);
export const taskPrioritySchema = z.enum(["baja", "media", "alta", "critica"]);
export const taskStatusSchema = z.enum(["pendiente", "en_curso", "completada", "cancelada"]);
export const docKindSchema = z.enum(["ecg", "laboratorio", "imagen", "informe", "otro"]);
export const entityKindSchema = z.enum([
  "sintoma","antecedente","diagnostico","medicacion","estudio",
  "signo_vital","valor_laboratorio","indicacion","alergia"
]);
export const suggestionKindSchema = z.enum([
  "diagnostico_diferencial","estudio_complementario","tratamiento","interconsulta"
]);

// FAST patient + encounter creation (one form, both rows)
export const patientFastCreateSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(80),
  apellido: z.string().min(1, "Requerido").max(80),
  documento: z.string().max(20).optional().or(z.literal("")),
  edad: z.coerce.number().int().min(0).max(120).optional(),
  sexo: sexoSchema.default("no_informado"),
  sector: z.string().max(40).optional().or(z.literal("")),
  cama: z.string().max(20).optional().or(z.literal("")),
  triage: triageSchema.default("verde"),
  ingreso_at: z.string().datetime().optional(),
  motivo_consulta: z.string().max(500).optional().or(z.literal("")),
  diagnostico_presuntivo: z.string().max(200).optional().or(z.literal(""))
});
export type PatientFastCreate = z.infer<typeof patientFastCreateSchema>;

export const taskCreateSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  detail: z.string().max(500).optional().or(z.literal("")),
  // priority is no longer collected from the UI. The DB column still exists
  // and defaults to 'media' to keep older rows valid; we don't write it.
  due_at: z.string().datetime().optional().nullable()
});
export type TaskCreate = z.infer<typeof taskCreateSchema>;

export const taskUpdateSchema = z.object({
  status: taskStatusSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  detail: z.string().max(500).nullish(),
  due_at: z.string().datetime().nullish()
});
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

export const vitalsSchema = z.object({
  encounter_id: z.string().uuid(),
  ta_sistolica: z.coerce.number().int().min(40).max(280).optional(),
  ta_diastolica: z.coerce.number().int().min(20).max(180).optional(),
  fc: z.coerce.number().int().min(20).max(250).optional(),
  fr: z.coerce.number().int().min(5).max(60).optional(),
  temperatura: z.coerce.number().min(30).max(43).optional(),
  saturacion: z.coerce.number().int().min(40).max(100).optional(),
  glucemia: z.coerce.number().int().min(20).max(800).optional(),
  glasgow: z.coerce.number().int().min(3).max(15).optional(),
  dolor_eva: z.coerce.number().int().min(0).max(10).optional(),
  notas: z.string().max(300).optional().or(z.literal(""))
});

export const labSchema = z.object({
  encounter_id: z.string().uuid(),
  analito: z.string().min(1).max(60),
  valor: z.coerce.number(),
  unidad: z.string().max(20).optional(),
  ref_min: z.coerce.number().optional(),
  ref_max: z.coerce.number().optional(),
  source: z.string().optional()
});

export const documentMetaSchema = z.object({
  patient_id: z.string().uuid(),
  encounter_id: z.string().uuid().optional(),
  kind: docKindSchema.default("otro"),
  title: z.string().max(120).optional()
});

// AI extraction output contract
export const extractedEntitySchema = z.object({
  kind: entityKindSchema,
  label: z.string().min(1).max(160),
  value: z.string().max(120).optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  confidence: z.number().min(0).max(1).default(0.6),
  source_span: z.string().max(400).optional().nullable()
});
export type ExtractedEntity = z.infer<typeof extractedEntitySchema>;

export const extractionResultSchema = z.object({
  entities: z.array(extractedEntitySchema).default([]),
  vitals: z.object({
    ta_sistolica: z.number().int().nullable().optional(),
    ta_diastolica: z.number().int().nullable().optional(),
    fc: z.number().int().nullable().optional(),
    fr: z.number().int().nullable().optional(),
    temperatura: z.number().nullable().optional(),
    saturacion: z.number().int().nullable().optional(),
    glucemia: z.number().int().nullable().optional(),
    glasgow: z.number().int().min(3).max(15).nullable().optional(),
    dolor_eva: z.number().int().nullable().optional()
  }).partial().optional(),
  labs: z.array(z.object({
    analito: z.string(), valor: z.number(),
    unidad: z.string().nullable().optional(),
    ref_min: z.number().nullable().optional(),
    ref_max: z.number().nullable().optional()
  })).default([]),
  tasks_sugeridas: z.array(z.object({
    title: z.string()
  })).default([]),
  resumen: z.string().default("")
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const suggestionSchema = z.object({
  kind: suggestionKindSchema,
  title: z.string().min(1).max(160),
  reasoning: z.string().min(1).max(1200),
  confidence: z.number().min(0).max(1).default(0.5),
  source: z.array(z.object({
    type: z.string(), ref_id: z.string().optional(), snippet: z.string().optional()
  })).default([])
});
export type SuggestionInput = z.infer<typeof suggestionSchema>;
