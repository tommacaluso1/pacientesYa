import { NextResponse } from "next/server";
import { processConsultation } from "@/lib/ai/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await processConsultation(params.id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "process failed";
    const code = msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
