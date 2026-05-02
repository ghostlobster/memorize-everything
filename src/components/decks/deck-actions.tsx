"use client";

import { useState, useTransition } from "react";
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
  FolderInput,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import {
  deleteDeckAction,
  archiveDeckAction,
  unarchiveDeckAction,
} from "@/server/actions/decks";
import { moveDeckToGroupAction } from "@/server/actions/groups";
import type { GroupSummary } from "@/server/actions/groups";

interface DeckActionsProps {
  deckId: string;
  isArchived: boolean;
  currentGroupId?: string | null;
  allGroups?: GroupSummary[];
}

export function DeckActions({
  deckId,
  isArchived,
  currentGroupId = null,
  allGroups = [],
}: DeckActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => archiveDeckAction(deckId));
  }

  function handleUnarchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => unarchiveDeckAction(deckId));
  }

  function handleDeleteConfirm() {
    startTransition(() => deleteDeckAction(deckId));
  }

  function handleMoveToGroup(groupId: string | null) {
    startTransition(() => moveDeckToGroupAction(deckId, groupId));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Deck actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isArchived ? (
            <DropdownMenuItem onClick={handleUnarchive}>
              <ArchiveRestore className="h-4 w-4" />
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          {allGroups.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4" />
                Move to group
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {allGroups.map((g) => (
                  <DropdownMenuItem
                    key={g.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveToGroup(g.id);
                    }}
                  >
                    {currentGroupId === g.id && (
                      <Check className="h-3.5 w-3.5 mr-1 shrink-0" />
                    )}
                    {g.name}
                  </DropdownMenuItem>
                ))}
                {currentGroupId !== null && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMoveToGroup(null);
                      }}
                    >
                      Remove from group
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the deck and all its cards and review
              history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
