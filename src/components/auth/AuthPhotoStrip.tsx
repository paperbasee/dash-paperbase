import type { ReactNode } from "react";

import { heroPhoto, productPhoto } from "@/components/shop-preview/samples";
import { cn } from "@/lib/utils";

const PHOTOS = [heroPhoto("clothing"), productPhoto("clothing", 2), productPhoto("home", 1)];

/**
 * On a phone, where the shop picture beside the form has no room: three of its photos in a row,
 * with a small note resting on them. Gone on a computer, which shows the whole picture.
 */
export function AuthPhotoStrip({ note, className }: { note: ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn("relative mb-8 grid h-32 grid-cols-[1.2fr_1fr_1fr] gap-1.5 lg:hidden", className)}>
      {PHOTOS.map((src, i) => (
        <div key={src} className="pb-rise overflow-hidden rounded-card" style={{ animationDelay: `${i * 80}ms` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo */}
          <img src={src} alt="" className="pb-drift size-full object-cover" decoding="async" />
        </div>
      ))}
      <div
        className="pb-rise absolute inset-x-2.5 -bottom-3.5 flex items-center gap-2 rounded-card bg-white px-2.5 py-2 text-[11.5px] text-[#0f172a] shadow-[0_12px_28px_-12px_rgb(15_23_42/0.45)] ring-1 ring-black/[0.06]"
        style={{ animationDelay: "300ms" }}
      >
        {note}
      </div>
    </div>
  );
}
