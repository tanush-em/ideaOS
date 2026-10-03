"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function DemoProjectButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create demo");

      toast.success("Demo project created");
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={createDemo} disabled={loading}>
      <Sparkles className="size-4 mr-2" />
      {loading ? "Creating…" : "Create demo project"}
    </Button>
  );
}

