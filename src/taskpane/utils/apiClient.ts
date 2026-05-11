import axios from "axios";
import { DashboardItem, TemplateItem } from "../components/types";
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 15000,
});
export const dashboardApi = {
  get: (id: string) => apiClient.get<DashboardItem>(`/dashboards/${id}`),
  create: (dashboard: DashboardItem) => apiClient.post<DashboardItem>("/dashboards", dashboard),
  update: (id: string, dashboard: DashboardItem) =>
    apiClient.put<DashboardItem>(`/dashboards/${id}`, dashboard),
};
export const templateApi = {
  create: (template: Record<string, unknown>) =>
    apiClient.post<TemplateItem>("/templates", template),
  update: (id: string, template: Record<string, unknown>) =>
    apiClient.put<TemplateItem>(`/templates/${id}`, template),
};
export default apiClient;