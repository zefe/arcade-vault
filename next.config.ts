import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo hostname (sin esquema ni puerto): IP LAN para probar en un móvil real (SPEC 09).
  allowedDevOrigins: ["192.168.1.129"],
};

export default nextConfig;
