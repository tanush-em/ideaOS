export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PipelineStage =
  | "intake"
  | "brainstorm"
  | "expansion"
  | "critic"
  | "web_scout"
  | "market_analyst"
  | "refiner"
  | "evaluator"
  | "blueprint";

export type AgentRunStatus = "pending" | "running" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  project_id: string;
  user_id: string;
  parent_id: string | null;
  branch_reason: string | null;
  title: string;
  raw_input: string | null;
  current_stage: PipelineStage;
  is_root: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  idea_id: string;
  project_id: string;
  user_id: string;
  agent_name: string;
  stage: PipelineStage;
  status: AgentRunStatus;
  provider: string | null;
  model: string | null;
  input: Json | null;
  output: Json | null;
  error: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  estimated_cost: number | null;
  latency_ms: number | null;
  validation_passed: boolean | null;
  created_at: string;
  completed_at: string | null;
}

export interface AgentOutput {
  id: string;
  agent_run_id: string;
  idea_id: string;
  stage: PipelineStage;
  schema_version: string;
  data: Json;
  created_at: string;
}

export interface ProjectWithStats extends Project {
  idea_count: number;
  branch_count: number;
}

export type PipelineRunStatus =
  | "pending"
  | "running"
  | "awaiting_research_approval"
  | "completed"
  | "failed";

export interface PipelineRun {
  id: string;
  idea_id: string;
  project_id: string;
  user_id: string;
  status: PipelineRunStatus;
  current_stage: PipelineStage;
  provider: string | null;
  total_cost: number | null;
  total_tokens_input: number | null;
  total_tokens_output: number | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}
