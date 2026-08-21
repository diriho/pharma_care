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

export const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/patient", patientRoutes);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[server]", err);
  res.status(500).json({ error: (err as Error)?.message || "Erreur serveur" });
};
app.use(errorHandler);


// Vercel imports this app through api/[...path].ts. Keep the listener for
// local development only; Vercel manages the HTTP server for serverless functions.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Pharma Core backend listening on http://localhost:${PORT}`);
  });
}

// Vercel's Express integration also recognizes server.ts as an application
// entry point, so provide the Express app as the module's default export.
export default app;
