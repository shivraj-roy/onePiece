import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.jsx";
import { LanguageProvider } from "./LanguageContext.jsx";

createRoot(document.getElementById("root")).render(
   <StrictMode>
      <LanguageProvider>
         <App />
         <Analytics />
      </LanguageProvider>
   </StrictMode>
);
