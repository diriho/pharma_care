import { Router, type Request, type Response } from "express";
import { admin } from "../client";
import { requireAuth, type AuthedRequest } from "../../middleware/auth";

const router = Router();
router.use(requireAuth);

function scoped(table: string, userId: string) {
  return admin.from(table).select("*").eq("user_id", userId);
}

function makeResource(table: string): Router {
  const sub = Router();

  sub.get("/", async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user.id;
    const { data, error } = await admin
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  sub.post("/", async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user.id;
    const payload: Record<string, unknown> = { ...req.body, user_id: userId };
    delete payload.id;
    const { data, error } = await admin.from(table).insert(payload).select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  });

  sub.put("/:id", async (req: Request, res: Response) => {
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
  });

  sub.delete("/:id", async (req: Request, res: Response) => {
    const userId = (req as AuthedRequest).user.id;
    const { error } = await admin
      .from(table)
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  });

  return sub;
}

router.use("/medicines", makeResource("medicines"));
router.use("/suppliers", makeResource("suppliers"));
router.use("/patients", makeResource("patients"));
router.use("/sales", makeResource("sales"));
router.use("/restock-orders", makeResource("restock_orders"));

router.put("/settings", async (req: Request, res: Response) => {
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
});

interface SaleItem {
  medicine_id: string;
  name?: string;
  quantity: number;
  unit_price?: number;
}

router.post("/sales/checkout", async (req: Request, res: Response) => {
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
});

interface OrderLine {
  medicine_id: string;
  quantity: number;
  unit_cost?: number;
}

router.post("/restock-orders/:id/receive", async (req: Request, res: Response) => {
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
});

interface Medicine {
  id: string;
  name: string;
  stock: number;
  min_stock_level?: number;
  expiry_date?: string | null;
  purchase_price?: number;
  selling_price?: number;
}

interface Sale {
  total?: number;
  created_at?: string;
  items?: SaleItem[];
}

router.get("/notifications", async (req: Request, res: Response) => {
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
});

router.get("/analytics", async (req: Request, res: Response) => {
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
  res.json({
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
  });
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
