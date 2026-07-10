import { Router, type Request, type Response } from "express";
import { admin, credentialClient } from "../client";
import { requireAuth, type AuthedRequest } from "../../middleware/auth";

const router = Router();

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
router.post("/signup", async (req: Request, res: Response) => {
  const { email, password, pharmacy } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });
  }
  const validationError = validatePharmacy((pharmacy as PharmacyPayload) || {});
  if (validationError) return res.status(400).json({ error: validationError });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pharmacy_name: pharmacy.name },
    app_metadata: { role: "facility_admin" },
  });

  if (createError || !created?.user) {
    return res.status(400).json({ error: createError?.message || "Création utilisateur échouée" });
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
    return res.status(500).json({ error: `Échec création profil: ${settingsError.message}` });
  }

  const { data: signIn, error: signInError } = await credentialClient().auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return res.status(500).json({ error: signInError.message });
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
router.post("/signup/patient", async (req: Request, res: Response) => {
  const { email, password, profile } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Mot de passe trop court (min 6 caractères)" });
  }
  const p = (profile as PatientProfilePayload) || {};
  if (!p.fullName || !String(p.fullName).trim()) {
    return res.status(400).json({ error: "Nom complet requis" });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: p.fullName },
    app_metadata: { role: "patient" },
  });
  if (createError || !created?.user) {
    return res.status(400).json({ error: createError?.message || "Création utilisateur échouée" });
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
    return res.status(500).json({ error: `Échec création profil: ${profileError.message}` });
  }

  const { data: signIn, error: signInError } = await credentialClient().auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return res.status(500).json({ error: signInError.message });
  }
  return res.json({ session: signIn.session, user: signIn.user });
});

// if the user is already logged in, return their session and user info

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  const { data, error } = await credentialClient().auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
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
      return res.status(500).json({ error: error.message });
    }
    return res.json({ user, role, pharmacy: null, patientProfile: data || null });
  }

  const { data, error } = await admin
    .from("pharmacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }
  return res.json({ user, role, pharmacy: data || null, patientProfile: null });
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
    "patient_medications",
  ];
  // iterate over the tables and delete all rows where user_id matches
  for (const t of tables) {
    await admin.from(t).delete().eq("user_id", userId);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// export at the router with all the routes api endpoints
export default router;
