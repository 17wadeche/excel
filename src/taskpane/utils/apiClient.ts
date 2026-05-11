/* global AbortController RequestInit URL fetch window crypto */
import { DashboardItem, TemplateItem } from "../components/types";
type RuntimeConfig = typeof window & {
  __API_BASE_URL__?: string;
  __API_AUTH_TOKEN__?: string;
};
type AuthTokenProvider = () => Promise<string | null> | string | null;
const runtimeWindow = window as RuntimeConfig;
const getApiBaseUrl = () => runtimeWindow.__API_BASE_URL__ ?? "/api";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_ATTEMPTS = 2;
let authTokenProvider: AuthTokenProvider | null = null;
export const setApiAuthTokenProvider = (provider: AuthTokenProvider | null) => {
  authTokenProvider = provider;
};
export interface ApiResponse<T> {
  data: T;
  requestId: string;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly responseBody?: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
type QueryValue = string | number | boolean | null | undefined;
const buildUrl = (path: string, params?: Record<string, QueryValue>): string => {
  const apiBaseUrl = getApiBaseUrl();
  const normalizedBase = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = normalizedBase.startsWith("http")
    ? normalizedBase
    : `${window.location.origin}${normalizedBase}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return normalizedBase.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
};
const createRequestId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const providedToken = authTokenProvider ? await authTokenProvider() : null;
  const token = providedToken || runtimeWindow.__API_AUTH_TOKEN__;
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;
const waitForRetry = (attempt: number) =>
  new Promise((resolve) => window.setTimeout(resolve, 300 * 2 ** attempt));
const request = async <T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, QueryValue>,
  attempts = DEFAULT_RETRY_ATTEMPTS
): Promise<ApiResponse<T>> => {
  const requestId = createRequestId();
  const method = options.method ?? "GET";
  const requestIdempotencyKey = createRequestId();
  const canRetry = ["GET", "DELETE", "PUT", "POST", "PATCH"].includes(method);
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(buildUrl(path, params), {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
          ...authHeaders,
          ...(method === "GET" ? {} : { "Idempotency-Key": requestIdempotencyKey }),
          ...options.headers,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        const error = new ApiError(
          `API ${response.status} ${response.statusText}: ${body || "No response body"}`,
          response.status,
          response.statusText,
          body,
          requestId
        );
        if (canRetry && attempt < attempts && isRetryableStatus(response.status)) {
          await waitForRetry(attempt);
          continue;
        }
        throw error;
      }
      if (response.status === 204) {
        return { data: undefined as T, requestId };
      }
      return { data: (await response.json()) as T, requestId };
    } catch (error) {
      if (
        canRetry &&
        attempt < attempts &&
        !(error instanceof ApiError && !isRetryableStatus(error.status ?? 0))
      ) {
        await waitForRetry(attempt);
        continue;
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `API ${method} ${path} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        undefined,
        undefined,
        undefined,
        requestId
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw new ApiError(
    `API ${method} ${path} failed after retries`,
    undefined,
    undefined,
    undefined,
    requestId
  );
};
export const apiClient = {
  get: <T>(path: string, params?: Record<string, QueryValue>) =>
    request<T>(path, { method: "GET" }, params),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
export const dashboardApi = {
  list: (params?: { workbookId?: string; userEmail?: string }) =>
    apiClient.get<DashboardItem[]>("/dashboards", params),
  get: (id: string) => apiClient.get<DashboardItem>(`/dashboards/${id}`),
  create: (dashboard: DashboardItem) => apiClient.post<DashboardItem>("/dashboards", dashboard),
  update: (id: string, dashboard: DashboardItem) =>
    apiClient.put<DashboardItem>(`/dashboards/${id}`, dashboard),
  delete: (id: string) => apiClient.delete<void>(`/dashboards/${id}`),
};
export const templateApi = {
  create: (template: Record<string, unknown>) =>
    apiClient.post<TemplateItem>("/templates", template),
  update: (id: string, template: Record<string, unknown>) =>
    apiClient.put<TemplateItem>(`/templates/${id}`, template),
};
export default apiClient;