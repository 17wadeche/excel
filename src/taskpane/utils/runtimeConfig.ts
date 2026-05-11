/* global window */
declare const DASHBOARD_API_BASE_URL: string;
declare const DASHBOARD_DEV_USER_EMAIL: string;
declare const DASHBOARD_USE_LOCAL_API_FALLBACK: string;
type RuntimeConfigWindow = typeof window & {
  __API_BASE_URL__?: string;
  __DEV_USER_EMAIL__?: string;
  __USE_LOCAL_API_FALLBACK__?: boolean;
};
export const initializeRuntimeConfig = () => {
  const runtimeWindow = window as RuntimeConfigWindow;
  if (!runtimeWindow.__API_BASE_URL__ && DASHBOARD_API_BASE_URL) {
    runtimeWindow.__API_BASE_URL__ = DASHBOARD_API_BASE_URL;
  }
  if (!runtimeWindow.__DEV_USER_EMAIL__ && DASHBOARD_DEV_USER_EMAIL) {
    runtimeWindow.__DEV_USER_EMAIL__ = DASHBOARD_DEV_USER_EMAIL;
  }
  if (DASHBOARD_USE_LOCAL_API_FALLBACK) {
    runtimeWindow.__USE_LOCAL_API_FALLBACK__ = DASHBOARD_USE_LOCAL_API_FALLBACK === "true";
  }
};