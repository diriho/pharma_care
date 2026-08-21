import { admin } from "../client.js";

export type NotificationKind =
  | "new_rating"
  | "new_order"
  | "order_status"
  | "new_message"
  | "prescription_approved"
  | "medication_ready"
  | "lab_results"
  | "announcement";

// Single entry point for persisted notifications. Push/email channels can be
// added here later without touching callers (fan-out stays in one place).
//
// Content policy (minimum necessary — see spec §6.1): `message` must stay
// generic — no medication names, dosages, controlled-substance status, or
// other prescription/health detail. The frontend (NotificationCenter)
// re-derives a translated, generic display string from `kind`+`meta` for the
// kinds below and only falls back to this raw `message` for unknown kinds,
// so keep new kinds registered on both sides rather than relying on this
// string alone. Full detail is only ever shown inside the authenticated app.
export async function createNotification(
  userId: string,
  kind: NotificationKind,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    kind,
    message,
    meta,
  });
  if (error) {
    // Notifications are best-effort: never fail the main operation because of them.
    console.error("[notifications] insert failed:", error.message);
  }
}

export async function listNotifications(userId: string, limit = 50) {
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const items = data || [];
  return {
    items,
    unread: items.filter((n: { read_at: string | null }) => !n.read_at).length,
  };
}

// Soft delete: the UPDATE event propagates through Realtime so unread badges
// refresh instantly on every open client of this user.
export async function deleteNotification(userId: string, id: string) {
  const { error } = await admin
    .from("notifications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(userId: string, id: string) {
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
}
