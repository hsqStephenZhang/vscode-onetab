import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import "@arco-design/web-react/dist/css/arco.css";
import { APP } from "./App";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}


const container = createRoot(document.querySelector("#root"));

const vscode = window.acquireVsCodeApi();

container.render(<APP vscode={vscode} />);