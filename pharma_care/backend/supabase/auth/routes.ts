import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { admin, credentialClient } from "../client.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";

const router = Router();


function authError(
  res: Response,
  status: number,
  code: string,
  message: string,
  detail?: unknown
): Response {
  if (detail) console.error(`[auth] ${code}:`, detail);
  return res.status(status).json({ error: message, code });
}

// Generic limiter for the unauthenticated auth endpoints (login/signup) to
// blunt brute-force/credential-stuffing attempts. Keyed by IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    authError(res, 429, "TOO_MANY_ATTEMPTS", "Trop de tentatives. Réessayez plus tard."),
});

interface PharmacyPayload {
  name?: string;
  address?: string;
  commune?: string;
  province?: string;
  phone?: string;
  currency?: string;
  nif?: string;
  rc?: string;
  expiryAlertMonths?: number | string;
  lowStockAlertLevel?: number | string;
}

const REQUIRED_PHARMACY_FIELDS: (keyof PharmacyPayload)[] = [
  "name",
  "address",
  "commune",
  "province",
  "phone",
  "expiryAlertMonths",
  "lowStockAlertLevel",
];

function validatePharmacy(payload: PharmacyPayload): string | null {
  const missing = REQUIRED_PHARMACY_FIELDS.filter((k) => {
    const v = payload?.[k];
    return v === undefined || v === null || v === "";
  });
  if (missing.length) {
    return `Champs requis manquants: ${missing.join(", ")}`;
  }
  const months = Number(payload.expiryAlertMonths);
  const low = Number(payload.lowStockAlertLevel);
  if (!Number.isFinite(months) || months <= 0) {
    return "Alerte Péremption Proche (Mois) doit être un nombre positif";
  }
  if (!Number.isFinite(low) || low < 0) {
    return "Seuil d'Alerte de Stock Bas doit être un nombre positif ou nul";
  }
  return null;
}

// Signup route to create a new user and pharmacy settings
router.post("/signup", authLimiter, async (req: Request, res: Response) => {
  const { email, password, pharmacy } = req.body || {};
  if (!email || !password) {
    return authError(res, 400, "MISSING_CREDENTIALS", "Email et mot de passe requis");
  }
  if (String(password).length < 8) {
    return authError(res, 400, "WEAK_PASSWORD", "Mot de passe trop court (min 8 caractères)");
  }
  const validationError = validatePharmacy((pharmacy as PharmacyPayload) || {});
  if (validationError) return authError(res, 400, "VALIDATION_ERROR", validationError);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pharmacy_name: pharmacy.name },
    app_metadata: { role: "facility_admin" },
  });

  if (createError || !created?.user) {
    const code = /registered|exists/i.test(createError?.message || "") ? "EMAIL_IN_USE" : "SIGNUP_FAILED";
    return authError(
      res,
      400,
      code,
      code === "EMAIL_IN_USE" ? "Un compte existe déjà avec cet email" : "Création du compte impossible",
      createError
    );
  }

  const userId = created.user.id;

  // Use RPC to create pharmacy settings (bypasses RLS when called with service role)
  const { error: settingsError } = await admin.rpc("create_pharmacy_settings", {
    p_user_id: userId,
    p_name: pharmacy.name,
    p_address: pharmacy.address,
    p_commune: pharmacy.commune,
    p_province: pharmacy.province,
    p_phone: pharmacy.phone,
    p_currency: pharmacy.currency || "FBU",
    p_nif: pharmacy.nif || null,
    p_rc: pharmacy.rc || null,
    p_expiry_alert_months: Number(pharmacy.expiryAlertMonths),
    p_low_stock_alert_level: Number(pharmacy.lowStockAlertLevel),
  });

  if (settingsError) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return authError(res, 500, "SIGNUP_FAILED", "Échec de la création du profil pharmacie", settingsError);
  }

  const { data: signIn, error: signInError } = await credentialClient().auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", signInError);
  }
  return res.json({ session: signIn.session, user: signIn.user });
});

interface PatientProfilePayload {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  allergies?: string;
}

// Patient signup: creates an auth user with the "patient" role and a patient profile
router.post("/signup/patient", authLimiter, async (req: Request, res: Response) => {
  const { email, password, profile } = req.body || {};
  if (!email || !password) {
    return authError(res, 400, "MISSING_CREDENTIALS", "Email et mot de passe requis");
  }
  if (String(password).length < 8) {
    return authError(res, 400, "WEAK_PASSWORD", "Mot de passe trop court (min 8 caractères)");
  }
  const p = (profile as PatientProfilePayload) || {};
  if (!p.fullName || !String(p.fullName).trim()) {
    return authError(res, 400, "VALIDATION_ERROR", "Nom complet requis");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: p.fullName },
    app_metadata: { role: "patient" },
  });
  if (createError || !created?.user) {
    const code = /registered|exists/i.test(createError?.message || "") ? "EMAIL_IN_USE" : "SIGNUP_FAILED";
    return authError(
      res,
      400,
      code,
      code === "EMAIL_IN_USE" ? "Un compte existe déjà avec cet email" : "Création du compte impossible",
      createError
    );
  }
  const userId = created.user.id;

  const { error: profileError } = await admin.from("patient_profiles").insert({
    user_id: userId,
    full_name: String(p.fullName).trim(),
    phone: p.phone || null,
    date_of_birth: p.dateOfBirth || null,
    gender: p.gender || null,
    address: p.address || null,
    allergies: p.allergies || null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return authError(res, 500, "SIGNUP_FAILED", "Échec de la création du profil patient", profileError);
  }

  const { data: signIn, error: signInError } = await credentialClient().auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", signInError);
  }
  return res.json({ session: signIn.session, user: signIn.user });
});

// if the user is already logged in, return their session and user info

router.post("/login", authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return authError(res, 400, "MISSING_CREDENTIALS", "Email et mot de passe requis");
  }
  const { data, error } = await credentialClient().auth.signInWithPassword({ email, password });
  if (error) {
    // Never distinguish "no such account" from "wrong password" — avoids
    // user enumeration via response text.
    return authError(res, 401, "INVALID_CREDENTIALS", "Email ou mot de passe incorrect", error);
  }
  return res.json({ session: data.session, user: data.user });
});

// Logout route to sign out the user 
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const token = (req as AuthedRequest).accessToken;
  await admin.auth.admin.signOut(token).catch(() => {});
  return res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const { user, role } = req as AuthedRequest;

  if (role === "patient") {
    const { data, error } = await admin
      .from("patient_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (error && error.code !== "PGRST116") {
      return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", error);
    }
    return res.json({ user, role, pharmacy: null, patientProfile: data || null });
  }

  const { data, error } = await admin
    .from("pharmacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error && error.code !== "PGRST116") {
    return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", error);
  }
  return res.json({ user, role, pharmacy: data || null, patientProfile: null });
});

// Called right after a GitHub OAuth redirect completes. A first-time OAuth
// sign-in has a valid session but no role in app_metadata and no profile row
// (unlike email/password signup, which sets both atomically server-side
// before ever returning a session). This assigns the role once (from the
// caller's intent, if this is genuinely the first time) and reports whether
// a profile row still needs to be filled in.
router.post("/oauth/finish", requireAuth, async (req: Request, res: Response) => {
  const user = (req as AuthedRequest).user;
  const intent = req.body?.intent;
  const rawRole = (user.app_metadata as Record<string, unknown> | null)?.role;

  let role: "patient" | "facility_admin" | null = null;
  if (rawRole === "patient" || rawRole === "facility_admin") {
    role = rawRole;
  } else if (intent === "patient" || intent === "pharmacy") {
    role = intent === "patient" ? "patient" : "facility_admin";
    const { error: roleError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...(user.app_metadata || {}), role },
    });
    if (roleError) {
      return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", roleError);
    }
  }

  if (!role) {
    return res.json({ role: null, profileComplete: false });
  }

  const table = role === "patient" ? "patient_profiles" : "pharmacy_settings";
  const { data, error } = await admin.from(table).select("user_id").eq("user_id", user.id).single();
  if (error && error.code !== "PGRST116") {
    return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", error);
  }
  return res.json({ role, profileComplete: !!data });
});

// Creates the missing pharmacy_settings/patient_profiles row for a user who
// signed in via GitHub OAuth (role already assigned by /oauth/finish).
router.post("/oauth/profile", requireAuth, async (req: Request, res: Response) => {
  const { user, role } = req as AuthedRequest;
  const table = role === "patient" ? "patient_profiles" : "pharmacy_settings";
  const { data: existing } = await admin.from(table).select("user_id").eq("user_id", user.id).single();
  if (existing) {
    return authError(res, 400, "PROFILE_EXISTS", "Profil déjà complété");
  }

  if (role === "patient") {
    const p = (req.body?.profile as PatientProfilePayload) || {};
    if (!p.fullName || !String(p.fullName).trim()) {
      return authError(res, 400, "VALIDATION_ERROR", "Nom complet requis");
    }
    const { data, error } = await admin
      .from("patient_profiles")
      .insert({
        user_id: user.id,
        full_name: String(p.fullName).trim(),
        phone: p.phone || null,
        date_of_birth: p.dateOfBirth || null,
        gender: p.gender || null,
        address: p.address || null,
        allergies: p.allergies || null,
      })
      .select()
      .single();
    if (error) return authError(res, 500, "SERVER_ERROR", "Échec de la création du profil patient", error);
    return res.json(data);
  }

  const pharmacy = (req.body?.pharmacy as PharmacyPayload) || {};
  const validationError = validatePharmacy(pharmacy);
  if (validationError) return authError(res, 400, "VALIDATION_ERROR", validationError);

  const { error: settingsError } = await admin.rpc("create_pharmacy_settings", {
    p_user_id: user.id,
    p_name: pharmacy.name,
    p_address: pharmacy.address,
    p_commune: pharmacy.commune,
    p_province: pharmacy.province,
    p_phone: pharmacy.phone,
    p_currency: pharmacy.currency || "FBU",
    p_nif: pharmacy.nif || null,
    p_rc: pharmacy.rc || null,
    p_expiry_alert_months: Number(pharmacy.expiryAlertMonths),
    p_low_stock_alert_level: Number(pharmacy.lowStockAlertLevel),
  });
  if (settingsError) {
    return authError(res, 500, "SERVER_ERROR", "Échec de la création du profil pharmacie", settingsError);
  }
  const { data } = await admin.from("pharmacy_settings").select("*").eq("user_id", user.id).single();
  return res.json(data);
});

// route to delete the user account and all associated data
router.delete("/account", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user.id;
  const tables = [
    "sales",
    "restock_orders",
    "medicines",
    "patients",
    "suppliers",
    "notifications",
    "pharmacy_settings",
    "patient_profiles",
  ];
  // iterate over the tables and delete all rows where user_id matches
  for (const t of tables) {
    await admin.from(t).delete().eq("user_id", userId);
  }
  // patient_medications is keyed by patient_user_id, not user_id
  await admin.from("patient_medications").delete().eq("patient_user_id", userId);

  // Prescription uploads live in storage, not a table, so FK cascade never
  // touches them — remove anything under this user's prefix before the
  // account (and the medication_orders rows referencing it) is gone.
  const { data: files } = await admin.storage.from("prescriptions").list(userId);
  if (files && files.length > 0) {
    await admin.storage.from("prescriptions").remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return authError(res, 500, "SERVER_ERROR", "Une erreur est survenue, réessayez", error);
  return res.json({ ok: true });
});

// export at the router with all the routes api endpoints
export default router;
