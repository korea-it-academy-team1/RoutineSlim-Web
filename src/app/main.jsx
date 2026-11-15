import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "../shared/components/AppErrorBoundary";
import "../shared/styles/base.css";
import "../shared/styles/features.css";
import "../shared/styles/dashboard.css";
import "../shared/styles/typography.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
