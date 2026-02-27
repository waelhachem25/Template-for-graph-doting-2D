import { nanoid } from "nanoid";
import type { Problem, ProblemInput, ProblemSummary } from "./types.js";

class ProblemStore {
  private readonly problems = new Map<string, Problem>();

  constructor() {
    this.seedDefaults();
  }

  listSummaries(): ProblemSummary[] {
    return Array.from(this.problems.values())
      .map((problem) => ({
        id: problem.id,
        title: problem.title,
        graphType: problem.graphType,
        createdAt: problem.createdAt,
        updatedAt: problem.updatedAt,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getById(id: string): Problem | undefined {
    return this.problems.get(id);
  }

  create(input: ProblemInput): Problem {
    const timestamp = new Date().toISOString();
    const id = nanoid(10);
    const problem: Problem = {
      ...input,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.problems.set(id, problem);
    return problem;
  }

  private seedDefaults(): void {
    if (this.problems.size > 0) {
      return;
    }

    this.create({
      title: "Lacrosse Games Scatter Plot",
      question:
        "This table shows the number of points the Slaters lacrosse team scored and fouls they had in each game last season. Make a scatter plot to show the data.",
      instructions: "Click to graph a point. Click the point again to delete it.",
      graphType: "scatter",
      axis: {
        x: {
          label: "Fouls",
          unit: "",
          min: 0,
          max: 10,
          step: 1,
        },
        y: {
          label: "Points",
          unit: "",
          min: 0,
          max: 10,
          step: 1,
        },
      },
      givenTable: {
        title: "Lacrosse games",
        headers: ["Fouls", "Points"],
        rows: [
          [4, 5],
          [6, 0],
          [1, 1],
          [2, 2],
          [0, 0],
          [4, 4],
          [5, 6],
          [1, 2],
        ],
      },
      answer: {
        points: [
          { x: 4, y: 5 },
          { x: 6, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 0, y: 0 },
          { x: 4, y: 4 },
          { x: 5, y: 6 },
          { x: 1, y: 2 },
        ],
        explanation:
          "Each row in the table is converted directly into a point where x = fouls and y = points. Plot every pair to complete the scatter graph.",
        steps: [
          "Read one row from the table at a time.",
          "Treat fouls as the x-coordinate.",
          "Treat points as the y-coordinate.",
          "Plot all coordinate pairs on the graph.",
        ],
      },
    });

    this.create({
      title: "Dog Show Line Graph",
      question:
        "A dog show enthusiast recorded the weight of the winning dog at recent dog shows. Use the data in the table to complete the line graph below.",
      instructions: "Click to select points on the graph in each year, then submit.",
      graphType: "line",
      axis: {
        x: {
          label: "Year",
          unit: "",
          min: 2011,
          max: 2020,
          step: 3,
        },
        y: {
          label: "Weight",
          unit: "kg",
          min: 0,
          max: 100,
          step: 10,
        },
      },
      givenTable: {
        title: "Weight of winning dog at a dog show",
        headers: ["Year", "Weight (kg)"],
        rows: [
          [2011, 20],
          [2014, 30],
          [2017, 10],
          [2020, 100],
        ],
      },
      answer: {
        points: [
          { x: 2011, y: 20 },
          { x: 2014, y: 30 },
          { x: 2017, y: 10 },
          { x: 2020, y: 100 },
        ],
        explanation:
          "Match each year with its recorded weight and then connect the plotted points from left to right to form the line graph.",
        steps: [
          "Place points at each year/weight pair from the table.",
          "Confirm there is exactly one point per year.",
          "Connect the points in ascending year order.",
        ],
      },
    });
  }
}

export const problemStore = new ProblemStore();
