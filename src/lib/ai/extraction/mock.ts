// Demo mock for offline / dev mode (AI_MODE=mock).
// Never fabricates clinical entities — that would persist fake data into the
// real patient's record and look exactly like cross-patient leakage.
// In demo mode the pipeline writes no entities, no vitals, no labs, no tasks;
// only a clearly-labeled placeholder summary so the user knows mock is on.
export async function extractMock(_args: { transcript: string; context?: string }) {
  return {
    entities: [],
    vitals: {},
    labs: [],
    tasks_sugeridas: [],
    resumen: ""
  };
}
