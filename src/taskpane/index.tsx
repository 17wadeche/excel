import * as React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import App from "./components/App";

/* global document, Office */

const title = "Workbook Dashboard";

const rootElement = document.getElementById("container");

if (!rootElement) {
  throw new Error("Could not find root element with id 'container'.");
}

const root = createRoot(rootElement);

Office.onReady(() => {
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App title={title} />
    </FluentProvider>
  );
});