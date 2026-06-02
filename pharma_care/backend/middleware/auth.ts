import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { admin } from "../supabase/client";

export interface AuthedRequest extends Request {
  user: User;
  accessToken: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing access token" });
    return;
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as AuthedRequest).user = data.user;
  (req as AuthedRequest).accessToken = token;
  next();
}
