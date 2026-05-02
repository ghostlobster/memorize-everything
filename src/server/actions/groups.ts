"use server";

import { revalidatePath } from "next/cache";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deckGroups, decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export type GroupSummary = { id: string; name: string; position: number };

export async function listUserGroups(userId: string): Promise<GroupSummary[]> {
  return db
    .select({ id: deckGroups.id, name: deckGroups.name, position: deckGroups.position })
    .from(deckGroups)
    .where(eq(deckGroups.userId, userId))
    .orderBy(asc(deckGroups.position), asc(deckGroups.createdAt));
}

export async function createGroupAction(name: string): Promise<{ id: string }> {
  const user = await requireUser();
  const [inserted] = await db
    .insert(deckGroups)
    .values({ userId: user.id, name: name.trim() || "New group" })
    .returning();
  if (!inserted) throw new Error("Failed to create group");
  revalidatePath("/");
  return { id: inserted.id };
}

export async function renameGroupAction(groupId: string, name: string): Promise<void> {
  const user = await requireUser();
  await db
    .update(deckGroups)
    .set({ name: name.trim() || "New group" })
    .where(and(eq(deckGroups.id, groupId), eq(deckGroups.userId, user.id)));
  revalidatePath("/");
}

export async function deleteGroupAction(groupId: string): Promise<void> {
  const user = await requireUser();
  // ON DELETE SET NULL on decks.groupId handles orphaned decks automatically
  await db
    .delete(deckGroups)
    .where(and(eq(deckGroups.id, groupId), eq(deckGroups.userId, user.id)));
  revalidatePath("/");
}

export async function moveDeckToGroupAction(
  deckId: string,
  groupId: string | null,
): Promise<void> {
  const user = await requireUser();
  await db
    .update(decks)
    .set({ groupId })
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)));
  revalidatePath("/");
}
