import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { auth, signIn, signOut } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PetStats } from "@/components/pet/pet-stats";
import { getOrCreatePet } from "@/server/actions/pets";

export async function SiteHeader() {
  const session = await auth();
  const pet = session?.user?.id
    ? await getOrCreatePet(session.user.id).catch(() => null)
    : null;

  const authForm = session?.user ? (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
        Sign out
      </Button>
    </form>
  ) : (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/" });
      }}
    >
      <Button type="submit" size="sm" className="w-full">
        Sign in
      </Button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <span>Memorize Everything</span>
        </Link>

        {/* Desktop nav — hidden on small screens */}
        <nav className="hidden items-center gap-2 text-sm sm:flex">
          <Link
            href="/review"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Due today
          </Link>
          <Link
            href="/progress"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Progress
          </Link>
          <Link
            href="/calendar"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Calendar
          </Link>
          <Link
            href="/decks/new"
            className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            New deck
          </Link>
          {pet && <PetStats pet={pet} compact />}
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <Button type="submit" size="sm">
                Sign in
              </Button>
            </form>
          )}
        </nav>

        {/* Mobile hamburger — visible only on small screens */}
        <div className="sm:hidden">
          <MobileNav authSlot={authForm} />
        </div>
      </div>
    </header>
  );
}
