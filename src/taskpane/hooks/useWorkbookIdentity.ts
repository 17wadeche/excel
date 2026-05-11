/* global localStorage */
import { useEffect } from "react";
import { message } from "antd";
import { logger } from "../utils/logger";
import { getWorkbookIdFromProperties } from "../utils/excelUtils";
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
    const storedEmail = localStorage.getItem("userEmail");
    if (storedEmail) {
      setUserEmail(storedEmail);
      return;
    }
    logger.warn("User email not found in localStorage.");
    setUserEmail("");
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