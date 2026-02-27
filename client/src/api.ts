import type { EvaluationResult, Point, Problem, ProblemInput, ProblemSummary } from "./types";

const API_BASE = "/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function listProblems(): Promise<ProblemSummary[]> {
  const response = await fetchJson<{ items: ProblemSummary[] }>("/problems");
  return response.items;
}

export async function getProblem(problemId: string): Promise<Problem> {
  const response = await fetchJson<{ item: Problem }>(`/problems/${problemId}`);
  return response.item;
}

export async function createProblem(input: ProblemInput): Promise<Problem> {
  const response = await fetchJson<{ item: Problem }>("/problems", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.item;
}

export async function evaluateProblem(problemId: string, points: Point[]): Promise<EvaluationResult> {
  const response = await fetchJson<{ item: EvaluationResult }>(`/problems/${problemId}/evaluate`, {
    method: "POST",
    body: JSON.stringify({ points }),
  });
  return response.item;
}
