import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

const CHUNK_RECOVERY_KEY = "auri:chunk-recovery";

function recoverFromChunkError(message: string) {
  if (!/Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)) {
    return;
  }

  try {
    if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1") return;

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

    const url = new URL(window.location.href);
    url.searchParams.set("_chunk_recovery", Date.now().toString());

    window.location.replace(url.toString());
  } catch {
    // Mantém o erro normal caso o navegador bloqueie sessionStorage.
  }
}

window.addEventListener("unhandledrejection", (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? "");

  recoverFromChunkError(reason);
});

window.addEventListener("error", (event) => {
  recoverFromChunkError(event.message || "");
});

window.addEventListener("load", () => {
  try {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
  } catch {
    // Ignora restrições do navegador.
  }
});

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
