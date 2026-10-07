import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">404</h1>
        <div className="sub">
          ESTA PANTALLA NO EXISTE <span className="blink">_</span>
        </div>
      </section>
      <div style={{ textAlign: "center", padding: "0 16px 80px", color: "var(--ink-faint)" }}>
        <p style={{ marginBottom: 24 }}>El juego o la página que buscas no está en el vault.</p>
        <Link href="/" className="btn lg">
          VOLVER AL VAULT
        </Link>
      </div>
    </div>
  );
}
