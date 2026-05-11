/* global AbortController RequestInit URL fetch window */
import { DashboardItem, TemplateItem } from "../components/types";
const API_BASE_URL = "/api";
const DEFAULT_TIMEOUT_MS = 15000;
export interface ApiResponse<T> {
  data: T;
}
type QueryValue = string | number | boolean | null | undefined;
const buildUrl = (path: string, params?: Record<string, QueryValue>): string => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return `${url.pathname}${url.search}`;
};
const request = async <T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, QueryValue>
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl(path, params), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `API ${response.status} ${response.statusText}: ${body || "No response body"}`
      );
    }
    if (response.status === 204) {
      return { data: undefined as T };
    }
    return { data: (await response.json()) as T };
  } finally {
    window.clearTimeout(timeout);
  }
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