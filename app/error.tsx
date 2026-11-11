"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="signal-page fade-in" role="alert">
      <div className="crt">
        <div className="crt-screen">
          <div className="signal-static" aria-hidden="true" />
          <div className="crt-content">
            <h1 className="signal-title neon-magenta">SEÑAL PERDIDA</h1>
          </div>
        </div>
      </div>
      <p className="signal-text">
        No se pudo conectar con el vault. Comprueba tu conexión y vuelve a
        intentarlo.
      </p>
      <button className="btn lg" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}
