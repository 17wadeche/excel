/* global AbortController RequestInit URL fetch window crypto localStorage */
import { DashboardItem, TemplateItem } from "../components/types";
type RuntimeConfig = typeof window & {
  __API_BASE_URL__?: string;
  __API_AUTH_TOKEN__?: string;
  __USE_LOCAL_API_FALLBACK__?: boolean;
};
type AuthTokenProvider = () => Promise<string | null> | string | null;
const runtimeWindow = window as RuntimeConfig;
const getApiBaseUrl = () => runtimeWindow.__API_BASE_URL__ ?? "/api";
export const isUsingLocalApiFallback = () => {
  if (typeof runtimeWindow.__USE_LOCAL_API_FALLBACK__ === "boolean") {
    return runtimeWindow.__USE_LOCAL_API_FALLBACK__;
  }
  return (
    ["localhost", "127.0.0.1"].includes(window.location.hostname) && getApiBaseUrl() === "/api"
  );
};
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
const LOCAL_DASHBOARDS_KEY = "workbookDashboard.local.dashboards";
const LOCAL_TEMPLATES_KEY = "workbookDashboard.local.templates";
const readLocalCollection = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};
const writeLocalCollection = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};
const localResponse = <T>(data: T): ApiResponse<T> => ({ data, requestId: "local-development" });
const nowIso = () => new Date().toISOString();
const localDashboardApi = {
  list: (params?: { workbookId?: string; userEmail?: string }) => {
    const dashboards = readLocalCollection<DashboardItem>(LOCAL_DASHBOARDS_KEY).filter(
      (dashboard) => {
        const workbookMatches = !params?.workbookId || dashboard.workbookId === params.workbookId;
        const userMatches =
          !params?.userEmail || !dashboard.userEmail || dashboard.userEmail === params.userEmail;
        return workbookMatches && userMatches;
      }
    );
    return Promise.resolve(localResponse(dashboards));
  },
  get: (id: string) => {
    const dashboard = readLocalCollection<DashboardItem>(LOCAL_DASHBOARDS_KEY).find(
      (item) => item.id === id
    );
    if (!dashboard) {
      return Promise.reject(
        new ApiError(
          `Local dashboard ${id} not found`,
          404,
          "Not Found",
          undefined,
          "local-development"
        )
      );
    }
    return Promise.resolve(localResponse(dashboard));
  },
  create: (dashboard: DashboardItem) => {
    const dashboards = readLocalCollection<DashboardItem>(LOCAL_DASHBOARDS_KEY);
    const saved = {
      ...dashboard,
      id: dashboard.id || `dashboard-${Date.now()}`,
      updatedAt: nowIso(),
    } as DashboardItem;
    writeLocalCollection(LOCAL_DASHBOARDS_KEY, [
      ...dashboards.filter((item) => item.id !== saved.id),
      saved,
    ]);
    return Promise.resolve(localResponse(saved));
  },
  update: (id: string, dashboard: DashboardItem) => {
    const dashboards = readLocalCollection<DashboardItem>(LOCAL_DASHBOARDS_KEY);
    const saved = { ...dashboard, id, updatedAt: nowIso() } as DashboardItem;
    writeLocalCollection(LOCAL_DASHBOARDS_KEY, [
      ...dashboards.filter((item) => item.id !== id),
      saved,
    ]);
    return Promise.resolve(localResponse(saved));
  },
  delete: (id: string) => {
    const dashboards = readLocalCollection<DashboardItem>(LOCAL_DASHBOARDS_KEY);
    writeLocalCollection(
      LOCAL_DASHBOARDS_KEY,
      dashboards.filter((item) => item.id !== id)
    );
    return Promise.resolve(localResponse(undefined as void));
  },
};
const localTemplateApi = {
  create: (template: Record<string, unknown>) => {
    const templates = readLocalCollection<TemplateItem>(LOCAL_TEMPLATES_KEY);
    const saved = {
      ...template,
      id: String(template.id || `template-${Date.now()}`),
    } as unknown as TemplateItem;
    writeLocalCollection(LOCAL_TEMPLATES_KEY, [
      ...templates.filter((item) => item.id !== saved.id),
      saved,
    ]);
    return Promise.resolve(localResponse(saved));
  },
  update: (id: string, template: Record<string, unknown>) => {
    const templates = readLocalCollection<TemplateItem>(LOCAL_TEMPLATES_KEY);
    const saved = { ...template, id } as unknown as TemplateItem;
    writeLocalCollection(LOCAL_TEMPLATES_KEY, [
      ...templates.filter((item) => item.id !== id),
      saved,
    ]);
    return Promise.resolve(localResponse(saved));
  },
};
export const dashboardApi = {
  list: (params?: { workbookId?: string; userEmail?: string }) =>
    isUsingLocalApiFallback()
      ? localDashboardApi.list(params)
      : apiClient.get<DashboardItem[]>("/dashboards", params),
  get: (id: string) =>
    isUsingLocalApiFallback()
      ? localDashboardApi.get(id)
      : apiClient.get<DashboardItem>(`/dashboards/${id}`),
  create: (dashboard: DashboardItem) =>
    isUsingLocalApiFallback()
      ? localDashboardApi.create(dashboard)
      : apiClient.post<DashboardItem>("/dashboards", dashboard),
  update: (id: string, dashboard: DashboardItem) =>
    isUsingLocalApiFallback()
      ? localDashboardApi.update(id, dashboard)
      : apiClient.put<DashboardItem>(`/dashboards/${id}`, dashboard),
  delete: (id: string) =>
    isUsingLocalApiFallback()
      ? localDashboardApi.delete(id)
      : apiClient.delete<void>(`/dashboards/${id}`),
};
export const templateApi = {
  create: (template: Record<string, unknown>) =>
    isUsingLocalApiFallback()
      ? localTemplateApi.create(template)
      : apiClient.post<TemplateItem>("/templates", template),
  update: (id: string, template: Record<string, unknown>) =>
    isUsingLocalApiFallback()
      ? localTemplateApi.update(id, template)
      : apiClient.put<TemplateItem>(`/templates/${id}`, template),
};
export default apiClient;