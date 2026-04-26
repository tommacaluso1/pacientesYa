import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  const { supabase, user } = await requireUser();
  if (!path.startsWith(`${user.id}/`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await supabase.storage.from("clinical").createSignedUrl(path, 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
