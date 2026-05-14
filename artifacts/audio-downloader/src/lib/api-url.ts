const _base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export function apiUrl(path: string): string {
  if (!_base) return path;
  return `${_base.replace(/\/+$/, "")}${path}`;
}
