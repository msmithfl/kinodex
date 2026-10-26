import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

// The one place that knows the API's address and how requests are signed in. Pages and hooks
// call api.get("/collections") etc. instead of building URLs and adding tokens themselves.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5156";

// A failed request: the HTTP status, plus the server's own explanation when it sent one
// ({ message } or { error } in the body)
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const body = JSON.parse(text);
    if (typeof body?.message === "string") return body.message;
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Not JSON; fall through
  }
  return text || `Request failed (${response.status})`;
}

export function createApi(getToken: () => Promise<string | null>) {
  // Sends a request and returns the response, throwing ApiError if it failed. A FormData body
  // (file uploads) is sent as-is; anything else is sent as JSON.
  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await getToken();
    const isForm = body instanceof FormData;
    const response = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && !isForm && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response));
    return response;
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await send(method, path, body);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    delete: (path: string) => request<void>("DELETE", path),
    // A file the server sends back (e.g. a CSV export)
    download: async (path: string) => (await send("GET", path)).blob(),
    // Sends a file as a form upload (field name "file") and returns the JSON reply
    upload: <T>(path: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<T>("POST", path, form);
    },
  };
}

export type Api = ReturnType<typeof createApi>;

// The API client for the signed-in user
export function useApi(): Api {
  const { getToken } = useAuth();
  return useMemo(() => createApi(getToken), [getToken]);
}
