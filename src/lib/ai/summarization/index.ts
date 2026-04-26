import { env } from "@/lib/env";
import { openai } from "../openai";

export type SummaryKind = "historia_clinica" | "evolucion" | "egreso";

const SYSTEM = `
Sos un asistente clínico que redacta documentos en estilo argentino,
tono profesional, conciso y sin diagnósticos no fundamentados.
- Usá secciones tradicionales según el tipo solicitado.
- No inventes datos. Si falta información, escribí "no consignado".
- Nunca tomes decisiones autónomas; el médico revisa y firma.
`.trim();

const TEMPLATES: Record<SummaryKind, string> = {
  historia_clinica:
    "Generá una HISTORIA CLÍNICA con secciones: Filiatorios, Motivo de consulta, " +
    "Antecedentes personales / familiares / alergias / medicación habitual, " +
    "Enfermedad actual, Examen físico, Estudios complementarios, " +
    "Diagnóstico presuntivo, Diagnósticos diferenciales, Plan / Indicaciones.",
  evolucion:
    "Generá una EVOLUCIÓN diaria en formato SOAP en español: Subjetivo, Objetivo (signos vitales y examen), " +
    "Análisis (impresión clínica), Plan (indicaciones). Máximo ~250 palabras.",
  egreso:
    "Generá una EPICRISIS / RESUMEN DE EGRESO con: Motivo de internación, evolución, " +
    "estudios relevantes, diagnóstico final, tratamiento al alta, controles."
};

export async function generateClinicalDocument(args: {
  kind: SummaryKind;
  patientContext: string;       // datos paciente + antecedentes
  encounterContext: string;     // sector/cama, motivo, dx presuntivo, vitals, labs, transcripts, etc
}): Promise<string> {
  if (env.AI_MODE === "mock") return mockDoc(args.kind);
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

function mockDoc(kind: SummaryKind): string {
  if (kind === "evolucion") {
    return [
      "Evolución (mock)",
      "S: Paciente refiere persistencia del dolor torácico, intensidad 6/10. Niega disnea actual.",
      "O: TA 140/90, FC 92, Sat 97%, Tº 36.7. Buen estado general. R1-R2 normofonéticos sin soplos.",
      "A: Dolor torácico en estudio, evolución estable. Pendiente segunda toma de troponina.",
      "P: Continúa con AAS, control de signos vitales c/2 hs, rever a las 4 hs."
    ].join("\n");
  }
  return "Documento mock — configurá OPENAI_API_KEY y AI_MODE=openai para generar contenido real.";
}
