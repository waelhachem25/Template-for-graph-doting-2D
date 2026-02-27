import type { EvaluationResult, Point, Problem } from "./types.js";

const POINT_PRECISION = 6;

function round(value: number): number {
  return Number(value.toFixed(POINT_PRECISION));
}

function normalizePoints(points: Point[]): Point[] {
  const map = new Map<string, Point>();

  for (const point of points) {
    const normalizedPoint = { x: round(point.x), y: round(point.y) };
    map.set(pointKey(normalizedPoint), normalizedPoint);
  }

  return Array.from(map.values()).sort(sortByCoordinates);
}

function sortByCoordinates(a: Point, b: Point): number {
  if (a.x !== b.x) {
    return a.x - b.x;
  }
  return a.y - b.y;
}

function pointKey(point: Point): string {
  return `${point.x}:${point.y}`;
}

export function evaluateSubmission(problem: Problem, submittedPoints: Point[]): EvaluationResult {
  const expectedPoints = normalizePoints(problem.answer.points);
  const normalizedSubmission = normalizePoints(submittedPoints);

  const expectedKeys = new Set(expectedPoints.map(pointKey));
  const submissionKeys = new Set(normalizedSubmission.map(pointKey));

  const missingPoints = expectedPoints.filter((point) => !submissionKeys.has(pointKey(point)));
  const unexpectedPoints = normalizedSubmission.filter((point) => !expectedKeys.has(pointKey(point)));
  const isCorrect = missingPoints.length === 0 && unexpectedPoints.length === 0;

  const summary = isCorrect
    ? "Correct answer. The plotted points match the official graph."
    : "Incorrect answer. Review the missing and unexpected points.";

  return {
    isCorrect,
    summary,
    missingPoints,
    unexpectedPoints,
    submittedPoints: normalizedSubmission,
    expectedPoints,
    correctAnswer: isCorrect
      ? undefined
      : {
          points: expectedPoints,
          explanation: problem.answer.explanation,
          steps: problem.answer.steps,
        },
  };
}
