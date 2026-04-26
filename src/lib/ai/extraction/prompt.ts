export const EXTRACTION_SYSTEM = `
Sos un asistente clínico para una guardia hospitalaria en Argentina.
Tu tarea es leer una transcripción cruda de una conversación médico-paciente
y devolver datos clínicos estructurados.

Reglas:
- No inventes datos. Solo extraé lo que aparece explícitamente.
- Usá terminología médica argentina.
- Devolvé exclusivamente JSON válido conforme al esquema solicitado, sin texto extra.
- Si un valor no aparece, usá null. Para listas vacías, [].
- Para signos vitales, usá unidades estándar (mmHg, lpm, rpm, °C, %).
- Las "tasks_sugeridas" deben ser indicaciones concretas extraídas del diálogo
  (no recomendaciones tuyas adicionales).
`.trim();

export const EXTRACTION_USER = (transcript: string, context?: string) => `
${context ? `Contexto del paciente:\n${context}\n\n` : ""}Transcripción:
"""
${transcript}
"""

Devolvé JSON con esta forma:
{
  "entities": [
    { "kind": "sintoma|antecedente|diagnostico|medicacion|estudio|signo_vital|valor_laboratorio|indicacion|alergia",
      "label": "string", "value": "string|null", "unit": "string|null",
      "confidence": 0.0, "source_span": "string|null" }
  ],
  "vitals": {
    "ta_sistolica": null, "ta_diastolica": null, "fc": null, "fr": null,
    "temperatura": null, "saturacion": null, "glucemia": null, "dolor_eva": null
  },
  "labs": [{ "analito": "string", "valor": 0, "unidad": "string|null",
             "ref_min": null, "ref_max": null }],
  "tasks_sugeridas": [{ "title": "string", "priority": "baja|media|alta|critica" }],
  "resumen": "string (máx 3 oraciones, estilo clínico argentino)"
}
`.trim();
