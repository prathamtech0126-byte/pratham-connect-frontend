import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";


createRoot(document.getElementById("root")!).render(<App />);
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  tracesSampleRate: 1.0,

  environment: import.meta.env.MODE,
});