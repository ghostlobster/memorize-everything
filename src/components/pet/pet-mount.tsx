import { auth } from "@/lib/auth/config";
import { getOrCreatePet, getRecentChat } from "@/server/actions/pets";
import { PetCompanion } from "./pet-companion";

export async function PetMount() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const pet = await getOrCreatePet(session.user.id);
  const recent = await getRecentChat(pet.id, 8);
  const initialMessages = recent.map((m, i) => ({
    id: `s-${i}`,
    role: m.role,
    content: m.content,
  }));
  return <PetCompanion pet={pet} initialMessages={initialMessages} />;
}
