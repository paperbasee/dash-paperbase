/**
 * Generate a DiceBear avatar URL from a stable, non-sensitive seed.
 * Uses the "initials" style — no external packages required.
 */
export function getAvatarUrl(publicId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(publicId)}&fontWeight=600&fontSize=42`;
}
