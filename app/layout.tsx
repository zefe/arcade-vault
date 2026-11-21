import type { Metadata, Viewport } from "next";
import {
  Courier_Prime,
  JetBrains_Mono,
  Press_Start_2P,
} from "next/font/google";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { UserProvider } from "@/lib/user-context";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juega y compite por el puntaje más alto",
};

// Móvil: el fondo cubre notch y barras (viewportFit cover + safe areas en globals.css).
// Sin maximumScale/userScalable: el zoom solo se bloquea en el CRT con touch-action.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0f", // --bg
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetbrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <UserProvider>
            <Nav />
            <main className="av-main">{children}</main>
            <Footer />
          </UserProvider>
        </div>
      </body>
    </html>
  );
}
