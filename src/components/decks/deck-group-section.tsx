"use client";

import { useState, useTransition } from "react";
import { Folder, FolderOpen, Pencil, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";
import { renameGroupAction, deleteGroupAction } from "@/server/actions/groups";
import type { GroupSummary } from "@/server/actions/groups";
import type { DeckSummary } from "@/components/decks/deck-selector-grid";

interface DeckGroupSectionProps {
  group: GroupSummary | null;
  decks: DeckSummary[];
  selected: Set<string>;
  children: React.ReactNode;
}

export function DeckGroupSection({
  group,
  decks,
  selected,
  children,
}: DeckGroupSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group?.name ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const totalCards = decks.reduce((n, d) => n + d.cardCount, 0);
  const totalDue = decks.reduce((n, d) => n + d.dueCount, 0);
  const selectedInSection = decks.filter((d) => selected.has(d.id)).length;

  function commitRename() {
    if (!group) return;
    const name = draftName.trim() || group.name;
    setEditing(false);
    startTransition(() => renameGroupAction(group.id, name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setDraftName(group?.name ?? "");
      setEditing(false);
    }
  }

  function handleDeleteConfirm() {
    if (!group) return;
    startTransition(() => deleteGroupAction(group.id));
  }

  if (decks.length === 0 && group === null) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {group === null ? (
          <>
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Ungrouped
            </span>
          </>
        ) : editing ? (
          <>
            <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={commitRename}
              disabled={pending}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setDraftName(group.name);
                setEditing(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Folder className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium">{group.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={() => {
                setDraftName(group.name);
                setEditing(true);
              }}
              aria-label="Rename group"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {totalDue > 0 && (
            <Badge variant="warning" className="text-xs">
              {totalDue} due
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {totalCards} card{totalCards !== 1 ? "s" : ""}
          </Badge>
          {selectedInSection > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedInSection} selected
            </Badge>
          )}
          {group !== null && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Group actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setDraftName(group.name);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">{children}</div>

      {group !== null && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{group.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>
                {decks.length > 0
                  ? `${decks.length} deck${decks.length !== 1 ? "s" : ""} will move to Ungrouped. The decks themselves are not deleted.`
                  : "The group is empty and will be removed."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteConfirm}
              >
                Delete group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}
