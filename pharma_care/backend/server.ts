import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";

import authRoutes from "./supabase/auth/routes.js";
import dataRoutes from "./supabase/dataHandler/routes.js";
import patientRoutes from "./supabase/patient/routes.js";

// Create an Express application
const app = express();

// configure the proxy trust settings to avoid serverless crash
app.set("trust proxy", 1);

// CLIENT_ORIGIN accepts a comma-separated list so local dev, the production
// domain, and any custom domain can be allowed at once. Trailing slashes are
// stripped: the browser's Origin header never has one, so "https://x.app/"
// in the env var would silently match nothing.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Vercel gives every preview deployment its own subdomain, so pinning a single
// URL breaks on every branch push. Opt in with ALLOW_VERCEL_PREVIEWS=true.
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === "true";

// configure CORS middleware to allow requests from the frontend
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, server-to-server, or a same-origin request.
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(clean)) return callback(null, true);
      if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(clean)) {
        return callback(null, true);
      }
      // A blocked origin surfaces in the browser only as an opaque
      // "Failed to fetch", so log the exact value CLIENT_ORIGIN is missing.
      console.warn(
        `[cors] blocked origin ${origin} — allowed: ${allowedOrigins.join(", ") || "(none)"}`
      );
      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);
app.use(
  express.json()
);


app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, allowedOrigins, allowVercelPreviews });
});

// Register routes for authentication, data handling, and patient management
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/patient", patientRoutes);

// Anything under /api that no route matched. Without this the request falls
// through to Express' HTML 404 page, which the frontend cannot parse as JSON.
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Route introuvable" });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  console.error("[server]", err);
  // A handler that already started the response cannot be given a new status;
  // hand it to Express' default handler so the socket is closed cleanly.
  if (res.headersSent) return next(err);
  res.status(500).json({ error: (err as Error)?.message || "Erreur serveur" });
};
app.use(errorHandler);

// Last-resort net. Every async handler is wrapped so its rejection reaches the
// middleware above, but an unhandled rejection from anywhere else would
// otherwise tear down the whole serverless instance mid-request. Log it and
// keep the process alive so in-flight requests still get a response.
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled rejection:", reason);
});


// Start the server only if not running on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Pharma Core backend listening on http://localhost:${PORT}`);
    console.log(process.env.CLIENT_ORIGIN, "process.env.CLIENT_ORIGIN");
  });
}

// Provide the Express app as the module's default export.
export default app;
