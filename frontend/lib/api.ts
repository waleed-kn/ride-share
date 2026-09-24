const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiSuccess<T> {
  data: T;
}
interface ApiFailure {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("rideshare_token") : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body: ApiSuccess<T> | ApiFailure = await res.json();

  if (!res.ok || "error" in body) {
    const failure = body as ApiFailure;
    throw new ApiError(failure.error?.code ?? "UNKNOWN", failure.error?.message ?? "Request failed");
  }

  return (body as ApiSuccess<T>).data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};
