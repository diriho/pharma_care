import type { Request, Response, NextFunction } from "express";
import type { User } from "@supabase/supabase-js";
import { admin } from "../supabase/client.js";

export type UserRole = "facility_admin" | "patient";

export interface AuthedRequest extends Request {
  user: User;
  accessToken: string;
  role: UserRole;
}

// Roles live in app_metadata (server-controlled, not editable by the user).
// Accounts created before roles existed are facility admins.
export function resolveRole(user: User): UserRole {
  const role = (user.app_metadata as Record<string, unknown> | null)?.role;
  return role === "patient" ? "patient" : "facility_admin";
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
  (req as AuthedRequest).role = resolveRole(data.user);
  next();
}

// Restrict a route to one or more roles. Use after requireAuth.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req as AuthedRequest).role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: "Accès refusé pour ce rôle" });
      return;
    }
    next();
  };
}
