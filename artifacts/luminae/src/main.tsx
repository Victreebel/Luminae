import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import "./tutorial-live-parity.css";
import { installRuntimePerformancePolicy } from "./lib/runtimePerformance";
import { LUMINAE_API_ORIGIN } from "./lib/network";
import { installOperationalTelemetry } from "./lib/telemetry";

setBaseUrl(LUMINAE_API_ORIGIN || null);
installRuntimePerformancePolicy();
installOperationalTelemetry();

createRoot(document.getElementById("root")!).render(<App />);
