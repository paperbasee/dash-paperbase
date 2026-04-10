"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Lottie from "lottie-react";

const SUCCESS_ANIMATION_SRC = "/assets/web-assets/success/animations/12345.json";

/** Responsive max width: tighter on phones, scales up from `sm` */
const SIZE_WRAP =
  "mx-auto w-full max-w-[200px] sm:max-w-[260px] md:max-w-[320px]";

type LoadState = "loading" | "ready" | "error";

export function CheckoutSuccessAnimation({ className }: { className?: string }) {
  const [data, setData] = useState<object | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(SUCCESS_ANIMATION_SRC)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load animation");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === "loading") {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-3xl bg-muted/30 ${SIZE_WRAP} ${className ?? ""}`}
        aria-hidden
      >
        <div className="h-10 w-10 animate-pulse rounded-full bg-primary/15 sm:h-12 sm:w-12" />
      </div>
    );
  }

  if (loadState === "error" || !data) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-full bg-primary/10 ${SIZE_WRAP} ${className ?? ""}`}
        aria-hidden
      >
        <CheckCircle2
          className="h-12 w-12 text-primary sm:h-16 sm:w-16"
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <div className={`${SIZE_WRAP} ${className ?? ""}`} style={{ aspectRatio: "1 / 1" }}>
      <Lottie
        animationData={data}
        loop
        className="h-full w-full [&_svg]:!block"
        role="img"
        aria-hidden
        rendererSettings={{
          preserveAspectRatio: "xMidYMid meet",
        }}
      />
    </div>
  );
}
