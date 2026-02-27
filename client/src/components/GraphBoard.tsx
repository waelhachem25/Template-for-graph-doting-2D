import type { MouseEvent } from "react";
import { useMemo } from "react";
import type { AxisConfig, AxisPairConfig, GraphType, Point } from "../types";

interface GraphBoardProps {
  title: string;
  graphType: GraphType;
  axis: AxisPairConfig;
  points: Point[];
  onChange?: (points: Point[]) => void;
  readOnly?: boolean;
}

const VIEWPORT_WIDTH = 920;
const VIEWPORT_HEIGHT = 620;
const MARGIN = {
  top: 52,
  right: 42,
  bottom: 94,
  left: 96,
};
const EPSILON = 0.000001;

function formatTick(value: number): string {
  if (Math.abs(value - Math.round(value)) < EPSILON) {
    return String(Math.round(value));
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

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

function snapToStep(value: number, axis: AxisConfig): number {
  const rawStepIndex = (value - axis.min) / axis.step;
  const stepIndex = Math.round(rawStepIndex);
  const snapped = axis.min + stepIndex * axis.step;
  const bounded = Math.max(axis.min, Math.min(axis.max, snapped));
  return Number(bounded.toFixed(6));
}

function buildTicks(axis: AxisConfig): number[] {
  const range = axis.max - axis.min;
  if (range <= 0 || axis.step <= 0) {
    return [axis.min];
  }

  let step = axis.step;
  let totalTicks = Math.floor(range / step) + 1;

  if (totalTicks > 24) {
    const factor = Math.ceil(totalTicks / 24);
    step = axis.step * factor;
    totalTicks = Math.floor(range / step) + 1;
  }

  const ticks: number[] = [];
  for (let index = 0; index < totalTicks; index += 1) {
    ticks.push(Number((axis.min + index * step).toFixed(6)));
  }

  if (Math.abs(ticks[ticks.length - 1] - axis.max) > EPSILON) {
    ticks.push(axis.max);
  }

  return ticks;
}

export function GraphBoard({ title, graphType, axis, points, onChange, readOnly = false }: GraphBoardProps) {
  const chartWidth = VIEWPORT_WIDTH - MARGIN.left - MARGIN.right;
  const chartHeight = VIEWPORT_HEIGHT - MARGIN.top - MARGIN.bottom;

  const xRange = axis.x.max - axis.x.min;
  const yRange = axis.y.max - axis.y.min;
  const safeXRange = xRange > 0 ? xRange : 1;
  const safeYRange = yRange > 0 ? yRange : 1;

  const xTicks = useMemo(() => buildTicks(axis.x), [axis.x]);
  const yTicks = useMemo(() => buildTicks(axis.y), [axis.y]);

  const normalizedPoints = useMemo(() => sortPoints(points), [points]);
  const linePoints = graphType === "line" ? normalizedPoints : [];

  const toX = (value: number): number => MARGIN.left + ((value - axis.x.min) / safeXRange) * chartWidth;
  const toY = (value: number): number => MARGIN.top + chartHeight - ((value - axis.y.min) / safeYRange) * chartHeight;

  const handleChartClick = (event: MouseEvent<SVGRectElement>): void => {
    if (readOnly || !onChange) {
      return;
    }

    if (xRange <= 0 || yRange <= 0 || axis.x.step <= 0 || axis.y.step <= 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const ratioX = (event.clientX - bounds.left) / bounds.width;
    const ratioY = (event.clientY - bounds.top) / bounds.height;

    const rawX = axis.x.min + ratioX * xRange;
    const rawY = axis.y.max - ratioY * yRange;

    const snappedPoint: Point = {
      x: snapToStep(rawX, axis.x),
      y: snapToStep(rawY, axis.y),
    };

    const alreadySelected = normalizedPoints.some((point) => samePoint(point, snappedPoint));
    const nextPoints = alreadySelected
      ? normalizedPoints.filter((point) => !samePoint(point, snappedPoint))
      : [...normalizedPoints, snappedPoint];

    onChange(sortPoints(nextPoints));
  };

  return (
    <div className="graph-shell">
      <svg className="graph-svg" viewBox={`0 0 ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}`} role="img" aria-label={title}>
        <title>{title}</title>
        <text x={VIEWPORT_WIDTH / 2} y={28} textAnchor="middle" className="graph-title">
          {title}
        </text>

        {xTicks.map((tick) => (
          <g key={`x-tick-${tick}`}>
            <line
              x1={toX(tick)}
              y1={MARGIN.top}
              x2={toX(tick)}
              y2={MARGIN.top + chartHeight}
              className="graph-grid-line"
            />
            <text x={toX(tick)} y={MARGIN.top + chartHeight + 30} textAnchor="middle" className="graph-tick-label">
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {yTicks.map((tick) => (
          <g key={`y-tick-${tick}`}>
            <line
              x1={MARGIN.left}
              y1={toY(tick)}
              x2={MARGIN.left + chartWidth}
              y2={toY(tick)}
              className="graph-grid-line"
            />
            <text x={MARGIN.left - 18} y={toY(tick) + 5} textAnchor="end" className="graph-tick-label">
              {formatTick(tick)}
            </text>
          </g>
        ))}

        <line
          x1={MARGIN.left}
          y1={MARGIN.top + chartHeight}
          x2={MARGIN.left + chartWidth}
          y2={MARGIN.top + chartHeight}
          className="graph-axis-line"
        />
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + chartHeight}
          className="graph-axis-line"
        />

        <polygon
          points={`${MARGIN.left + chartWidth + 6},${MARGIN.top + chartHeight} ${MARGIN.left + chartWidth - 8},${
            MARGIN.top + chartHeight - 6
          } ${MARGIN.left + chartWidth - 8},${MARGIN.top + chartHeight + 6}`}
          className="graph-axis-arrow"
        />
        <polygon
          points={`${MARGIN.left},${MARGIN.top - 8} ${MARGIN.left - 6},${MARGIN.top + 8} ${MARGIN.left + 6},${
            MARGIN.top + 8
          }`}
          className="graph-axis-arrow"
        />

        <text x={VIEWPORT_WIDTH / 2} y={VIEWPORT_HEIGHT - 26} textAnchor="middle" className="graph-axis-label">
          {axis.x.label}
          {axis.x.unit ? ` (${axis.x.unit})` : ""}
        </text>
        <text
          x={30}
          y={VIEWPORT_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(-90 30 ${VIEWPORT_HEIGHT / 2})`}
          className="graph-axis-label"
        >
          {axis.y.label}
          {axis.y.unit ? ` (${axis.y.unit})` : ""}
        </text>

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={chartWidth}
          height={chartHeight}
          className={readOnly ? "graph-hitbox-readonly" : "graph-hitbox"}
          onClick={handleChartClick}
        />

        {linePoints.length > 1 ? (
          <polyline
            fill="none"
            className="graph-line"
            points={linePoints.map((point) => `${toX(point.x)},${toY(point.y)}`).join(" ")}
          />
        ) : null}

        {normalizedPoints.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={toX(point.x)} cy={toY(point.y)} r={7} className="graph-point" />
        ))}
      </svg>
    </div>
  );
}
