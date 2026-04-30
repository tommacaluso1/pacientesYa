import { env } from "@/lib/env";
import { openai } from "../openai";

export type SummaryKind = "historia_clinica" | "evolucion" | "egreso";

const SYSTEM = `
Sos un asistente clínico que redacta documentos en estilo argentino,
tono profesional, conciso y sin diagnósticos no fundamentados.
- Usá EXACTAMENTE las secciones del template solicitado, en ese orden.
- No inventes datos. Si una sección no tiene información, escribí "no consignado".
- No reuses datos de otros pacientes. Sólo trabajás con los datos del paciente actual provistos abajo.
- Nunca tomes decisiones autónomas; el médico revisa, edita y firma.
- Devolvé sólo el documento, sin preámbulos ni cierres tipo "espero que sirva".
`.trim();

const TEMPLATES: Record<SummaryKind, string> = {
  // Short daily evolution — what the resident hands off on rounds.
  evolucion: [
    "Generá una EVOLUCIÓN DIARIA con estas secciones, en este orden,",
    "cada una con su título en mayúscula seguido de dos puntos:",
    "1. DÍA DE INTERNACIÓN  — usá el día calculado del contexto del episodio.",
    "2. ESTADO GENERAL       — descripción global del paciente.",
    "3. SIGNOS VITALES       — TA, FC, FR, Tº, SatO2, glucemia, Glasgow si están.",
    "4. CAMBIOS RELEVANTES   — qué cambió desde la última evolución.",
    "5. ESTUDIOS             — laboratorios y estudios pertinentes del día.",
    "6. CONDUCTA             — plan / indicaciones para las próximas horas.",
    "Tono telegráfico, máximo ~250 palabras."
  ].join("\n"),

  // Full admission write-up.
  historia_clinica: [
    "Generá una HISTORIA CLÍNICA con estas secciones, en este orden,",
    "cada una con su título en mayúscula seguido de dos puntos:",
    "1. MOTIVO DE CONSULTA",
    "2. ENFERMEDAD ACTUAL       — relato cronológico del episodio.",
    "3. ANTECEDENTES            — personales, alergias, medicación habitual.",
    "4. EXAMEN FÍSICO           — incluí signos vitales y hallazgos relevantes.",
    "5. ESTUDIOS COMPLEMENTARIOS — labs e imágenes con resultados.",
    "6. DIAGNÓSTICO PRESUNTIVO  — y diagnósticos diferenciales si corresponde.",
    "7. PLAN                    — conducta, indicaciones, interconsultas."
  ].join("\n"),

  egreso: [
    "Generá una EPICRISIS / RESUMEN DE EGRESO con secciones:",
    "Motivo de internación, Evolución, Estudios relevantes,",
    "Diagnóstico final, Tratamiento al alta, Controles."
  ].join("\n")
};

export async function generateClinicalDocument(args: {
  kind: SummaryKind;
  patientContext: string;       // datos paciente + antecedentes
  encounterContext: string;     // sector/cama, motivo, dx presuntivo, vitals, labs, transcripts, etc
}): Promise<string> {
  if (env.AI_MODE === "mock") return mockDoc(args.kind, args.patientContext);
  const res = await openai().chat.completions.create({
    model: env.OPENAI_TEXT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content:
        `${TEMPLATES[args.kind]}\n\nDATOS DEL PACIENTE:\n${args.patientContext}\n\nDATOS DEL EPISODIO ACTUAL:\n${args.encounterContext}` }
    ]
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

// Demo mock — never fabricates clinical content.
function mockDoc(kind: SummaryKind, patientContext: string): string {
  const firstLine = patientContext.split("\n").find((l) => l.trim().length > 0) ?? "—";
  const header = `[MODO DEMO — activá AI_MODE=openai para texto real]\n\nPaciente: ${firstLine}\n`;
  if (kind === "evolucion") {
    return [
      header,
      "DÍA DE INTERNACIÓN: pendiente.",
      "ESTADO GENERAL: pendiente.",
      "SIGNOS VITALES: pendiente.",
      "CAMBIOS RELEVANTES: pendiente.",
      "ESTUDIOS: pendiente.",
      "CONDUCTA: pendiente."
    ].join("\n");
  }
  if (kind === "historia_clinica") {
    return [
      header,
      "MOTIVO DE CONSULTA: pendiente.",
      "ENFERMEDAD ACTUAL: pendiente.",
      "ANTECEDENTES: pendiente.",
      "EXAMEN FÍSICO: pendiente.",
      "ESTUDIOS COMPLEMENTARIOS: pendiente.",
      "DIAGNÓSTICO PRESUNTIVO: pendiente.",
      "PLAN: pendiente."
    ].join("\n");
  }
  return `${header}\nDocumento de egreso pendiente.`;
}
