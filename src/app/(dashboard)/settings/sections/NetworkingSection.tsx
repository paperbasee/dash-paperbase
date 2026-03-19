 "use client";

import { Cloud, Copy, Pencil, Trash2, Zap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NetworkingSection({ hidden }: { hidden: boolean }) {
  return (
    <section
      id="panel-networking"
      role="tabpanel"
      aria-labelledby="tab-networking"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold text-foreground">Public Networking</h2>
      <p className="mb-4 text-sm text-muted-foreground">Access your application over HTTP with the following domains</p>

      <div className="w-full max-w-6xl space-y-4 pb-8 sm:pb-0">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Cloud className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                {process.env.NEXT_PUBLIC_API_URL
                  ? process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, "").split("/")[0] || "api.yourstore.com"
                  : "api.yourstore.com"}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
                <span>→ Port 8080</span>
                <span>·</span>
                <button type="button" className="text-primary hover:underline">
                  Cloudflare proxy detected
                </button>
                <span>·</span>
                <button type="button" className="text-primary hover:underline">
                  View Documentation
                </button>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto sm:gap-2">
            <Button variant="ghost" size="icon" aria-label="Copy domain" className="size-8">
              <Copy className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit domain" className="size-8">
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete domain" className="size-8">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto"
          >
            <Zap className="mr-2 size-4" />
            Generate Domain
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-primary text-primary hover:bg-primary/10 sm:w-auto"
          >
            <Plus className="mr-2 size-4" />
            Custom Domain
          </Button>
        </div>
      </div>
    </section>
  );
}

