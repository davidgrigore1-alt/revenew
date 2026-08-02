export const WORKSPACE_LOGO_DATA_URL_KEY = "revenew.workspace.logoDataUrl";
export const WORKSPACE_LOGO_META_KEY = "revenew.workspace.logoMeta";
export const WORKSPACE_LOGO_MAX_BYTES = 800 * 1024;
export const WORKSPACE_LOGO_MAX_DATA_URL_LENGTH = 4 * Math.ceil(WORKSPACE_LOGO_MAX_BYTES / 3) + 64;

export const workspaceLogoMimeTypes = ["image/png", "image/jpeg", "image/webp"] as const;
export type WorkspaceLogoMimeType = (typeof workspaceLogoMimeTypes)[number];

export type WorkspaceLogo = {
  dataUrl: string;
  fileName: string;
  mimeType: WorkspaceLogoMimeType;
  size: number;
};

type WorkspaceLogoFile = Pick<File, "name" | "size" | "type">;

const acceptedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

export function validateWorkspaceLogoFile(file: WorkspaceLogoFile) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLocaleLowerCase("ro-RO");
  if (!workspaceLogoMimeTypes.includes(file.type as WorkspaceLogoMimeType) || !acceptedExtensions.includes(extension)) {
    return { valid: false as const, error: "Acceptăm PNG, JPG sau WEBP. SVG nu este acceptat în v1." };
  }
  if (file.size <= 0 || file.size > WORKSPACE_LOGO_MAX_BYTES) {
    return { valid: false as const, error: "Logo-ul poate avea maximum 800 KB. Dacă fișierul este prea mare, folosește o versiune comprimată." };
  }
  return { valid: true as const };
}

export function isSafeWorkspaceLogoDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > WORKSPACE_LOGO_MAX_DATA_URL_LENGTH) return false;
  return /^(?:data:image\/png|data:image\/jpeg|data:image\/webp);base64,[a-z0-9+/=]+$/i.test(value);
}

export function normalizeWorkspaceLogo(dataUrl: unknown, meta: unknown): WorkspaceLogo | null {
  if (!isSafeWorkspaceLogoDataUrl(dataUrl) || !meta || typeof meta !== "object") return null;
  const candidate = meta as Partial<Omit<WorkspaceLogo, "dataUrl">>;
  const validation = validateWorkspaceLogoFile({
    name: String(candidate.fileName ?? ""),
    type: String(candidate.mimeType ?? ""),
    size: Number(candidate.size ?? 0)
  });
  if (!validation.valid) return null;
  return {
    dataUrl,
    fileName: String(candidate.fileName),
    mimeType: candidate.mimeType as WorkspaceLogoMimeType,
    size: Number(candidate.size)
  };
}

export function workspaceInitials(displayName: string, explicitInitials?: string) {
  const explicit = String(explicitInitials ?? "").trim();
  if (explicit) return explicit.slice(0, 4).toLocaleUpperCase("ro-RO");
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const derived = words.slice(0, 2).map((word) => word[0]).join("");
  return (derived || "RN").toLocaleUpperCase("ro-RO");
}
