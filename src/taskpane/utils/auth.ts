/* global window Office */
import { logger } from "./logger";
export interface AuthSession {
  accessToken: string;
  userEmail: string;
  displayName?: string;
  expiresAt?: number;
  source: "office-sso" | "development";
}
type OfficeUserProfile = {
  email?: string;
  userPrincipalName?: string;
  displayName?: string;
};
type RuntimeAuthWindow = typeof window & {
  __API_AUTH_TOKEN__?: string;
  __DEV_USER_EMAIL__?: string;
};
const runtimeWindow = window as RuntimeAuthWindow;
let cachedSession: AuthSession | null = null;
const parseJwtPayload = (token: string): Record<string, unknown> => {
  const [, payload] = token.split(".");
  if (!payload) {
    return {};
  }
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      window
        .atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    logger.warn("Unable to parse Office SSO token payload:", error);
    return {};
  }
};
const getEmailFromProfile = (): string => {
  const profile = (Office.context as any)?.mailbox?.userProfile as OfficeUserProfile | undefined;
  return profile?.email || profile?.userPrincipalName || "";
};
export const getAuthSession = async (forceRefresh = false): Promise<AuthSession | null> => {
  if (
    !forceRefresh &&
    cachedSession &&
    (!cachedSession.expiresAt || cachedSession.expiresAt > Date.now() + 60000)
  ) {
    return cachedSession;
  }
  try {
    const officeAuth = (Office.context as any)?.auth;
    if (officeAuth?.getAccessToken) {
      const accessToken = await officeAuth.getAccessToken({
        allowSignInPrompt: true,
        allowConsentPrompt: true,
      });
      const payload = parseJwtPayload(accessToken);
      const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
      cachedSession = {
        accessToken,
        expiresAt,
        source: "office-sso",
        userEmail: String(
          payload.preferred_username || payload.upn || payload.email || getEmailFromProfile() || ""
        ),
        displayName: typeof payload.name === "string" ? payload.name : undefined,
      };
      runtimeWindow.__API_AUTH_TOKEN__ = accessToken;
      return cachedSession;
    }
  } catch (error) {
    logger.warn(
      "Office SSO token acquisition failed. Falling back to development identity.",
      error
    );
  }
  if (runtimeWindow.__API_AUTH_TOKEN__ || runtimeWindow.__DEV_USER_EMAIL__) {
    cachedSession = {
      accessToken: runtimeWindow.__API_AUTH_TOKEN__ || "development-token",
      userEmail: runtimeWindow.__DEV_USER_EMAIL__ || "",
      source: "development",
    };
    return cachedSession;
  }
  return null;
};
export const clearAuthSession = () => {
  cachedSession = null;
  delete runtimeWindow.__API_AUTH_TOKEN__;
};