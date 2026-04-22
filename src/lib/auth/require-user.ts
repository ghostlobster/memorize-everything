import { redirect } from "next/navigation";
import { auth } from "./config";

/**
 * Server-side helper: returns the current user or redirects home.
 * Use at the top of any route that must be authenticated.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return session.user as { id: string; name?: string | null; email?: string | null; image?: string | null };
}

export async function getUser() {
  const session = await auth();
  return session?.user ?? null;
}
