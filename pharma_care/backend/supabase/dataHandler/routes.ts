import { Router, type Request, type Response } from "express";
import { admin } from "../client";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";
import {
  getConversationForUser,
  getMessages,
  listConversations,
  sendMessage,
} from "../services/messaging";
import { getPrescriptionSignedUrl } from "../services/prescriptions";

const router = Router();
router.use(requireAuth);
// The /api/data surface is the facility dashboard API — patients use /api/patient
router.use(requireRole("facility_admin"));

function scoped(table: string, userId: string) {
  return admin.from(table).select("*").eq("user_id", userId);
}

function makeResource(table: string): Router {
  const sub = Router();

  sub.get("/", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthedRequest).user.id;
      const { data, error } = await admin
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
    }
  });

  sub.post("/", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthedRequest).user.id;
      const payload: Record<string, unknown> = { ...req.body, user_id: userId };
      delete payload.id;
      const { data, error } = await admin.from(table).insert(payload).select().single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
    }
  });


  sub.put("/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthedRequest).user.id;
      const payload: Record<string, unknown> = { ...req.body };
      delete payload.user_id;
      delete payload.id;
      const { data, error } = await admin
        .from(table)
        .update(payload)
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
    }
  });

  sub.delete("/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthedRequest).user.id;
      const { error } = await admin
        .from(table)
        .delete()
        .eq("id", req.params.id)
        .eq("user_id", userId);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
    }
  });

  return sub;
}

// create backend routes to access my tables
router.use("/medicines", makeResource("medicines"));
router.use("/suppliers", makeResource("suppliers"));
router.use("/patients", makeResource("patients"));
router.use("/sales", makeResource("sales"));
router.use("/restock-orders", makeResource("restock_orders"));

router.put("/settings", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const allowed: (keyof typeof req.body)[] = [
      "name",
      "address",
      "commune",
      "province",
      "phone",
      "currency",
      "nif",
      "rc",
      "expiry_alert_months",
      "low_stock_alert_level",
    ];
    const payload: Record<string, unknown> = {};
    for (const k of allowed) if (k in req.body) payload[k as string] = req.body[k];
    const { data, error } = await admin
      .from("pharmacy_settings")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

interface SaleItem {
  medicine_id: string;
  name?: string;
  quantity: number;
  unit_price?: number;
}

// Checkout route to create a sale and decrement stock
router.post("/sales/checkout", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { items, patient_id, total, payment_method, notes } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Aucun article dans la vente" });
    }
    for (const it of items as SaleItem[]) {
      if (!it.medicine_id || !it.quantity) {
        return res.status(400).json({ error: "Article invalide" });
      }
      const { data: med, error: medErr } = await admin
        .from("medicines")
        .select("id,stock,name")
        .eq("id", it.medicine_id)
        .eq("user_id", userId)
        .single();
      if (medErr || !med) {
        return res.status(400).json({ error: `Médicament introuvable: ${it.medicine_id}` });
      }
      if (med.stock < it.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour ${med.name}` });
      }
    }
    const { data: sale, error: saleErr } = await admin
      .from("sales")
      .insert({
        user_id: userId,
        patient_id: patient_id || null,
        items,
        total,
        payment_method: payment_method || "cash",
        notes: notes || null,
      })
      .select()
      .single();
    if (saleErr) return res.status(400).json({ error: saleErr.message });

    for (const it of items as SaleItem[]) {
      await admin.rpc("decrement_medicine_stock", {
        p_medicine_id: it.medicine_id,
        p_quantity: it.quantity,
        p_user: userId,
      });
    }
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// order line interface type definition
interface OrderLine {
  medicine_id: string;
  quantity: number;
  unit_cost?: number;
}

router.post("/restock-orders/:id/receive", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: order, error: oErr } = await admin
      .from("restock_orders")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .single();
    if (oErr || !order) return res.status(404).json({ error: "Commande introuvable" });
    if (order.status === "received") {
      return res.status(400).json({ error: "Commande déjà réceptionnée" });
    }
    for (const line of (order.items || []) as OrderLine[]) {
      await admin.rpc("increment_medicine_stock", {
        p_medicine_id: line.medicine_id,
        p_quantity: line.quantity,
        p_user: userId,
      });
    }
    const { data, error } = await admin
      .from("restock_orders")
      .update({ status: "received", received_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Medicine interface type definition
interface Medicine {
  id: string;
  name: string;
  stock: number;
  min_stock_level?: number;
  expiry_date?: string | null;
  purchase_price?: number;
  selling_price?: number;
}

// Sale interface type definition
interface Sale {
  total?: number;
  created_at?: string;
  items?: SaleItem[];
}

// Notifications route to fetch low stock and expiry alerts
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: settings } = await admin
      .from("pharmacy_settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    const lowStockLevel = settings?.low_stock_alert_level ?? 15;
    const expiryMonths = settings?.expiry_alert_months ?? 6;

    const { data: meds } = await admin
      .from("medicines")
      .select("*")
      .eq("user_id", userId);

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() + expiryMonths);

    const alerts: Array<{
      type: string;
      severity: string;
      medicine_id: string;
      message: string;
    }> = [];
    for (const m of (meds || []) as Medicine[]) {
      const threshold = m.min_stock_level ?? lowStockLevel;
      if (m.stock <= threshold) {
        alerts.push({
          type: "low_stock",
          severity: m.stock === 0 ? "critical" : "warning",
          medicine_id: m.id,
          message: `${m.name} – stock bas (${m.stock} unités)`,
        });
      }
      if (m.expiry_date) {
        const exp = new Date(m.expiry_date);
        if (exp <= now) {
          alerts.push({
            type: "expired",
            severity: "critical",
            medicine_id: m.id,
            message: `${m.name} – périmé depuis le ${m.expiry_date}`,
          });
        } else if (exp <= cutoff) {
          alerts.push({
            type: "expiring_soon",
            severity: "warning",
            medicine_id: m.id,
            message: `${m.name} – expire le ${m.expiry_date}`,
          });
        }
      }
    }
    res.json({ alerts, lowStockLevel, expiryMonths });
  } catch (err) {
    console.error("[notifications] Error:", err);
    res.status(500).json({ error: (err as Error).message || "Notifications fetch failed" });
  }
});

// Persisted notification inbox for the pharmacy (new orders, ratings, messages…).
// Distinct from GET /notifications above, which computes stock/expiry alerts.
router.get("/notifications/inbox", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    res.json(await listNotifications(userId));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/notifications/read-all", async (req: Request, res: Response) => {
  try {
    await markAllNotificationsRead((req as AuthedRequest).user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    await markNotificationRead((req as AuthedRequest).user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Analytics route to fetch counts, inventory value, revenue, and sales trends
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const [medsRes, salesRes, patientsRes, suppliersRes] = await Promise.all([
      scoped("medicines", userId),
      scoped("sales", userId),
      scoped("patients", userId),
      scoped("suppliers", userId),
    ]);
    const meds = (medsRes.data || []) as Medicine[];
    const sales = (salesRes.data || []) as Sale[];
    const patients = patientsRes.data || [];
    const suppliers = suppliersRes.data || [];

    const inventoryValue = meds.reduce(
      (sum, m) => sum + (m.stock || 0) * (m.purchase_price || 0),
      0
    );
    const retailValue = meds.reduce(
      (sum, m) => sum + (m.stock || 0) * (m.selling_price || 0),
      0
    );
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const salesByDay: Record<string, number> = {};
    for (const s of sales) {
      const day = (s.created_at || "").slice(0, 10);
      if (!day) continue;
      salesByDay[day] = (salesByDay[day] || 0) + (s.total || 0);
    }
    const topMedicines: Record<string, number> = {};
    for (const s of sales) {
      for (const it of s.items || []) {
        topMedicines[it.medicine_id] =
          (topMedicines[it.medicine_id] || 0) + (it.quantity || 0);
      }
    }
    const response = {
      counts: {
        medicines: meds.length,
        patients: patients.length,
        suppliers: suppliers.length,
        sales: sales.length,
      },
      inventoryValue,
      retailValue,
      totalRevenue,
      salesByDay,
      topMedicines,
    };
    res.json(response);
  } catch (err) {
    console.error("[analytics] Error:", err);
    res.status(500).json({ error: (err as Error).message || "Analytics fetch failed" });
  }
});

const ORDER_STATUSES = [
  "pending",
  "approved",
  "preparing",
  "ready_for_pickup",
  "completed",
  "cancelled",
] as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "en attente",
  approved: "approuvée",
  preparing: "en préparation",
  ready_for_pickup: "prête pour retrait",
  completed: "terminée",
  cancelled: "annulée",
};

// Patient orders received by this pharmacy
router.get("/patient-orders", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: orders, error } = await admin
      .from("medication_orders")
      .select("*")
      .eq("pharmacy_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const list = orders || [];
    const patientIds = Array.from(
      new Set(list.map((o: { patient_user_id: string }) => o.patient_user_id))
    );
    const names = new Map<string, string>();
    if (patientIds.length > 0) {
      const { data: profiles } = await admin
        .from("patient_profiles")
        .select("user_id,full_name")
        .in("user_id", patientIds);
      for (const p of profiles || []) names.set(p.user_id, p.full_name);
    }
    res.json(
      list.map((o: { patient_user_id: string }) => ({
        ...o,
        patient_name: names.get(o.patient_user_id) || "Patient",
      }))
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Signed URL for the prescription attached to an order received by this pharmacy
router.get("/patient-orders/:id/prescription", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: order } = await admin
      .from("medication_orders")
      .select("prescription_path")
      .eq("id", req.params.id)
      .eq("pharmacy_user_id", userId)
      .single();
    if (!order?.prescription_path) {
      return res.status(404).json({ error: "Aucune ordonnance pour cette commande" });
    }
    res.json({ url: await getPrescriptionSignedUrl(order.prescription_path) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Update an order's status and notify the patient
router.put("/patient-orders/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const status = String(req.body?.status || "");
    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const { data: order } = await admin
      .from("medication_orders")
      .select("*")
      .eq("id", req.params.id)
      .eq("pharmacy_user_id", userId)
      .single();
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const { data, error } = await admin
      .from("medication_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    await createNotification(
      order.patient_user_id,
      "order_status",
      `Votre commande est ${ORDER_STATUS_LABELS[status] || status}`,
      { order_id: order.id, status }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Pharmacy side of patient messaging (list threads, read, reply)
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    res.json(await listConversations(userId, "pharmacy"));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.get("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const conversation = await getConversationForUser(req.params.id, userId);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });
    res.json(await getMessages(conversation.id, userId));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Message vide" });
    const conversation = await getConversationForUser(req.params.id, userId);
    if (!conversation) return res.status(404).json({ error: "Conversation introuvable" });
    res.status(201).json(await sendMessage(conversation, userId, body));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

const WEEKDAYS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

// Weekly patient volume: patients served per day over the last 7 days,
// derived from sales (distinct patients + anonymous walk-in sales).
router.get("/analytics/weekly-patients", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const { data: sales, error } = await admin
      .from("sales")
      .select("patient_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", start.toISOString());
    if (error) return res.status(500).json({ error: error.message });

    type DayBucket = { patients: Set<string>; walkIns: number };
    const buckets = new Map<string, DayBucket>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), { patients: new Set(), walkIns: 0 });
    }
    for (const s of (sales || []) as { patient_id: string | null; created_at: string }[]) {
      const key = (s.created_at || "").slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (s.patient_id) bucket.patients.add(s.patient_id);
      else bucket.walkIns += 1;
    }

    const result = Array.from(buckets.entries()).map(([key, bucket]) => ({
      day: WEEKDAYS_FR[new Date(`${key}T00:00:00`).getDay()],
      patients: bucket.patients.size + bucket.walkIns,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).user.id;
  const [settings, meds, suppliers, patients, sales, restock] = await Promise.all([
    admin.from("pharmacy_settings").select("*").eq("user_id", userId).single(),
    scoped("medicines", userId),
    scoped("suppliers", userId),
    scoped("patients", userId),
    scoped("sales", userId),
    scoped("restock_orders", userId),
  ]);
  const payload = {
    exported_at: new Date().toISOString(),
    pharmacy: settings.data || null,
    medicines: meds.data || [],
    suppliers: suppliers.data || [],
    patients: patients.data || [],
    sales: sales.data || [],
    restock_orders: restock.data || [],
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="pharma-core-export-${Date.now()}.json"`
  );
  res.send(JSON.stringify(payload, null, 2));
});

export default router;
