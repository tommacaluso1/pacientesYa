import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "clinical";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const form = await req.formData();
    const encounter_id = String(form.get("encounter_id") ?? "");
    const audio = form.get("audio") as File | null;
    if (!encounter_id) return NextResponse.json({ error: "encounter_id required" }, { status: 400 });
    if (!audio) return NextResponse.json({ error: "audio required" }, { status: 400 });

    const ext = (audio.type.split("/")[1] ?? "webm").split(";")[0];
    const key = `${user.id}/${encounter_id}/${Date.now()}.${ext}`;
    const buf = new Uint8Array(await audio.arrayBuffer());

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buf, {
      contentType: audio.type, upsert: false
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: c, error: cErr } = await supabase
      .from("consultations")
      .insert({
        encounter_id, owner_id: user.id, audio_path: key, status: "recorded"
      })
      .select("*").single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    return NextResponse.json({ consultation: c });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "internal error";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
