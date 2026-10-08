import Link from "next/link";

export default function AcercaPage() {
  return (
    <div className="about fade-in">
      <section className="about-hero">
        <h1 className="about-title">ACERCA DE</h1>
        <p className="about-mission pixel neon-yellow">PRÓXIMAMENTE</p>
        <div style={{ marginTop: 40 }}>
          <Link href="/" className="btn lg">
            VOLVER AL INICIO
          </Link>
        </div>
      </section>
    </div>
  );
}
