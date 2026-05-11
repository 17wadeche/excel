/* global window console */
type LogArgs = unknown[];
const isProductionHost = () =>
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";
export const logger = {
  debug: (...args: LogArgs) => {
    if (!isProductionHost()) {
      console.debug(...args);
    }
  },
  info: (...args: LogArgs) => {
    if (!isProductionHost()) {
      console.info(...args);
    }
  },
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};