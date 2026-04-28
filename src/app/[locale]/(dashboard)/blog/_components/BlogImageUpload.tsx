"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlogImageUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** Existing remote image URL (for edit flows). Cleared locally when `clearedRemote` is set. */
  remoteUrl?: string | null;
  /** Called when the user explicitly removes the existing remote image. */
  onRemoveRemote?: () => void;
  disabled?: boolean;
}

export function BlogImageUpload({
  value,
  onChange,
  remoteUrl,
  onRemoveRemote,
  disabled,
}: BlogImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const localPreview = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  );

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const shownUrl = localPreview ?? remoteUrl ?? null;
  const disabledClass = disabled ? "pointer-events-none opacity-60" : "";

  function handleFileChange(file: File | null) {
    if (file) onChange(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-card p-3">
        {shownUrl ? (
          <div className="relative h-full w-full overflow-hidden rounded-ui border border-border/70 bg-card">
            <img
              src={shownUrl}
              alt="Featured image preview"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <label
            className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-ui border border-dashed bg-card text-center text-muted-foreground transition-colors hover:text-foreground ${isDragging ? "border-primary bg-primary/5 text-foreground" : "border-primary/35 hover:border-primary/60"} ${disabledClass}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={(e) => {
              // Only clear dragging state when leaving the actual dropzone.
              if (e.currentTarget === e.target) setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <span className="text-primary">
              <ImageIcon className="size-7" />
            </span>
            <span className="text-xs font-semibold text-foreground">
              Drop your image here, or{" "}
              <span className="text-primary underline underline-offset-2">browse</span>
            </span>
            <span className="text-[11px] text-muted-foreground">Supports: JPG, JPEG2000, PNG</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileChange(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {shownUrl && (
        <div className="grid grid-cols-2 gap-2 px-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="h-10 w-full justify-center"
          >
            Replace
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (value) {
                onChange(null);
              } else if (remoteUrl && onRemoveRemote) {
                onRemoveRemote();
              }
            }}
            disabled={disabled}
            className="h-10 w-full justify-center border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            Remove
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              handleFileChange(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
