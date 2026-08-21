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

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[server]", err);
  res.status(500).json({ error: (err as Error)?.message || "Erreur serveur" });
};
app.use(errorHandler);


// Start the server only if not running on Vercel
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Pharma Core backend listening on http://localhost:${PORT}`);
  });
}

// Provide the Express app as the module's default export.
export default app;
