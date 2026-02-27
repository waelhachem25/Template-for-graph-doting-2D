import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { evaluateSubmission } from "./evaluator.js";
import { problemStore } from "./store.js";
import { problemInputSchema, submissionSchema } from "./validation.js";

export const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/problems", (_req, res) => {
  res.json({
    items: problemStore.listSummaries(),
  });
});

app.get("/api/problems/:id", (req, res) => {
  const problem = problemStore.getById(req.params.id);
  if (!problem) {
    res.status(404).json({
      message: "Problem not found",
    });
    return;
  }

  res.json({
    item: problem,
  });
});

app.post("/api/problems", (req, res) => {
  const parsed = problemInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid problem payload",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const createdProblem = problemStore.create(parsed.data);
  res.status(201).json({
    item: createdProblem,
  });
});

app.post("/api/problems/:id/evaluate", (req, res) => {
  const problem = problemStore.getById(req.params.id);
  if (!problem) {
    res.status(404).json({
      message: "Problem not found",
    });
    return;
  }

  const parsedSubmission = submissionSchema.safeParse(req.body);
  if (!parsedSubmission.success) {
    res.status(400).json({
      message: "Invalid submission payload",
      errors: parsedSubmission.error.flatten(),
    });
    return;
  }

  const result = evaluateSubmission(problem, parsedSubmission.data.points);
  res.json({
    item: result,
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      errors: error.flatten(),
    });
    return;
  }

  console.error("Unexpected server error", error);
  res.status(500).json({
    message: "Unexpected server error",
  });
});
