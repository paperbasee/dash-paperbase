"use client";

import api from "@/lib/api";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type UploadEntity = "product" | "blog" | "banner" | "category" | "support";

type PresignResponse = {
  url: string;
  key: string;
};

type UploadOptions = {
  entity: UploadEntity;
  onProgress?: (percent: number) => void;
  entityPublicId?: string;
  isGallery?: boolean;
};

function normalizeMediaBaseUrl(): string {
  const mediaBase = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (!mediaBase) {
    throw new Error(
      "NEXT_PUBLIC_MEDIA_BASE_URL is not set. Set it to your R2 public bucket URL in .env.local"
    );
  }

  return mediaBase;
}

export function buildPublicMediaUrlFromKey(key: string): string {
  // Strip any accidental media/ prefix (safety guard)
  const normalized = (key || "").replace(/^\/+/, "").replace(/^media\//, "");
  // Add media/ explicitly — mirrors what Django storage does
  return `${normalizeMediaBaseUrl()}/media/${normalized}`;
}

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return "Only JPG, PNG, WEBP, and GIF images are allowed.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Max 10MB.";
  }
  return null;
}

export async function uploadFile(file: File, options: UploadOptions): Promise<{ key: string }> {
  const validationError = validateUploadFile(file);
  if (validationError) throw new Error(validationError);

  const { data } = await api.post<PresignResponse>("admin/media/presign/", {
    filename: file.name,
    content_type: file.type,
    file_size: file.size,
    entity: options.entity,
    entity_public_id: options.entityPublicId || "",
    is_gallery: options.isGallery || false,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed."));
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(file);
  });

  return { key: data.key };
}
