"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import type { Idea } from "@/types/database";

export function IdeaGraph({
  rootIdeaId,
  ideas,
  activeIdeaId,
  onSelect,
}: {
  rootIdeaId: string;
  ideas: Idea[];
  activeIdeaId: string;
  onSelect: (ideaId: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const root = ideas.find((i) => i.id === rootIdeaId);
    const branches = ideas
      .filter((i) => i.parent_id === rootIdeaId)
      .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));

    const nodes: Node[] = [];
    if (root) {
      nodes.push({
        id: root.id,
        position: { x: 0, y: 0 },
        data: { label: root.title, badge: "root" },
        draggable: false,
        selected: root.id === activeIdeaId,
      });
    }

    branches.forEach((b, idx) => {
      nodes.push({
        id: b.id,
        position: { x: 260, y: idx * 160 },
        data: { label: b.title, badge: "branch" },
        draggable: false,
        selected: b.id === activeIdeaId,
      });
    });

    const edges: Edge[] = branches
      .map((b) => ({
        id: `${rootIdeaId}-${b.id}`,
        source: rootIdeaId,
        target: b.id,
        animated: false,
      }))
      .filter(Boolean) as Edge[];

    return { nodes, edges };
  }, [activeIdeaId, ideas, rootIdeaId]);

  return (
    <div className="h-[420px] w-full rounded-xl border border-border/60 bg-background/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_evt, node) => onSelect(String(node.id))}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

