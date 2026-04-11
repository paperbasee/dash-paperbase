import { ZoneBlock } from "../ZoneBlock";

type Props = { activeZones: Set<string> };

export function HomePreview({ activeZones }: Props) {
  return (
    <div className="space-y-2 p-3">
      {/* --- TOP: Navbar + Hero --- */}
      <ZoneBlock zone="top" activeZones={activeZones} label="Home Top — Navbar / Hero">
        <div className="space-y-3 p-4 pt-8">
          {/* Navbar */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded-ui bg-muted/60" />
            <div className="flex gap-3">
              <div className="h-3 w-12 rounded-ui bg-muted/50" />
              <div className="h-3 w-12 rounded-ui bg-muted/50" />
              <div className="h-3 w-12 rounded-ui bg-muted/50" />
            </div>
          </div>
          {/* Hero */}
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="h-4 w-48 rounded-ui bg-muted/50" />
            <div className="h-3 w-64 rounded-ui bg-muted/40" />
            <div className="mt-2 h-7 w-24 rounded-ui bg-muted/50" />
          </div>
        </div>
      </ZoneBlock>

      {/* --- MID: Main content + sidebar --- */}
      <ZoneBlock zone="mid" activeZones={activeZones} label="Home Mid — Main content">
        <div className="grid grid-cols-3 gap-3 p-4 pt-8">
          {/* Main content */}
          <div className="col-span-2 space-y-3">
            <div className="h-28 rounded-ui bg-muted/40" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-20 rounded-ui bg-muted/30" />
              <div className="h-20 rounded-ui bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-3/4 rounded-ui bg-muted/40" />
              <div className="h-2.5 w-1/2 rounded-ui bg-muted/35" />
            </div>
          </div>
          {/* Sidebar */}
          <div className="space-y-3">
            <div className="h-16 rounded-ui bg-muted/30" />
            <div className="h-24 rounded-ui bg-muted/30" />
            <div className="h-12 rounded-ui bg-muted/30" />
          </div>
        </div>
      </ZoneBlock>

      {/* --- BOTTOM: Footer --- */}
      <ZoneBlock zone="bottom" activeZones={activeZones} label="Home Bottom — Footer">
        <div className="space-y-3 p-4 pt-8">
          <div className="h-px w-full bg-muted/40" />
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded-ui bg-muted/40" />
            <div className="flex gap-2">
              <div className="size-4 rounded-full bg-muted/40" />
              <div className="size-4 rounded-full bg-muted/40" />
              <div className="size-4 rounded-full bg-muted/40" />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="space-y-1.5">
              <div className="h-2 w-14 rounded-ui bg-muted/35" />
              <div className="h-2 w-10 rounded-ui bg-muted/30" />
              <div className="h-2 w-12 rounded-ui bg-muted/30" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-14 rounded-ui bg-muted/35" />
              <div className="h-2 w-10 rounded-ui bg-muted/30" />
              <div className="h-2 w-12 rounded-ui bg-muted/30" />
            </div>
          </div>
        </div>
      </ZoneBlock>
    </div>
  );
}
