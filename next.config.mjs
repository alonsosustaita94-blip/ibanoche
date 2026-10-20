/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // BASE_PATH permite publicar el sitio en una subruta (p. ej. GitHub Pages: /disruptors-).
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // STATIC_EXPORT=1 genera una versión estática en /out para cualquier hosting de archivos.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export", trailingSlash: true } : {}),
};

export default nextConfig;
