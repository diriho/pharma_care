import { Router, type Request, type Response } from "express";
import { admin } from "../client.js";
import { requireAuth, requireRole, type AuthedRequest } from "../../middleware/auth.js";
import {
  createNotification,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.js";
import {
  deleteMessage,
  getConversationForUser,
  getMessages,
  listConversations,
  sendMessage,
} from "../services/messaging.js";
import { listPharmacyRatings, ratePharmacy } from "../services/ratings.js";
import { getPrescriptionSignedUrl } from "../services/prescriptions.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("patient"));

const PHARMACY_DIRECTORY_COLUMNS =
  "user_id,name,address,commune,province,phone,operating_hours,rating_avg,rating_count";

// ============== Pharmacies ==============

router.get("/pharmacies", async (_req: Request, res: Response) => {
  try {
    const [{ data: pharmacies, error }, { data: meds }] = await Promise.all([
      admin
        .from("pharmacy_settings")
        .select(PHARMACY_DIRECTORY_COLUMNS)
        .order("rating_avg", { ascending: false }),
      admin.from("medicines").select("user_id").gt("stock", 0),
    ]);
    if (error) return res.status(500).json({ error: error.message });

    const availableByPharmacy = new Map<string, number>();
    for (const m of (meds || []) as { user_id: string }[]) {
      availableByPharmacy.set(m.user_id, (availableByPharmacy.get(m.user_id) || 0) + 1);
    }
    res.json(
      (pharmacies || []).map((p) => ({
        ...p,
        medicines_available: availableByPharmacy.get(p.user_id) || 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.get("/pharmacies/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await admin
      .from("pharmacy_settings")
      .select(PHARMACY_DIRECTORY_COLUMNS)
      .eq("user_id", req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: "Pharmacie introuvable" });
    const ratings = await listPharmacyRatings(req.params.id, 10);
    res.json({ ...data, recent_ratings: ratings });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.get("/pharmacies/:id/medicines", async (req: Request, res: Response) => {
  try {
    const { data, error } = await admin
      .from("medicines")
      .select("id,name,dosage,molecule,category,stock,selling_price")
      .eq("user_id", req.params.id)
      .order("name");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.get("/pharmacies/:id/ratings", async (req: Request, res: Response) => {
  try {
    res.json(await listPharmacyRatings(req.params.id));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/pharmacies/:id/ratings", async (req: Request, res: Response) => {
  try {
    const patientUserId = (req as AuthedRequest).user.id;
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "La note doit être comprise entre 1 et 5" });
    }
    const { data: pharmacy } = await admin
      .from("pharmacy_settings")
      .select("user_id")
      .eq("user_id", req.params.id)
      .single();
    if (!pharmacy) return res.status(404).json({ error: "Pharmacie introuvable" });

    const saved = await ratePharmacy(
      req.params.id,
      patientUserId,
      rating,
      req.body?.review
    );
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// ============== Medicine finder ==============

router.get("/medicines/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(400).json({ error: "Saisissez au moins 2 caractères" });
    }
    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    const { data: meds, error } = await admin
      .from("medicines")
      .select("id,user_id,name,dosage,molecule,category,stock,selling_price")
      .or(`name.ilike.${pattern},molecule.ilike.${pattern}`)
      .order("name")
      .limit(60);
    if (error) return res.status(500).json({ error: error.message });

    const results = (meds || []) as {
      id: string;
      user_id: string;
      name: string;
      dosage: string | null;
      molecule: string | null;
      category: string | null;
      stock: number;
      selling_price: number;
    }[];
    if (results.length === 0) return res.json([]);

    const pharmacyIds = Array.from(new Set(results.map((m) => m.user_id)));
    const { data: pharmacies } = await admin
      .from("pharmacy_settings")
      .select("user_id,name,address,commune,province")
      .in("user_id", pharmacyIds);
    const byId = new Map((pharmacies || []).map((p) => [p.user_id, p]));

    res.json(
      results.map((m) => ({
        id: m.id,
        medicine: m.name,
        dosage: m.dosage,
        molecule: m.molecule,
        category: m.category,
        quantity: m.stock,
        price: m.selling_price,
        pharmacy: byId.get(m.user_id) || null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// ============== Orders ==============

type OrderItem = {
  medicine_id: string;
  name?: string;
  quantity: number;
  unit_price?: number;
};

router.get("/orders", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: orders, error } = await admin
      .from("medication_orders")
      .select("*")
      .eq("patient_user_id", userId)
      .is("patient_deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const list = orders || [];
    const pharmacyIds = Array.from(
      new Set(list.map((o: { pharmacy_user_id: string }) => o.pharmacy_user_id))
    );
    const names = new Map<string, string>();
    if (pharmacyIds.length > 0) {
      const { data: pharmacies } = await admin
        .from("pharmacy_settings")
        .select("user_id,name")
        .in("user_id", pharmacyIds);
      for (const p of pharmacies || []) names.set(p.user_id, p.name);
    }
    res.json(
      list.map((o: { pharmacy_user_id: string }) => ({
        ...o,
        pharmacy_name: names.get(o.pharmacy_user_id) || "Pharmacie",
      }))
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/orders", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { pharmacyUserId, items, notes, prescription } = req.body || {};
    if (!pharmacyUserId) {
      return res.status(400).json({ error: "Pharmacie requise" });
    }
    const orderItems = (Array.isArray(items) ? items : []) as OrderItem[];
    if (orderItems.length === 0 && !prescription?.base64) {
      return res
        .status(400)
        .json({ error: "Ajoutez des médicaments ou une ordonnance" });
    }

    // Price and validate items server-side against the pharmacy's catalog
    let total = 0;
    const pricedItems: OrderItem[] = [];
    for (const it of orderItems) {
      if (!it.medicine_id || !Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) {
        return res.status(400).json({ error: "Article invalide" });
      }
      const { data: med } = await admin
        .from("medicines")
        .select("id,name,stock,selling_price")
        .eq("id", it.medicine_id)
        .eq("user_id", pharmacyUserId)
        .single();
      if (!med) {
        return res.status(400).json({ error: `Médicament introuvable: ${it.medicine_id}` });
      }
      const quantity = Number(it.quantity);
      total += quantity * (med.selling_price || 0);
      pricedItems.push({
        medicine_id: med.id,
        name: med.name,
        quantity,
        unit_price: med.selling_price || 0,
      });
    }

    // Optional prescription upload (base64 → private storage bucket)
    let prescriptionPath: string | null = null;
    if (prescription?.base64) {
      const base64 = String(prescription.base64).replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const safeName = String(prescription.filename || "ordonnance")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 80);
      prescriptionPath = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await admin.storage
        .from("prescriptions")
        .upload(prescriptionPath, buffer, {
          contentType: prescription.contentType || "application/octet-stream",
        });
      if (uploadError) {
        return res
          .status(500)
          .json({ error: `Échec du téléversement de l'ordonnance: ${uploadError.message}` });
      }
    }

    const { data: order, error } = await admin
      .from("medication_orders")
      .insert({
        patient_user_id: userId,
        pharmacy_user_id: pharmacyUserId,
        items: pricedItems,
        prescription_path: prescriptionPath,
        total,
        notes: notes || null,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    await createNotification(pharmacyUserId, "new_order", "Nouvelle commande reçue", {
      order_id: order.id,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Signed URL for the prescription attached to one of the patient's own orders
router.get("/orders/:id/prescription", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: order } = await admin
      .from("medication_orders")
      .select("prescription_path")
      .eq("id", req.params.id)
      .eq("patient_user_id", userId)
      .single();
    if (!order?.prescription_path) {
      return res.status(404).json({ error: "Aucune ordonnance pour cette commande" });
    }
    res.json({ url: await getPrescriptionSignedUrl(order.prescription_path) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/orders/:id/cancel", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: order } = await admin
      .from("medication_orders")
      .select("*")
      .eq("id", req.params.id)
      .eq("patient_user_id", userId)
      .single();
    if (!order) return res.status(404).json({ error: "Commande introuvable" });
    if (!["pending", "approved"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Cette commande ne peut plus être annulée" });
    }
    const { data, error } = await admin
      .from("medication_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });

    await createNotification(order.pharmacy_user_id, "order_status", "Commande annulée par le patient", {
      order_id: order.id,
      status: "cancelled",
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Remove a finished order from the patient's own history (soft delete — the
// pharmacy's copy of the same order is unaffected, see migration 005)
router.delete("/orders/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { data: order } = await admin
      .from("medication_orders")
      .select("status")
      .eq("id", req.params.id)
      .eq("patient_user_id", userId)
      .single();
    if (!order) return res.status(404).json({ error: "Commande introuvable" });
    if (!["completed", "cancelled"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Seules les commandes terminées ou annulées peuvent être supprimées" });
    }
    const { error } = await admin
      .from("medication_orders")
      .update({ patient_deleted_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("patient_user_id", userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// ============== Drug history (paginated) ==============

router.get("/medications", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const from = (page - 1) * pageSize;

    const { data, error, count } = await admin
      .from("patient_medications")
      .select("*", { count: "exact" })
      .eq("patient_user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ items: data || [], total: count || 0, page, pageSize });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// ============== Profile ==============

router.put("/profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const allowed = [
      "full_name",
      "phone",
      "date_of_birth",
      "gender",
      "address",
      "allergies",
    ];
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (k in (req.body || {})) payload[k] = req.body[k] || null;
    if ("full_name" in payload && !String(payload.full_name || "").trim()) {
      return res.status(400).json({ error: "Nom complet requis" });
    }
    const { data, error } = await admin
      .from("patient_profiles")
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

// ============== Messaging ==============

router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    res.json(await listConversations(userId, "patient"));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const { pharmacyUserId, subject } = req.body || {};
    if (!pharmacyUserId) return res.status(400).json({ error: "Pharmacie requise" });

    const { data, error } = await admin
      .from("conversations")
      .upsert(
        {
          patient_user_id: userId,
          pharmacy_user_id: pharmacyUserId,
          subject: subject || null,
        },
        { onConflict: "patient_user_id,pharmacy_user_id" }
      )
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
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

// Delete (soft) one of the caller's own messages
router.delete(
  "/conversations/:id/messages/:messageId",
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthedRequest).user.id;
      const conversation = await getConversationForUser(req.params.id, userId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation introuvable" });
      }
      await deleteMessage(conversation, userId, req.params.messageId);
      res.json({ ok: true });
    } catch (err) {
      const message = (err as Error).message || "Erreur serveur";
      const status = message.includes("introuvable")
        ? 404
        : message.includes("propres messages")
          ? 403
          : 500;
      res.status(status).json({ error: message });
    }
  }
);

// ============== Notifications ==============

router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    res.json(await listNotifications(userId));
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

router.post("/notifications/read-all", async (req: Request, res: Response) => {
  try {
    await markAllNotificationsRead((req as AuthedRequest).user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// Delete (soft) one of the caller's own notifications — read or unread
router.delete("/notifications/:id", async (req: Request, res: Response) => {
  try {
    await deleteNotification((req as AuthedRequest).user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

// ============== Dashboard aggregate ==============

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthedRequest).user.id;
    const [profileRes, medsRes, ordersRes, notifs, convos, pharmaciesRes] =
      await Promise.all([
        admin.from("patient_profiles").select("*").eq("user_id", userId).single(),
        admin
          .from("patient_medications")
          .select("*")
          .eq("patient_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        admin
          .from("medication_orders")
          .select("*")
          .eq("patient_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        listNotifications(userId, 5),
        listConversations(userId, "patient"),
        admin
          .from("pharmacy_settings")
          .select(PHARMACY_DIRECTORY_COLUMNS)
          .order("rating_avg", { ascending: false })
          .limit(3),
      ]);

    const orders = ordersRes.data || [];
    const pharmacyIds = Array.from(
      new Set(orders.map((o: { pharmacy_user_id: string }) => o.pharmacy_user_id))
    );
    const names = new Map<string, string>();
    if (pharmacyIds.length > 0) {
      const { data: pharmacies } = await admin
        .from("pharmacy_settings")
        .select("user_id,name")
        .in("user_id", pharmacyIds);
      for (const p of pharmacies || []) names.set(p.user_id, p.name);
    }

    res.json({
      profile: profileRes.data || null,
      medications: medsRes.data || [],
      orders: orders.map((o: { pharmacy_user_id: string }) => ({
        ...o,
        pharmacy_name: names.get(o.pharmacy_user_id) || "Pharmacie",
      })),
      notifications: notifs.items,
      unreadNotifications: notifs.unread,
      unreadMessages: convos.reduce((sum, c) => sum + c.unread, 0),
      topPharmacies: pharmaciesRes.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Erreur serveur" });
  }
});

export default router;
