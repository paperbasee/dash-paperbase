"use client";

import type { PageRow } from "./types";

export function TopPagesTable({ pagesData }: { pagesData: PageRow[] }) {
  return (
    <div className="rounded-card border border-card-border bg-card p-4 lg:col-span-3">
      <div className="mb-4 text-sm font-medium text-foreground">Top Pages</div>
      <div className="min-w-0 max-w-full">
        {/* Horizontal + vertical scroll so full paths stay on one line and can be panned into view */}
        <div className="max-h-[320px] overflow-auto overscroll-contain scrollbar-gutter-stable md:max-h-[420px] [-webkit-overflow-scrolling:touch]">
          <table className="w-max min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Page</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">Views</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                  Unique Sessions
                </th>
              </tr>
            </thead>
            <tbody>
              {pagesData.map((r) => (
                <tr key={r.page_path} className="border-b border-border/60 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{r.page_path}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {r.views}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {r.unique_sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
