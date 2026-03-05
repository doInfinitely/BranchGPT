"use client";

import { useViewport } from "@xyflow/react";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContourGroup {
  nodeRects: Rect[];
  arrowTarget: { x: number; y: number } | null;
}

interface SelectionContourProps {
  groups: ContourGroup[];
}

/**
 * Renders one contour + arrow per group. Each group wraps a set of context
 * nodes with a convex-hull contour and draws an arrow to its target node.
 */
export function SelectionContour({ groups }: SelectionContourProps) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  const validGroups = groups.filter((g) => g.nodeRects.length > 0);
  if (validGroups.length === 0) return null;

  const padding = 20;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{
        transform: `translate(${vpX}px, ${vpY}px) scale(${zoom})`,
        transformOrigin: "0 0",
        zIndex: 0,
      }}
    >
      <defs>
        {validGroups.map((_, i) => (
          <marker
            key={`marker-${i}`}
            id={`contour-arrow-${i}`}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <path
              d="M0,0 L10,4 L0,8"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </marker>
        ))}
      </defs>

      {validGroups.map((group, i) => {
        const points: [number, number][] = [];
        for (const r of group.nodeRects) {
          points.push(
            [r.x - padding, r.y - padding],
            [r.x + r.width + padding, r.y - padding],
            [r.x + r.width + padding, r.y + r.height + padding],
            [r.x - padding, r.y + r.height + padding]
          );
        }

        const hull = convexHull(points);
        if (hull.length < 3) return null;

        const contourPath = smoothHullPath(hull, 18);

        let arrowPath = "";
        if (group.arrowTarget) {
          let closest = hull[0];
          let minDist = Infinity;
          for (const p of hull) {
            const d = Math.hypot(p[0] - group.arrowTarget.x, p[1] - group.arrowTarget.y);
            if (d < minDist) {
              minDist = d;
              closest = p;
            }
          }

          const dx = group.arrowTarget.x - closest[0];
          const dy = group.arrowTarget.y - closest[1];
          const dist = Math.hypot(dx, dy);

          if (dist > 10) {
            const midX = (closest[0] + group.arrowTarget.x) / 2;
            const midY = (closest[1] + group.arrowTarget.y) / 2;
            const perpX = -(dy / dist) * 25;
            const perpY = (dx / dist) * 25;
            const cpX = midX + perpX;
            const cpY = midY + perpY;

            arrowPath = `M ${closest[0]} ${closest[1]} Q ${cpX} ${cpY} ${group.arrowTarget.x} ${group.arrowTarget.y}`;
          }
        }

        return (
          <g key={`contour-group-${i}`}>
            <path
              d={contourPath}
              fill="var(--color-accent)"
              fillOpacity={0.06}
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeOpacity={0.5}
            />
            {arrowPath && (
              <path
                d={arrowPath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeOpacity={0.6}
                markerEnd={`url(#contour-arrow-${i})`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Graham scan convex hull */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length <= 3) return points;

  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Catmull-Rom to cubic bezier smoothing of hull points */
function smoothHullPath(hull: [number, number][], tension: number): string {
  if (hull.length < 3) return "";

  const n = hull.length;
  const parts: string[] = [];
  parts.push(`M ${hull[0][0]} ${hull[0][1]}`);

  for (let i = 0; i < n; i++) {
    const p0 = hull[(i - 1 + n) % n];
    const p1 = hull[i];
    const p2 = hull[(i + 1) % n];
    const p3 = hull[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) / tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) / tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) / tension;

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`);
  }

  parts.push("Z");
  return parts.join(" ");
}
