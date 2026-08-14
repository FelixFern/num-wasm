import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import Docs from "./pages/Docs";
import FunctionPage from "./pages/docs/FunctionPage";
import Home from "./pages/Home";
import { DevNotes } from "./pages/docs/sections/DevNotes";
import { GettingStarted } from "./pages/docs/sections/GettingStarted";
import { NdArray } from "./pages/docs/sections/NdArray";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Home />} />
          <Route path="docs" element={<Docs />}>
            <Route index element={<GettingStarted />} />
            <Route path="ndarray" element={<NdArray />} />
            <Route path="dev-notes" element={<DevNotes />} />
            <Route path=":group/:name" element={<FunctionPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
