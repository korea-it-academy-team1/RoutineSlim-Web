import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./global/components/AppErrorBoundary";
import "./global/styles/base.css";
import "./global/styles/features.css";
import "./global/styles/dashboard.css";
import "./global/styles/typography.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
