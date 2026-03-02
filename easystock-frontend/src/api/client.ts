export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getApiBaseUrl(): string {
  const raw = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return raw?.trim() ? raw.trim().replace(/\/+$/, "") : "";
}

/** Resolves relative image URLs (e.g. /static/uploads/...) to full API URL so they load when frontend and API are on different origins. */
export function getFullImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = getApiBaseUrl();
  return base ? `${base}${url.startsWith("/") ? url : `/${url}`}` : url;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: HttpMethod;
    token?: string | null;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      typeof (payload as any)?.detail === "string"
        ? (payload as any).detail
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}
