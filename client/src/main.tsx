import { createRoot } from "react-dom/client";
import App from "./App";
import { DeviceProvider } from "./contexts/DeviceContext";
import "./index.css";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <DeviceProvider>
    <App />
  </DeviceProvider>
);
