"use client";

/**
 * An empty Trash (owner, 2026-10-04: "not a folder -- it is the trash"): a bin with the folder's
 * face, in its soft greys, whose lid lifts when pointed at or tapped -- and the face looks up, a
 * little surprised to find nothing inside (EmptyState holds the rest).
 */
import { EmptyState, SPRING, type EmptyStateProps } from "./EmptyState";

const LINE = "#D1D1D1";
const FILL = "#F2F2F2";
const FACE = "rgba(82, 82, 82, 0.4)";

export function EmptyTrash(props: EmptyStateProps) {
  return <EmptyState {...props} drawingClassName="h-56 w-48" drawing={(open) => <Bin open={open} />} />;
}

function Bin({ open }: { open: boolean }) {
  const move = (ms: number) => ({ transition: `transform ${ms}ms ${SPRING}, opacity 200ms ease` });
  return (
    <svg viewBox="0 0 200 224" fill="none" className="h-full w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
      {/* The body, narrowing to the floor, ridged below the face. */}
      <path
        d="M30 50 H170 L160.5 204 A10 10 0 0 1 150.5 214 H49.5 A10 10 0 0 1 39.5 204 Z"
        fill={FILL}
        stroke={LINE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* The way in, seen once the lid is up. */}
      <rect x="32" y="51" width="136" height="9" rx="3" fill="#E4E4E4" />
      {[
        [78, 152, 80, 194],
        [100, 152, 100, 194],
        [122, 152, 120, 194],
      ].map(([x1, y1, x2, y2]) => (
        <line key={x1} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E2E2E2" strokeWidth="5" strokeLinecap="round" />
      ))}

      {/* The face: the eyes look up when the lid lifts, and the mouth makes a little "o". */}
      <g style={{ ...move(300), transform: open ? "translateY(-5px)" : "none" }} className="motion-reduce:transition-none!">
        <circle cx="84" cy="102" r="5" fill={FACE} />
        <circle cx="116" cy="102" r="5" fill={FACE} />
      </g>
      <line
        x1="91"
        y1="121"
        x2="109"
        y2="121"
        stroke={FACE}
        strokeWidth="4"
        strokeLinecap="round"
        style={{ ...move(200), opacity: open ? 0 : 1 }}
      />
      <circle cx="100" cy="121" r="5" fill={FACE} style={{ ...move(200), opacity: open ? 1 : 0 }} />

      {/* The lid, hinged at its left end. */}
      <g
        style={{
          ...move(520),
          transformBox: "view-box",
          transformOrigin: "22px 52px",
          transform: open ? "rotate(-28deg) translate(4px, -4px)" : "none",
        }}
        className="motion-reduce:transition-none!"
      >
        <path
          d="M80 35 V28 a6 6 0 0 1 6 -6 H114 a6 6 0 0 1 6 6 V35"
          stroke={LINE}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="22" y="34" width="156" height="18" rx="7" fill={FILL} stroke={LINE} strokeWidth="1.5" />
      </g>
    </svg>
  );
}
