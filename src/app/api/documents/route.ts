import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { documentMetaSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "clinical";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const meta = documentMetaSchema.safeParse({
      patient_id: form.get("patient_id"),
      encounter_id: form.get("encounter_id") || undefined,
      kind: form.get("kind") || "otro",
      title: form.get("title") || undefined
    });
    if (!meta.success) return NextResponse.json({ error: meta.error.flatten() }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "bin";
    const key = `${user.id}/docs/${meta.data.patient_id}/${Date.now()}.${ext}`;
    const buf = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buf, {
      contentType: file.type, upsert: false
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: doc, error } = await supabase
      .from("documents")
      .insert({
        patient_id: meta.data.patient_id,
        encounter_id: meta.data.encounter_id ?? null,
        owner_id: user.id,
        kind: meta.data.kind,
        title: meta.data.title ?? file.name,
        storage_path: key,
        mime_type: file.type,
        bytes: file.size
      })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ document: doc });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
