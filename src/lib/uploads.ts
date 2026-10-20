export type UploadKind = "image" | "video";

export const UPLOAD_RULES: Record<UploadKind, { types: string[]; maxBytes: number; hint: string }> = {
  image: {
    types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
    hint: "JPG, PNG, GIF, WebP (max 10MB)",
  },
  video: {
    types: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 50 * 1024 * 1024,
    hint: "MP4, WebM, MOV (max 50MB)",
  },
};

/** Null when the file may be uploaded as `kind`, otherwise the problem to show. */
export function checkUpload(file: { type: string; size: number }, kind: UploadKind) {
  const rules = UPLOAD_RULES[kind];
  if (!rules.types.includes(file.type)) {
    return { title: "Invalid file type", description: `Please select a valid ${kind} file` };
  }
  if (file.size > rules.maxBytes) {
    return { title: "File too large", description: `Maximum file size is ${rules.maxBytes / 1024 / 1024}MB` };
  }
  return null;
}
