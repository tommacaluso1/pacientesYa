import { NextResponse, type NextRequest } from "next/server";
import { evaluateEncounter } from "@/lib/domain/alerts";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { encounter_id } = await req.json();
  if (!encounter_id) return NextResponse.json({ error: "encounter_id required" }, { status: 400 });
  await evaluateEncounter(encounter_id);
  return NextResponse.json({ ok: true });
}
