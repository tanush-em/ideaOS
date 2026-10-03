import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveProvider } from "@/providers/llm";
import type { GenerateResult, ProviderName } from "@/providers/llm/types";
import type { PipelineStage } from "@/types/database";
import type { z } from "zod";

export const SCHEMA_VERSION = "1.0";

export interface AgentExecutionContext {
  supabase: SupabaseClient;
  ideaId: string;
  projectId: string;
  userId: string;
  provider?: ProviderName | null;
  pipelineRunId?: string;
}

export interface AgentExecutionResult<T> {
  output: T;
  runId: string;
  provider: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
  estimatedCost: number;
}

export async function generateWithRetry<T>(
  providerName: ProviderName | null | undefined,
  system: string,
  user: string,
  schema: z.ZodType<T>,
  schemaName: string,
  temperature = 0.7
): Promise<GenerateResult<T>> {
  const provider = resolveProvider(providerName);

  try {
    return await provider.generate(
      { system, user, temperature },
      schema,
      schemaName
    );
  } catch (firstError) {
    const repairUser = `${user}\n\nPrevious attempt failed (${firstError instanceof Error ? firstError.message : "validation error"}). Return valid JSON matching the required schema exactly.`;
    return await provider.generate(
      { system, user: repairUser, temperature: 0.3 },
      schema,
      schemaName
    );
  }
}

export async function persistAgentRun<T>(
  ctx: AgentExecutionContext,
  params: {
    agentName: string;
    stage: PipelineStage;
    input: Record<string, unknown>;
    result: GenerateResult<T>;
    output: T;
  }
): Promise<string> {
  const { data: run, error } = await ctx.supabase
    .from("agent_runs")
    .insert({
      idea_id: ctx.ideaId,
      project_id: ctx.projectId,
      user_id: ctx.userId,
      agent_name: params.agentName,
      stage: params.stage,
      status: "completed",
      provider: params.result.provider,
      model: params.result.model,
      input: params.input,
      output: params.output,
      tokens_input: params.result.usage.inputTokens,
      tokens_output: params.result.usage.outputTokens,
      estimated_cost: params.result.estimatedCost,
      latency_ms: params.result.latencyMs,
      validation_passed: true,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !run) {
    throw new Error(error?.message ?? "Failed to persist agent run");
  }

  await ctx.supabase.from("agent_outputs").insert({
    agent_run_id: run.id,
    idea_id: ctx.ideaId,
    stage: params.stage,
    schema_version: SCHEMA_VERSION,
    data: params.output,
  });

  return run.id;
}

export async function persistStubRun(
  ctx: AgentExecutionContext,
  params: {
    agentName: string;
    stage: PipelineStage;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }
): Promise<string> {
  const { data: run, error } = await ctx.supabase
    .from("agent_runs")
    .insert({
      idea_id: ctx.ideaId,
      project_id: ctx.projectId,
      user_id: ctx.userId,
      agent_name: params.agentName,
      stage: params.stage,
      status: "completed",
      provider: "stub",
      model: "stub",
      input: params.input,
      output: params.output,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: 0,
      latency_ms: 0,
      validation_passed: true,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !run) {
    throw new Error(error?.message ?? "Failed to persist stub run");
  }

  await ctx.supabase.from("agent_outputs").insert({
    agent_run_id: run.id,
    idea_id: ctx.ideaId,
    stage: params.stage,
    schema_version: SCHEMA_VERSION,
    data: params.output,
  });

  return run.id;
}

export async function failAgentRun(
  ctx: AgentExecutionContext,
  params: {
    agentName: string;
    stage: PipelineStage;
    input: Record<string, unknown>;
    error: string;
  }
): Promise<void> {
  await ctx.supabase.from("agent_runs").insert({
    idea_id: ctx.ideaId,
    project_id: ctx.projectId,
    user_id: ctx.userId,
    agent_name: params.agentName,
    stage: params.stage,
    status: "failed",
    input: params.input,
    error: params.error,
    validation_passed: false,
    completed_at: new Date().toISOString(),
  });
}
