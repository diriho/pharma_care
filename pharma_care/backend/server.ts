import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";

import authRoutes from "./supabase/auth/routes";
import dataRoutes from "./supabase/dataHandler/routes";

const app = express();
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

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[server]", err);
  res.status(500).json({ error: (err as Error)?.message || "Erreur serveur" });
};
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Pharma Core backend listening on http://localhost:${PORT}`);
});
