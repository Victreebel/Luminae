import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installRuntimePerformancePolicy } from "./lib/runtimePerformance";

installRuntimePerformancePolicy();

createRoot(document.getElementById("root")!).render(<App />);
