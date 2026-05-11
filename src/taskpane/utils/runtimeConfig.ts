/* global window */
declare const DASHBOARD_API_BASE_URL: string;
declare const DASHBOARD_DEV_USER_EMAIL: string;
type RuntimeConfigWindow = typeof window & {
  __API_BASE_URL__?: string;
  __DEV_USER_EMAIL__?: string;
};
export const initializeRuntimeConfig = () => {
  const runtimeWindow = window as RuntimeConfigWindow;
  if (!runtimeWindow.__API_BASE_URL__ && DASHBOARD_API_BASE_URL) {
    runtimeWindow.__API_BASE_URL__ = DASHBOARD_API_BASE_URL;
  }
  if (!runtimeWindow.__DEV_USER_EMAIL__ && DASHBOARD_DEV_USER_EMAIL) {
    runtimeWindow.__DEV_USER_EMAIL__ = DASHBOARD_DEV_USER_EMAIL;
  }
};