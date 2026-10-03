import type { SupabaseClient } from "@supabase/supabase-js";
import { runIntakeAgent } from "@/agents/intake/run";
import { runBrainstormForPipeline } from "@/agents/brainstorm/run";
import { runExpansionAgent } from "@/agents/expansion/run";
import { runCriticAgent } from "@/agents/critic/run";
import { runWebScoutAgent } from "@/agents/web_scout/run";
import { runMarketAnalystAgent } from "@/agents/market_analyst/run";
import { runRefinerAgent } from "@/agents/refiner/run";
import { runBlueprintAgent } from "@/agents/blueprint/run";
import {
  failAgentRun,
  type AgentExecutionContext,
} from "@/lib/agents/execute";
import type { PipelineStage } from "@/types/database";
import type { ProviderName } from "@/providers/llm/types";

export interface PipelineRunInput {
  supabase: SupabaseClient;
  pipelineRunId: string;
  ideaId: string;
  projectId: string;
  userId: string;
  rawInput: string;
  provider?: ProviderName | null;
}

type CostAccumulator = {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
};

function addCost(acc: CostAccumulator, result: {
  estimatedCost: number;
  usage: { inputTokens: number; outputTokens: number };
}) {
  acc.totalCost += result.estimatedCost;
  acc.inputTokens += result.usage.inputTokens;
  acc.outputTokens += result.usage.outputTokens;
}

export async function executePipeline(input: PipelineRunInput): Promise<void> {
  const { supabase, pipelineRunId } = input;
  const costs: CostAccumulator = { totalCost: 0, inputTokens: 0, outputTokens: 0 };
  let lastStage: PipelineStage = "intake";

  const ctx: AgentExecutionContext = {
    supabase: input.supabase,
    ideaId: input.ideaId,
    projectId: input.projectId,
    userId: input.userId,
    provider: input.provider,
    pipelineRunId,
  };

  async function updatePipeline(
    stage: PipelineStage,
    status: "running" | "completed" | "failed",
    extra?: { error?: string; costs?: CostAccumulator }
  ) {
    const update: Record<string, unknown> = {
      current_stage: stage,
      status,
    };
    if (extra?.costs) {
      update.total_cost = extra.costs.totalCost;
      update.total_tokens_input = extra.costs.inputTokens;
      update.total_tokens_output = extra.costs.outputTokens;
    }
    if (extra?.error) update.error = extra.error;
    if (status === "completed" || status === "failed") {
      update.completed_at = new Date().toISOString();
    }
    await supabase
      .from("pipeline_runs")
      .update(update)
      .eq("id", pipelineRunId);
  }

  async function updateIdeaStage(stage: PipelineStage) {
    await supabase
      .from("ideas")
      .update({ current_stage: stage })
      .eq("id", input.ideaId);
  }

  try {
    // Stage 1: Intake
    lastStage = "intake";
    await updatePipeline("intake", "running");
    await updateIdeaStage("intake");
    const intakeResult = await runIntakeAgent(ctx, input.rawInput);
    addCost(costs, intakeResult);

    // Stage 2: Brainstorm
    lastStage = "brainstorm";
    await updatePipeline("brainstorm", "running");
    await updateIdeaStage("brainstorm");
    const brainstormResult = await runBrainstormForPipeline(ctx, input.rawInput);
    addCost(costs, brainstormResult);

    // Stage 3: Expansion
    lastStage = "expansion";
    await updatePipeline("expansion", "running");
    await updateIdeaStage("expansion");
    const expansionResult = await runExpansionAgent(
      ctx,
      intakeResult.output,
      brainstormResult.output
    );
    addCost(costs, expansionResult);

    // Stage 4: Critic
    lastStage = "critic";
    await updatePipeline("critic", "running");
    await updateIdeaStage("critic");
    const criticResult = await runCriticAgent(ctx, expansionResult.output);
    addCost(costs, criticResult);

    // Pause before web research to implement human approval gate.
    await updateIdeaStage("web_scout");
    await supabase
      .from("pipeline_runs")
      .update({
        status: "awaiting_research_approval",
        current_stage: "web_scout",
        total_cost: costs.totalCost,
        total_tokens_input: costs.inputTokens,
        total_tokens_output: costs.outputTokens,
        completed_at: new Date().toISOString(),
      })
      .eq("id", pipelineRunId);

    // Persist enough context to resume from the same idea state.
    await supabase
      .from("ideas")
      .update({ current_stage: "web_scout" })
      .eq("id", input.ideaId);

    // Store pipeline context in agent_runs via existing stage outputs:
    // expansion_result + critic_result are already stored as agent_runs outputs.
    // Resume stage fetches them from agent_runs.
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    await failAgentRun(ctx, {
      agentName: "pipeline",
      stage: lastStage,
      input: { raw_input: input.rawInput },
      error: message,
    });
    await updatePipeline(lastStage, "failed", { error: message, costs });
  }
}

// Continue pipeline from the Web Scout stage onward.
export async function continuePipelineFromResearch(input: PipelineRunInput): Promise<void> {
  const { supabase, pipelineRunId } = input;
  let lastStage: PipelineStage = "web_scout";

  const costs: CostAccumulator = { totalCost: 0, inputTokens: 0, outputTokens: 0 };

  // Load latest stored outputs for each required stage from agent_runs.
  const ctx: AgentExecutionContext = {
    supabase,
    ideaId: input.ideaId,
    projectId: input.projectId,
    userId: input.userId,
    provider: input.provider,
    pipelineRunId,
  };

  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("idea_id", input.ideaId)
    .order("created_at", { ascending: false });

  if (!runs) throw new Error("No agent runs found to resume pipeline");

  const getCompletedOutput = <T,>(stage: PipelineStage): T => {
    const run = runs.find((r) => r.stage === stage && r.status === "completed");
    if (!run || !run.output) throw new Error(`Missing completed output for ${stage}`);
    return run.output as T;
  };

  const expansionResult = getCompletedOutput<any>("expansion");
  const criticResult = getCompletedOutput<any>("critic");

  // Stage 5: Web Scout
  lastStage = "web_scout";
  await supabase
    .from("pipeline_runs")
    .update({ status: "running", current_stage: "web_scout" })
    .eq("id", pipelineRunId);
  await updateIdeaStageFor(ctx, input.ideaId, "web_scout");

  const webScoutResult = await runWebScoutAgent(ctx, expansionResult);
  addCostsFromRun(costs, webScoutResult);

  // Stage 6: Market Analyst
  lastStage = "market_analyst";
  await supabase
    .from("pipeline_runs")
    .update({ status: "running", current_stage: "market_analyst" })
    .eq("id", pipelineRunId);
  await updateIdeaStageFor(ctx, input.ideaId, "market_analyst");

  const marketAnalystResult = await runMarketAnalystAgent(
    ctx,
    expansionResult,
    criticResult,
    webScoutResult.output
  );
  addCostsFromRun(costs, marketAnalystResult);

  // Stage 7: Refiner
  lastStage = "refiner";
  await supabase
    .from("pipeline_runs")
    .update({ status: "running", current_stage: "refiner" })
    .eq("id", pipelineRunId);
  await updateIdeaStageFor(ctx, input.ideaId, "refiner");

  const refinerResult = await runRefinerAgent(
    ctx,
    expansionResult,
    criticResult,
    webScoutResult.output,
    marketAnalystResult.output
  );
  addCostsFromRun(costs, refinerResult);

  // Stage 8: Blueprint
  lastStage = "blueprint";
  await supabase
    .from("pipeline_runs")
    .update({ status: "running", current_stage: "blueprint" })
    .eq("id", pipelineRunId);
  await updateIdeaStageFor(ctx, input.ideaId, "blueprint");

  const blueprintResult = await runBlueprintAgent(
    ctx,
    expansionResult,
    criticResult,
    refinerResult.output,
    marketAnalystResult.output
  );
  addCostsFromRun(costs, blueprintResult);

  await updateIdeaStageFor(ctx, input.ideaId, "blueprint");
  await supabase
    .from("pipeline_runs")
    .update({
      status: "completed",
      current_stage: "blueprint",
      completed_at: new Date().toISOString(),
      total_cost: costs.totalCost,
      total_tokens_input: costs.inputTokens,
      total_tokens_output: costs.outputTokens,
    })
    .eq("id", pipelineRunId);

  await supabase
    .from("ideas")
    .update({ title: blueprintResult.output.productName })
    .eq("id", input.ideaId);
}

function addCostsFromRun(
  acc: CostAccumulator,
  result: { estimatedCost: number; usage: { inputTokens: number; outputTokens: number } }
) {
  acc.totalCost += result.estimatedCost;
  acc.inputTokens += result.usage.inputTokens;
  acc.outputTokens += result.usage.outputTokens;
}

async function updateIdeaStageFor(ctx: AgentExecutionContext, ideaId: string, stage: PipelineStage) {
  await ctx.supabase.from("ideas").update({ current_stage: stage }).eq("id", ideaId);
}
