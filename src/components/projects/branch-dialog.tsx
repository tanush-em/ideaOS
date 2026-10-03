"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function BranchDialog({ ideaId, branchCount }: { ideaId: string; branchCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reason, setReason] = useState("");
  const [title, setTitle] = useState("");

  async function createBranch() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Add a branch reason (why do you want this fork?)");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_reason: trimmedReason,
          title: title.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create branch");

      toast.success("Branch created");
      setOpen(false);
      setReason("");
      setTitle("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={creating}>
        <GitBranch className="size-4" />
        Branch
        <span className="ml-1 text-[10px] text-muted-foreground">
          ({branchCount})
        </span>
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an idea branch</DialogTitle>
          <DialogDescription>
            Fork the active idea into a new direction (e.g. B2B vs B2C, AI-first vs marketplace).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="branch-title">Branch title (optional)</Label>
            <Input
              id="branch-title"
              placeholder="e.g. FreelancerOS — B2B version"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-reason">Branch reason</Label>
            <Textarea
              id="branch-reason"
              placeholder="Why are you forking this idea? What angle are you testing?"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={createBranch} disabled={creating || !reason.trim()}>
            {creating ? "Creating…" : (
              <>
                <Plus className="size-4 mr-2" />
                Create branch
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

