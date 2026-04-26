import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { getServerClient } from "@/lib/supabase/server";

export async function TopBar() {
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Stethoscope className="h-5 w-5" />
          <span>pacientesYa</span>
        </Link>
        {user ? (
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-muted-foreground hover:text-foreground">Salir</button>
          </form>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Ingresar</Link>
        )}
      </div>
    </header>
  );
}
