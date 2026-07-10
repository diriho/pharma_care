import { api } from "../api/client";
import type {
  Conversation,
  MedicationOrder,
  Message,
  OrderStatus,
  PatientNotification,
} from "../types/patient";

// Pharmacy-side view of a patient order
export type PharmacyOrder = MedicationOrder & { patient_name: string };

export type PortalStats = {
  orders: {
    total: number;
    pending: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  conversations: { total: number; active: number };
  ratings: {
    average: number;
    count: number;
    distribution: Record<number, number>;
    recent: {
      id: string;
      rating: number;
      review: string | null;
      updated_at: string;
      patient_name: string;
    }[];
    byMonth: { month: string; average: number; count: number }[];
  };
};

// Patient-portal activity summary for the dashboard
export function getPortalStats() {
  return api<PortalStats>("/data/portal-stats");
}

// ============== Patient orders (pharmacy side) ==============

export function getPatientOrders() {
  return api<PharmacyOrder[]>("/data/patient-orders");
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  return api<MedicationOrder>(`/data/patient-orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function getOrderPrescriptionUrl(orderId: string) {
  return api<{ url: string }>(`/data/patient-orders/${orderId}/prescription`);
}

// ============== Notification inbox (pharmacy side) ==============
// Persisted notifications: new orders, new ratings, new messages…
// (stock/expiry alerts stay on GET /data/notifications)

export function getInboxNotifications() {
  return api<{ items: PatientNotification[]; unread: number }>(
    "/data/notifications/inbox"
  );
}

export function markNotificationRead(id: string) {
  return api(`/data/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api("/data/notifications/read-all", { method: "POST" });
}

export function deleteNotification(id: string) {
  return api(`/data/notifications/${id}`, { method: "DELETE" });
}

// ============== Messaging (pharmacy side) ==============

export function getConversations() {
  return api<Conversation[]>("/data/conversations");
}

export function getMessages(conversationId: string) {
  return api<Message[]>(`/data/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, body: string) {
  return api<Message>(`/data/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteMessage(conversationId: string, messageId: string) {
  return api(`/data/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  });
}
