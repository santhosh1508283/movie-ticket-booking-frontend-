import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "node:path";
import { fileURLToPath } from "node:url";
const app = express(),
  root = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.API_PROXY_TARGET || "http://localhost:8080";
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.use(
  createProxyMiddleware({
    pathFilter: "/api",
    target,
    changeOrigin: true,
    proxyTimeout: 25000,
    on: {
      error: (_err, _req, res) => {
        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "The booking service is unavailable. Please try again.",
              code: "UPSTREAM_UNAVAILABLE",
            }),
          );
        }
      },
    },
  }),
);
app.use(
  express.static(path.join(root, "dist"), {
    maxAge: "1h",
    setHeaders: (res, file) => {
      if (file.endsWith("index.html"))
        res.setHeader("Cache-Control", "no-cache");
    },
  }),
);
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(root, "dist", "index.html")),
);
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log("FRAME running on port " + port));
