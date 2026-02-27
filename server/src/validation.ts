import { z } from "zod";

const finiteNumber = z.number().finite();

export const pointSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
});

export const axisSchema = z
  .object({
    label: z.string().trim().min(1, "Axis label is required"),
    unit: z.string().trim().default(""),
    min: finiteNumber,
    max: finiteNumber,
    step: finiteNumber.positive("Step must be greater than 0"),
  })
  .superRefine((axis, ctx) => {
    if (axis.max <= axis.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Axis max must be greater than axis min",
        path: ["max"],
      });
    }
  });

const givenTableSchema = z
  .object({
    title: z.string().trim().optional(),
    headers: z.array(z.string().trim().min(1, "Header cannot be empty")).min(1),
    rows: z.array(z.array(z.union([z.string(), finiteNumber]))),
  })
  .superRefine((table, ctx) => {
    table.rows.forEach((row, rowIndex) => {
      if (row.length !== table.headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each row must match the number of headers",
          path: ["rows", rowIndex],
        });
      }
    });
  });

export const problemInputSchema = z
  .object({
    title: z.string().trim().min(3, "Title must have at least 3 characters"),
    question: z.string().trim().min(8, "Question must have at least 8 characters"),
    instructions: z.string().trim().default(""),
    graphType: z.enum(["scatter", "line"]),
    axis: z.object({
      x: axisSchema,
      y: axisSchema,
    }),
    givenTable: givenTableSchema.optional(),
    answer: z.object({
      points: z.array(pointSchema).min(1, "At least one answer point is required"),
      explanation: z.string().trim().min(10, "Explanation must have at least 10 characters"),
      steps: z.array(z.string().trim().min(1)).default([]),
    }),
  })
  .superRefine((problem, ctx) => {
    const uniquePoints = new Set<string>();

    problem.answer.points.forEach((point, index) => {
      if (point.x < problem.axis.x.min || point.x > problem.axis.x.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Point x value is outside the configured x-axis range",
          path: ["answer", "points", index, "x"],
        });
      }

      if (point.y < problem.axis.y.min || point.y > problem.axis.y.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Point y value is outside the configured y-axis range",
          path: ["answer", "points", index, "y"],
        });
      }

      const key = `${point.x}:${point.y}`;
      if (uniquePoints.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate points are not allowed in the official answer",
          path: ["answer", "points", index],
        });
      }
      uniquePoints.add(key);
    });
  });

export const submissionSchema = z.object({
  points: z.array(pointSchema).max(500, "Submission has too many points"),
});
