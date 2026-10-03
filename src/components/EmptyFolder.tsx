"use client";

/**
 * An empty Blog or Reviews tab (owner, 2026-10-03): a folder with a face that opens, its pages
 * popping up, when pointed at or tapped (EmptyState holds the rest).
 *
 * The folder is the drawing of uselayouts' "empty-testimonial" (https://uselayouts.com, MIT
 * License, Copyright (c) 2025 Urvish Mali), moved with CSS transitions instead of Motion so the
 * dashboard takes no animation package.
 */
import { cn } from "@/lib/utils";

import { EmptyState, SPRING, type EmptyStateProps } from "./EmptyState";

// Where each page sits in the closed folder and where it pops to; the middle one rises highest.
// SPRING's slight overshoot stands in for the original's springs.
const PAGES = [
  { closed: "translate(-38px, 2px) rotate(-3deg)", open: "translate(-70px, -75px) rotate(-8deg)", front: false, ms: 560 },
  { closed: "translate(0px, 0px) rotate(0deg)", open: "translate(2px, -95px) rotate(1deg)", front: true, ms: 520 },
  { closed: "translate(42px, 1px) rotate(3.5deg)", open: "translate(75px, -80px) rotate(9deg)", front: false, ms: 600 },
] as const;

export function EmptyFolder({ className, ...props }: EmptyStateProps) {
  // Room above for the pages to pop into.
  return (
    <EmptyState
      {...props}
      className={cn("pt-28", className)}
      drawingClassName="h-52 w-80 max-w-full"
      drawing={(open) => <Folder open={open} />}
    />
  );
}

function Folder({ open }: { open: boolean }) {
  return (
    <>
      <div className="relative mx-auto h-full w-[87.5%] rounded-xl border border-[#D1D1D1] bg-[#EBEBEB]">
        {PAGES.map((page, index) => (
          <div
            key={index}
            style={{
              transform: open ? page.open : page.closed,
              transition: `transform ${page.ms}ms ${SPRING}`,
            }}
            className={cn(
              "absolute left-1/2 top-2 -ml-16 w-32 rounded-xl shadow-lg motion-reduce:transition-none!",
              page.front ? "z-20" : "z-10"
            )}
          >
            <Page />
          </div>
        ))}
      </div>

      <div
        style={{
          transform: open ? "perspective(600px) rotateX(-35deg)" : "perspective(600px) rotateX(0deg)",
          transition: `transform 500ms ${SPRING}`,
        }}
        className="absolute inset-x-0 -bottom-px z-30 h-44 origin-bottom motion-reduce:transition-none!"
      >
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 235 121"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z"
            fill="#F2F2F2"
            stroke="#D1D1D1"
            strokeWidth="1.5"
          />
        </svg>
        {/* The face. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-8">
          <div className="mb-2.5 flex gap-11">
            <div className="h-2.5 w-2.5 rounded-full bg-neutral-600/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-neutral-600/40" />
          </div>
          <div className="h-1 w-9 rounded-full bg-neutral-600/40" />
        </div>
      </div>
    </>
  );
}

/** A sheet in the folder: a heading line and two columns of text lines. */
function Page() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-linear-to-b from-white to-[#F5F5F7] p-4">
      <div className="flex flex-col gap-2">
        <div className="h-1.5 w-full rounded-full bg-neutral-100" />
        {Array.from({ length: 8 }, (_, row) => (
          <div key={row} className="flex gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-neutral-100" />
            <div className="h-1.5 flex-1 rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
