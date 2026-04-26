import type { TranscribeArgs, TranscribeResult } from ".";

export async function transcribeMock(_args: TranscribeArgs): Promise<TranscribeResult> {
  return {
    text:
      "Paciente refiere dolor torácico opresivo de 2 horas de evolución, irradiado a brazo izquierdo. " +
      "Antecedentes de hipertensión arterial y diabetes tipo 2. Toma enalapril y metformina. " +
      "TA 150/95, FC 102, saturación 96%. Examen: regular estado general, sudorosa. " +
      "Solicito ECG, troponina, hemograma, glucemia y RX de tórax. Indico AAS 300mg.",
    language: "es-AR",
    model: "mock"
  };
}
