export async function extractMock(_args: { transcript: string; context?: string }) {
  return {
    entities: [
      { kind: "sintoma", label: "dolor torácico opresivo", value: "2 horas", confidence: 0.9, source_span: "dolor torácico opresivo de 2 horas" },
      { kind: "antecedente", label: "hipertensión arterial", confidence: 0.95 },
      { kind: "antecedente", label: "diabetes tipo 2", confidence: 0.95 },
      { kind: "medicacion", label: "enalapril", confidence: 0.9 },
      { kind: "medicacion", label: "metformina", confidence: 0.9 },
      { kind: "estudio", label: "ECG", confidence: 0.95 },
      { kind: "estudio", label: "troponina", confidence: 0.9 },
      { kind: "estudio", label: "hemograma", confidence: 0.9 },
      { kind: "estudio", label: "RX tórax", confidence: 0.85 },
      { kind: "indicacion", label: "AAS 300mg", confidence: 0.9 }
    ],
    vitals: { ta_sistolica: 150, ta_diastolica: 95, fc: 102, saturacion: 96 },
    labs: [],
    tasks_sugeridas: [
      { title: "Realizar ECG", priority: "critica" },
      { title: "Solicitar troponina", priority: "alta" },
      { title: "Solicitar hemograma + glucemia", priority: "media" },
      { title: "RX de tórax", priority: "media" },
      { title: "Administrar AAS 300mg VO", priority: "alta" }
    ],
    resumen: "Mujer con dolor torácico opresivo irradiado a MSI, HTA y DBT2. Hemodinamia con TA 150/95, FC 102. Plan: ECG + enzimas + RX, AAS 300 mg."
  };
}
