import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";

import authRoutes from "./supabase/auth/routes";
import dataRoutes from "./supabase/dataHandler/routes";
import patientRoutes from "./supabase/patient/routes";

// Create an Express application
const app = express();

// configure the proxy trust settings to avoid serverless crash
app.set("trust proxy", 1);

// configure CORS middleware to allow requests from the frontend
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);
app.use(
  express.json()
);


app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
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
