"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Status = "idle" | "recording" | "paused" | "uploading" | "processing";

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

export function AudioRecorder({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>("idle");
  const [seconds, setSeconds] = React.useState(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTick = () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; };
  const startTick = () => {
    stopTick();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = upload;
      recorderRef.current = rec;
      rec.start(1000);
      setStatus("recording");
      setSeconds(0);
      startTick();
    } catch (e) {
      toast.error("No se pudo acceder al micrófono");
    }
  }
  function pause() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause(); setStatus("paused"); stopTick();
    }
  }
  function resume() {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume(); setStatus("recording"); startTick();
    }
  }
  function stop() {
    stopTick();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function upload() {
    setStatus("uploading");
    const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType ?? "audio/webm" });
    const fd = new FormData();
    fd.append("encounter_id", encounterId);
    fd.append("audio", blob, "consulta.webm");

    const upRes = await fetch("/api/consultations", { method: "POST", body: fd });
    if (!upRes.ok) {
      setStatus("idle");
      toast.error("Error al subir audio");
      return;
    }
    const { consultation } = await upRes.json();

    setStatus("processing");
    toast.message("Procesando consulta...", { description: "Transcribiendo y extrayendo datos." });
    const procRes = await fetch(`/api/consultations/${consultation.id}/process`, { method: "POST" });
    if (!procRes.ok) {
      const err = await procRes.json().catch(() => ({} as Record<string, unknown>));
      toast.error((err as { error?: string }).error ?? "Falló el procesamiento");
      setStatus("idle");
      return;
    }
    toast.success("Consulta procesada");
    setStatus("idle");
    router.refresh();
  }

  React.useEffect(() => () => { stopTick(); streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="rounded-lg border p-4 flex flex-col items-center gap-3">
      <div className="text-3xl font-mono tabular-nums">{mm}:{ss}</div>
      <div className="text-xs text-muted-foreground">
        {status === "idle" && "Listo para grabar"}
        {status === "recording" && <span className="text-red-500">● Grabando</span>}
        {status === "paused" && "En pausa"}
        {status === "uploading" && "Subiendo audio..."}
        {status === "processing" && "Procesando con IA..."}
      </div>
      <div className="flex gap-2">
        {status === "idle" && (
          <Button size="lg" onClick={start} className="gap-2"><Mic className="h-5 w-5" /> Grabar</Button>
        )}
        {status === "recording" && (
          <>
            <Button size="lg" variant="outline" onClick={pause} className="gap-2"><Pause className="h-5 w-5" /> Pausa</Button>
            <Button size="lg" variant="destructive" onClick={stop} className="gap-2"><Square className="h-5 w-5" /> Detener</Button>
          </>
        )}
        {status === "paused" && (
          <>
            <Button size="lg" onClick={resume} className="gap-2"><Play className="h-5 w-5" /> Reanudar</Button>
            <Button size="lg" variant="destructive" onClick={stop} className="gap-2"><Square className="h-5 w-5" /> Detener</Button>
          </>
        )}
        {(status === "uploading" || status === "processing") && (
          <Button size="lg" disabled className="gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Procesando</Button>
        )}
      </div>
    </div>
  );
}
