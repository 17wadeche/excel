/* global localStorage */
import { useEffect } from "react";
import { message } from "antd";
import { logger } from "../utils/logger";
import { getWorkbookIdFromProperties } from "../utils/excelUtils";
import { getAuthSession } from "../utils/auth";
import { setApiAuthTokenProvider } from "../utils/apiClient";
interface UseWorkbookIdentityOptions {
  currentWorkbookId: string;
  setCurrentWorkbookId: (workbookId: string) => void;
  setUserEmail: (email: string) => void;
}
export const useWorkbookIdentity = ({
  currentWorkbookId,
  setCurrentWorkbookId,
  setUserEmail,
}: UseWorkbookIdentityOptions) => {
  useEffect(() => {
    let isMounted = true;
    setApiAuthTokenProvider(async () => (await getAuthSession())?.accessToken ?? null);
    const initializeUser = async () => {
      const session = await getAuthSession();
      if (session?.userEmail) {
        if (isMounted) {
          setUserEmail(session.userEmail.toLowerCase());
        }
        return;
      }
      const storedEmail = localStorage.getItem("userEmail");
      if (storedEmail) {
        logger.warn(
          "Using development user email from localStorage. Configure Microsoft 365 SSO for production."
        );
        if (isMounted) {
          setUserEmail(storedEmail.toLowerCase());
        }
        return;
      }
      logger.warn("User email not found in authenticated session or localStorage.");
      if (isMounted) {
        setUserEmail("");
      }
    };
    initializeUser();
    return () => {
      isMounted = false;
      setApiAuthTokenProvider(null);
    };
  }, [setUserEmail]);
  useEffect(() => {
    if (currentWorkbookId) {
      return;
    }
    let isMounted = true;
    const initializeWorkbookId = async () => {
      try {
        const rawWorkbookId = await getWorkbookIdFromProperties();
        if (!rawWorkbookId) {
          logger.warn("Workbook ID not found in workbook properties.");
          return;
        }
        if (isMounted) {
          const workbookId = rawWorkbookId.toLowerCase();
          logger.debug("Front-End: Retrieved Workbook ID from properties:", workbookId);
          setCurrentWorkbookId(workbookId);
        }
      } catch (error) {
        logger.error("Error reading workbook identity:", error);
        message.warning("Could not read this workbook's dashboard identity.");
      }
    };
    initializeWorkbookId();
    return () => {
      isMounted = false;
    };
  }, [currentWorkbookId, setCurrentWorkbookId]);
};