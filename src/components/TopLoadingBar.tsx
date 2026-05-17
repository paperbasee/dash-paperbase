"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TopLoadingBarProps = {
  isLoading: boolean;
};

export function TopLoadingBar({ isLoading }: TopLoadingBarProps) {
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);
  const wasLoadingRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  };

  useEffect(() => {
    clearTimeouts();

    if (isLoading) {
      wasLoadingRef.current = true;
      setFading(false);
      setVisible(true);
      setWidth(0);
      const raf = requestAnimationFrame(() => {
        setWidth(80);
      });
      return () => {
        cancelAnimationFrame(raf);
        clearTimeouts();
      };
    }

    if (!wasLoadingRef.current) {
      return clearTimeouts;
    }

    wasLoadingRef.current = false;
    setWidth(100);
    schedule(() => setFading(true), 150);
    schedule(() => {
      setVisible(false);
      setWidth(0);
      setFading(false);
    }, 550);

    return clearTimeouts;
  }, [isLoading]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-hidden={fading}
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-[9999] h-[2.5px] w-screen overflow-hidden",
        "transition-opacity duration-[400ms] ease-out",
        fading ? "opacity-0" : "opacity-100"
      )}
    >
      <div
        className={cn(
          "h-full",
          width === 100
            ? "transition-[width] duration-150 ease-out"
            : "transition-[width] duration-[2000ms] ease-out"
        )}
        style={{
          width: `${width}%`,
          background: "#ff4d00",
          boxShadow: "0 0 10px rgba(255, 77, 0, 0.7)",
        }}
      />
    </div>
  );
}
