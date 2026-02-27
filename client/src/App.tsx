import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createProblem, evaluateProblem, getProblem, listProblems } from "./api";
import { GraphBoard } from "./components/GraphBoard";
import type { EvaluationResult, GivenTable, Point, Problem, ProblemInput, ProblemSummary } from "./types";

const defaultProblemDraft: ProblemInput = {
  title: "Lacrosse Games Scatter Plot",
  question:
    "This table shows the number of points the Slaters lacrosse team scored and the number of fouls they had in each game last season. Make a scatter plot to show the data.",
  instructions: "Click to graph a point. Click the point again to delete it.",
  graphType: "scatter",
  axis: {
    x: { label: "Fouls", unit: "", min: 0, max: 10, step: 1 },
    y: { label: "Points", unit: "", min: 0, max: 10, step: 1 },
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
      "Each row in the table gives one coordinate pair. Plot every (Fouls, Points) pair to complete the scatter graph.",
    steps: [
      "Read one row from the table.",
      "Use the first value for x (fouls).",
      "Use the second value for y (points).",
      "Repeat until all rows are plotted.",
    ],
  },
};

const DEFAULT_TABLE_TITLE = "Lacrosse games";
const DEFAULT_TABLE_HEADERS = "Fouls,Points";
const DEFAULT_TABLE_ROWS = "4,5\n6,0\n1,1\n2,2\n0,0\n4,4\n5,6\n1,2";

const EPSILON = 0.000001;

function sortPoints(points: Point[]): Point[] {
  return [...points].sort((a, b) => {
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function parseTable(title: string, headersText: string, rowsText: string): GivenTable | undefined {
  const headers = headersText
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (headers.length === 0) {
    return undefined;
  }

  const rows = rowsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      line.split(",").map((cell) => {
        const trimmed = cell.trim();
        const numericValue = Number(trimmed);
        return Number.isFinite(numericValue) && trimmed !== "" ? numericValue : trimmed;
      }),
    );

  rows.forEach((row, rowIndex) => {
    if (row.length !== headers.length) {
      throw new Error(`Table row ${rowIndex + 1} does not match the number of headers.`);
    }
  });

  return {
    title: title.trim(),
    headers,
    rows,
  };
}

function pointsToText(points: Point[]): string {
  return points.map((point) => `(${point.x}, ${point.y})`).join(", ");
}

function isTruthyQueryValue(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return value === "1" || value.toLowerCase() === "true";
}

function getLaunchConfig(): { mode: "author" | "student"; studentOnly: boolean; preferredProblemId: string } {
  if (typeof window === "undefined") {
    return {
      mode: "author",
      studentOnly: false,
      preferredProblemId: "",
    };
  }

  const search = new URLSearchParams(window.location.search);
  const studentOnly = isTruthyQueryValue(search.get("studentOnly"));
  const mode = search.get("mode") === "student" || studentOnly ? "student" : "author";

  return {
    mode,
    studentOnly,
    preferredProblemId: search.get("problemId")?.trim() ?? "",
  };
}

function App() {
  const launchConfig = useMemo(() => getLaunchConfig(), []);
  const [mode, setMode] = useState<"author" | "student">(launchConfig.mode);
  const [draft, setDraft] = useState<ProblemInput>(defaultProblemDraft);
  const [tableTitle, setTableTitle] = useState(DEFAULT_TABLE_TITLE);
  const [tableHeadersText, setTableHeadersText] = useState(DEFAULT_TABLE_HEADERS);
  const [tableRowsText, setTableRowsText] = useState(DEFAULT_TABLE_ROWS);
  const [stepsText, setStepsText] = useState(defaultProblemDraft.answer.steps.join("\n"));
  const [answerPointInput, setAnswerPointInput] = useState<Point>({
    x: defaultProblemDraft.axis.x.min,
    y: defaultProblemDraft.axis.y.min,
  });

  const [problemList, setProblemList] = useState<ProblemSummary[]>([]);
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [studentPoints, setStudentPoints] = useState<Point[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const [authorMessage, setAuthorMessage] = useState<string>("");
  const [studentMessage, setStudentMessage] = useState<string>("");
  const [shareMessage, setShareMessage] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingProblem, setIsLoadingProblem] = useState(false);

  const activeMode = launchConfig.studentOnly ? "student" : mode;
  const problemId = activeProblem?.id ?? "";
  const problemTitle = activeProblem?.title ?? "No problem loaded";

  const currentExpectedPoints = useMemo(() => sortPoints(draft.answer.points), [draft.answer.points]);
  const listedProblemOptions = useMemo(
    () =>
      problemList.map((problem) => ({
        value: problem.id,
        label: `${problem.title} (${problem.graphType})`,
      })),
    [problemList],
  );

  useEffect(() => {
    async function initializeProblems(): Promise<void> {
      try {
        const items = await listProblems();
        setProblemList(items);

        if (items.length === 0) {
          setActiveProblem(null);
          return;
        }

        const initialProblemId =
          launchConfig.preferredProblemId && items.some((item) => item.id === launchConfig.preferredProblemId)
            ? launchConfig.preferredProblemId
            : items[0].id;
        const initialProblem = await getProblem(initialProblemId);
        setActiveProblem(initialProblem);
      } catch (error) {
        setStudentMessage(error instanceof Error ? error.message : "Failed to load problem list.");
      }
    }

    void initializeProblems();
  }, [launchConfig.preferredProblemId]);

  async function refreshProblemList(): Promise<void> {
    try {
      const items = await listProblems();
      setProblemList(items);

      if (items.length > 0 && !activeProblem) {
        const preferredProblemId =
          launchConfig.preferredProblemId && items.some((item) => item.id === launchConfig.preferredProblemId)
            ? launchConfig.preferredProblemId
            : items[0].id;
        await loadProblem(preferredProblemId);
      }
    } catch (error) {
      setStudentMessage(error instanceof Error ? error.message : "Failed to load problem list.");
    }
  }

  async function loadProblem(id: string): Promise<void> {
    if (!id) {
      return;
    }

    setIsLoadingProblem(true);
    setStudentMessage("");
    setEvaluation(null);
    setStudentPoints([]);

    try {
      const problem = await getProblem(id);
      setActiveProblem(problem);
    } catch (error) {
      setStudentMessage(error instanceof Error ? error.message : "Failed to load problem.");
    } finally {
      setIsLoadingProblem(false);
    }
  }

  function addExpectedPointFromInputs(): void {
    const nextPoint = {
      x: Number(answerPointInput.x),
      y: Number(answerPointInput.y),
    };

    if (!Number.isFinite(nextPoint.x) || !Number.isFinite(nextPoint.y)) {
      setAuthorMessage("Point values must be valid numbers.");
      return;
    }

    const exists = currentExpectedPoints.some((point) => samePoint(point, nextPoint));
    if (exists) {
      setAuthorMessage("This point already exists in the answer.");
      return;
    }

    setDraft((previous) => ({
      ...previous,
      answer: {
        ...previous.answer,
        points: sortPoints([...previous.answer.points, nextPoint]),
      },
    }));
    setAuthorMessage("");
  }

  function removeExpectedPoint(indexToRemove: number): void {
    setDraft((previous) => ({
      ...previous,
      answer: {
        ...previous.answer,
        points: previous.answer.points.filter((_, index) => index !== indexToRemove),
      },
    }));
  }

  function handleExpectedPointsGraphChange(nextPoints: Point[]): void {
    setDraft((previous) => ({
      ...previous,
      answer: {
        ...previous.answer,
        points: sortPoints(nextPoints),
      },
    }));
    setAuthorMessage("");
  }

  async function handleCreateProblem(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthorMessage("");
    setIsCreating(true);

    try {
      const givenTable = parseTable(tableTitle, tableHeadersText, tableRowsText);
      const payload: ProblemInput = {
        ...draft,
        givenTable,
        answer: {
          ...draft.answer,
          points: sortPoints(draft.answer.points),
          steps: stepsText
            .split("\n")
            .map((step) => step.trim())
            .filter((step) => step.length > 0),
        },
      };

      const created = await createProblem(payload);
      await refreshProblemList();
      setActiveProblem(created);
      setStudentPoints([]);
      setEvaluation(null);
      setMode("student");
      setAuthorMessage("Problem published successfully. It is now loaded in Student View.");
    } catch (error) {
      setAuthorMessage(error instanceof Error ? error.message : "Failed to create problem.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleEvaluateSubmission(): Promise<void> {
    if (!activeProblem) {
      setStudentMessage("No active problem selected.");
      return;
    }

    setIsEvaluating(true);
    setStudentMessage("");

    try {
      const result = await evaluateProblem(activeProblem.id, studentPoints);
      setEvaluation(result);
    } catch (error) {
      setStudentMessage(error instanceof Error ? error.message : "Failed to evaluate submission.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleCopyStudentViewLink(): Promise<void> {
    setShareMessage("");

    if (typeof window === "undefined") {
      return;
    }

    const studentLink = new URL(window.location.href);
    studentLink.searchParams.set("mode", "student");
    studentLink.searchParams.set("studentOnly", "1");

    if (activeProblem?.id) {
      studentLink.searchParams.set("problemId", activeProblem.id);
    } else {
      studentLink.searchParams.delete("problemId");
    }

    const urlToCopy = studentLink.toString();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        const fallbackCopyArea = document.createElement("textarea");
        fallbackCopyArea.value = urlToCopy;
        fallbackCopyArea.setAttribute("readonly", "true");
        fallbackCopyArea.style.position = "fixed";
        fallbackCopyArea.style.opacity = "0";
        document.body.append(fallbackCopyArea);
        fallbackCopyArea.select();
        document.execCommand("copy");
        fallbackCopyArea.remove();
      }

      setShareMessage("Student-only link copied.");
    } catch {
      setShareMessage(`Copy failed. Share this URL manually: ${urlToCopy}`);
    }
  }

  function handleAxisUpdate(axisKey: "x" | "y", field: "label" | "unit" | "min" | "max" | "step", value: string): void {
    setDraft((previous) => {
      const currentAxis = previous.axis[axisKey];
      if (field === "label" || field === "unit") {
        return {
          ...previous,
          axis: {
            ...previous.axis,
            [axisKey]: {
              ...currentAxis,
              [field]: value,
            },
          },
        };
      }

      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue)) {
        return previous;
      }

      return {
        ...previous,
        axis: {
          ...previous.axis,
          [axisKey]: {
            ...currentAxis,
            [field]: parsedValue,
          },
        },
      };
    });
  }

  function renderGivenTable(table?: GivenTable) {
    if (!table) {
      return null;
    }

    return (
      <div className="table-card">
        {table.title ? <h4>{table.title}</h4> : null}
        <table>
          <thead>
            <tr>
              {table.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row.join("-")}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Graph Doting 2D</p>
          <h1>Professional Graph Authoring and Assessment Template</h1>
          <p className="subtitle">
            Build custom graphing tasks, deliver them to learners, and automatically evaluate plotted answers by point
            position.
          </p>
        </div>
        <div className="hero-actions">
          <div className="mode-switch" role="tablist" aria-label="Application mode">
            {!launchConfig.studentOnly ? (
              <button
                className={activeMode === "author" ? "tab-button active" : "tab-button"}
                onClick={() => setMode("author")}
                type="button"
              >
                Authoring View
              </button>
            ) : null}
            <button
              className={activeMode === "student" ? "tab-button active" : "tab-button"}
              onClick={() => setMode("student")}
              type="button"
            >
              Student View
            </button>
          </div>

          {!launchConfig.studentOnly ? (
            <div className="share-tools">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleCopyStudentViewLink()}
                disabled={!activeProblem}
              >
                Copy Student View Link
              </button>
              {shareMessage ? <p className="status-line">{shareMessage}</p> : null}
            </div>
          ) : null}
        </div>
      </header>

      <main className="layout">
        {activeMode === "author" ? (
          <section className="card animate-in">
            <h2>Create Maths Problem</h2>
            <p className="panel-description">
              Configure the prompt, adaptive axes, official solution points, and explanation used by the evaluator.
            </p>

            <form onSubmit={handleCreateProblem} className="form-grid">
              <label>
                Problem title
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
                  required
                />
              </label>

              <label className="full-width">
                Given / question
                <textarea
                  value={draft.question}
                  onChange={(event) => setDraft((previous) => ({ ...previous, question: event.target.value }))}
                  rows={4}
                  required
                />
              </label>

              <label className="full-width">
                Student instruction
                <input
                  value={draft.instructions}
                  onChange={(event) => setDraft((previous) => ({ ...previous, instructions: event.target.value }))}
                />
              </label>

              <label>
                Graph type
                <select
                  value={draft.graphType}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, graphType: event.target.value as ProblemInput["graphType"] }))
                  }
                >
                  <option value="scatter">Scatter plot</option>
                  <option value="line">Line graph</option>
                </select>
              </label>

              <div className="axis-grid full-width">
                <fieldset>
                  <legend>X axis</legend>
                  <label>
                    Reference
                    <input
                      value={draft.axis.x.label}
                      onChange={(event) => handleAxisUpdate("x", "label", event.target.value)}
                    />
                  </label>
                  <label>
                    Unit
                    <input
                      value={draft.axis.x.unit}
                      onChange={(event) => handleAxisUpdate("x", "unit", event.target.value)}
                    />
                  </label>
                  <label>
                    Min
                    <input
                      type="number"
                      value={draft.axis.x.min}
                      onChange={(event) => handleAxisUpdate("x", "min", event.target.value)}
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      value={draft.axis.x.max}
                      onChange={(event) => handleAxisUpdate("x", "max", event.target.value)}
                    />
                  </label>
                  <label>
                    Step
                    <input
                      type="number"
                      value={draft.axis.x.step}
                      onChange={(event) => handleAxisUpdate("x", "step", event.target.value)}
                    />
                  </label>
                </fieldset>

                <fieldset>
                  <legend>Y axis</legend>
                  <label>
                    Reference
                    <input
                      value={draft.axis.y.label}
                      onChange={(event) => handleAxisUpdate("y", "label", event.target.value)}
                    />
                  </label>
                  <label>
                    Unit
                    <input
                      value={draft.axis.y.unit}
                      onChange={(event) => handleAxisUpdate("y", "unit", event.target.value)}
                    />
                  </label>
                  <label>
                    Min
                    <input
                      type="number"
                      value={draft.axis.y.min}
                      onChange={(event) => handleAxisUpdate("y", "min", event.target.value)}
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      value={draft.axis.y.max}
                      onChange={(event) => handleAxisUpdate("y", "max", event.target.value)}
                    />
                  </label>
                  <label>
                    Step
                    <input
                      type="number"
                      value={draft.axis.y.step}
                      onChange={(event) => handleAxisUpdate("y", "step", event.target.value)}
                    />
                  </label>
                </fieldset>
              </div>

              <div className="full-width grouped-section">
                <h3>Given data table (optional)</h3>
                <label>
                  Table title
                  <input value={tableTitle} onChange={(event) => setTableTitle(event.target.value)} />
                </label>
                <label>
                  Headers (comma separated)
                  <input value={tableHeadersText} onChange={(event) => setTableHeadersText(event.target.value)} />
                </label>
                <label>
                  Rows (one row per line, comma separated)
                  <textarea value={tableRowsText} onChange={(event) => setTableRowsText(event.target.value)} rows={5} />
                </label>
              </div>

              <div className="full-width grouped-section">
                <h3>Official answer points</h3>
                <div className="point-tools">
                  <label>
                    X
                    <input
                      type="number"
                      value={answerPointInput.x}
                      onChange={(event) =>
                        setAnswerPointInput((previous) => ({ ...previous, x: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      value={answerPointInput.y}
                      onChange={(event) =>
                        setAnswerPointInput((previous) => ({ ...previous, y: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <button type="button" className="secondary-button" onClick={addExpectedPointFromInputs}>
                    Add point
                  </button>
                </div>

                <p className="coordinate-line">{pointsToText(currentExpectedPoints)}</p>

                <div className="point-list">
                  {currentExpectedPoints.map((point, index) => (
                    <div className="point-chip" key={`${point.x}-${point.y}`}>
                      <span>
                        ({point.x}, {point.y})
                      </span>
                      <button type="button" onClick={() => removeExpectedPoint(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <GraphBoard
                  title={`${draft.title} - Official Answer`}
                  graphType={draft.graphType}
                  axis={draft.axis}
                  points={currentExpectedPoints}
                  onChange={handleExpectedPointsGraphChange}
                />
              </div>

              <label className="full-width">
                Correct answer explanation
                <textarea
                  value={draft.answer.explanation}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      answer: {
                        ...previous.answer,
                        explanation: event.target.value,
                      },
                    }))
                  }
                  rows={4}
                  required
                />
              </label>

              <label className="full-width">
                Steps to solve (one step per line)
                <textarea value={stepsText} onChange={(event) => setStepsText(event.target.value)} rows={4} />
              </label>

              <div className="form-actions full-width">
                <button type="submit" disabled={isCreating}>
                  {isCreating ? "Publishing..." : "Publish Problem"}
                </button>
                {authorMessage ? <p className="status-line">{authorMessage}</p> : null}
              </div>
            </form>
          </section>
        ) : (
          <section className="card animate-in">
            <h2>Student Graph Workspace</h2>
            <p className="panel-description">
              Select a problem, graph your answer, and submit to compare against the official solution.
            </p>

            <div className="student-toolbar">
              <label>
                Select problem
                <select value={problemId} onChange={(event) => void loadProblem(event.target.value)}>
                  <option value="" disabled>
                    Select a problem
                  </option>
                  {listedProblemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="secondary-button" onClick={() => void refreshProblemList()}>
                Refresh list
              </button>
            </div>

            {isLoadingProblem ? <p className="status-line">Loading problem...</p> : null}

            {activeProblem ? (
              <>
                <div className="problem-brief">
                  <h3>{problemTitle}</h3>
                  <p>{activeProblem.question}</p>
                  {activeProblem.instructions ? <p className="instruction-line">{activeProblem.instructions}</p> : null}
                </div>

                {renderGivenTable(activeProblem.givenTable)}

                <GraphBoard
                  title={activeProblem.title}
                  graphType={activeProblem.graphType}
                  axis={activeProblem.axis}
                  points={studentPoints}
                  onChange={(nextPoints) => {
                    setStudentPoints(sortPoints(nextPoints));
                    setEvaluation(null);
                  }}
                />

                <p className="coordinate-line">Selected points: {pointsToText(studentPoints) || "None"}</p>

                <div className="student-actions">
                  <button type="button" onClick={() => void handleEvaluateSubmission()} disabled={isEvaluating}>
                    {isEvaluating ? "Checking..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setStudentPoints([]);
                      setEvaluation(null);
                    }}
                  >
                    Reset graph
                  </button>
                </div>
              </>
            ) : (
              <p className="status-line">No problem loaded yet. Publish one from Authoring View or load a seeded sample.</p>
            )}

            {studentMessage ? <p className="status-line error-line">{studentMessage}</p> : null}

            {evaluation ? (
              <section className={evaluation.isCorrect ? "result-card correct" : "result-card incorrect"}>
                <h3>{evaluation.isCorrect ? "Correct" : "Incorrect"}</h3>
                <p>{evaluation.summary}</p>

                {!evaluation.isCorrect ? (
                  <>
                    <p>Missing points: {pointsToText(evaluation.missingPoints) || "None"}</p>
                    <p>Unexpected points: {pointsToText(evaluation.unexpectedPoints) || "None"}</p>
                    {evaluation.correctAnswer ? (
                      <div className="grouped-section">
                        <h4>Official answer and explanation</h4>
                        <p>{evaluation.correctAnswer.explanation}</p>
                        {evaluation.correctAnswer.steps.length > 0 ? (
                          <ol>
                            {evaluation.correctAnswer.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        ) : null}

                        {activeProblem ? (
                          <GraphBoard
                            title={`${activeProblem.title} - Correct Answer`}
                            graphType={activeProblem.graphType}
                            axis={activeProblem.axis}
                            points={evaluation.correctAnswer.points}
                            readOnly
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
