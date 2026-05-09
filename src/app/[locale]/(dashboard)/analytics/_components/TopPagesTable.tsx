"use client";

import type { PageRow } from "./types";

export function TopPagesTable({ pagesData }: { pagesData: PageRow[] }) {
  return (
    <div className="rounded-card border border-card-border bg-card p-4 lg:col-span-3">
      <div className="mb-4 text-sm font-medium text-foreground">Top Pages</div>
      <div className="overflow-auto max-h-[320px] md:max-h-[420px]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted sticky top-0 z-10">
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Unique Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {pagesData.map((r) => (
              <tr key={r.page_path}>
                <td className="px-4 py-3 text-foreground">{r.page_path}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.views}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.unique_sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
