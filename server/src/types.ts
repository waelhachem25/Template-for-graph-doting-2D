export type GraphType = "scatter" | "line";

export interface AxisConfig {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export interface AxisPairConfig {
  x: AxisConfig;
  y: AxisConfig;
}

export interface Point {
  x: number;
  y: number;
}

export interface GivenTable {
  title?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export interface ProblemAnswer {
  points: Point[];
  explanation: string;
  steps: string[];
}

export interface ProblemInput {
  title: string;
  question: string;
  instructions: string;
  graphType: GraphType;
  axis: AxisPairConfig;
  givenTable?: GivenTable;
  answer: ProblemAnswer;
}

export interface Problem extends ProblemInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionInput {
  points: Point[];
}

export interface EvaluationResult {
  isCorrect: boolean;
  summary: string;
  missingPoints: Point[];
  unexpectedPoints: Point[];
  submittedPoints: Point[];
  expectedPoints: Point[];
  correctAnswer?: {
    points: Point[];
    explanation: string;
    steps: string[];
  };
}

export interface ProblemSummary {
  id: string;
  title: string;
  graphType: GraphType;
  createdAt: string;
  updatedAt: string;
}
