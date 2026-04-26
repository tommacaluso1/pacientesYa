import { PatientFastForm } from "@/components/patients/PatientFastForm";

export default function NuevoPacientePage() {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nuevo paciente</h1>
        <p className="text-sm text-muted-foreground">Carga rápida — completá lo mínimo, después editás.</p>
      </div>
      <PatientFastForm />
    </div>
  );
}
