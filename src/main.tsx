import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { RoomsProvider } from "./contexts/RoomsContext";
import { PWAProvider } from "./contexts/PWAContext";
import { registerSW } from "virtual:pwa-register";

// Register Service Worker with auto-update
registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    if (registration) {
      // Check for updates every 60 minutes
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RoomsProvider>
      <PWAProvider>
        <App />
      </PWAProvider>
    </RoomsProvider>
  </StrictMode>
);

