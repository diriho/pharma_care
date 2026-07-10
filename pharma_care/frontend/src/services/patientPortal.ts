import { api } from "../api/client";
import type {
  Conversation,
  MedicationOrder,
  MedicineSearchResult,
  Message,
  Paginated,
  PatientDashboardData,
  PatientMedication,
  PatientNotification,
  PharmacyDetails,
  PharmacyMedicine,
  PharmacyRating,
  PharmacySummary,
} from "../types/patient";

// ============== Dashboard ==============

export function getPatientDashboard() {
  return api<PatientDashboardData>("/patient/dashboard");
}

// ============== Pharmacies ==============

export function getPharmacies() {
  return api<PharmacySummary[]>("/patient/pharmacies");
}

export function getPharmacyDetails(pharmacyId: string) {
  return api<PharmacyDetails>(`/patient/pharmacies/${pharmacyId}`);
}

export function getPharmacyMedicines(pharmacyId: string) {
  return api<PharmacyMedicine[]>(`/patient/pharmacies/${pharmacyId}/medicines`);
}

export function ratePharmacy(pharmacyId: string, rating: number, review?: string) {
  return api<PharmacyRating>(`/patient/pharmacies/${pharmacyId}/ratings`, {
    method: "POST",
    body: JSON.stringify({ rating, review }),
  });
}

// ============== Medicine finder ==============

export function searchMedicines(query: string) {
  return api<MedicineSearchResult[]>(
    `/patient/medicines/search?q=${encodeURIComponent(query)}`
  );
}

// ============== Orders ==============

export function getOrders() {
  return api<MedicationOrder[]>("/patient/orders");
}

export type NewOrderPayload = {
  pharmacyUserId: string;
  items: { medicine_id: string; quantity: number }[];
  notes?: string;
  prescription?: { base64: string; filename: string; contentType: string };
};

export function createOrder(payload: NewOrderPayload) {
  return api<MedicationOrder>("/patient/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function cancelOrder(orderId: string) {
  return api<MedicationOrder>(`/patient/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export function getOrderPrescriptionUrl(orderId: string) {
  return api<{ url: string }>(`/patient/orders/${orderId}/prescription`);
}

// ============== Drug history ==============

export function getMedications(page = 1, pageSize = 10) {
  return api<Paginated<PatientMedication>>(
    `/patient/medications?page=${page}&pageSize=${pageSize}`
  );
}

// ============== Profile ==============

export function updatePatientProfile(payload: Record<string, unknown>) {
  return api("/patient/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ============== Messaging ==============

export function getConversations() {
  return api<Conversation[]>("/patient/conversations");
}

export function startConversation(pharmacyUserId: string, subject?: string) {
  return api<Conversation>("/patient/conversations", {
    method: "POST",
    body: JSON.stringify({ pharmacyUserId, subject }),
  });
}

export function getMessages(conversationId: string) {
  return api<Message[]>(`/patient/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, body: string) {
  return api<Message>(`/patient/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteMessage(conversationId: string, messageId: string) {
  return api(`/patient/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

// ============== Notifications ==============

export function getNotifications() {
  return api<{ items: PatientNotification[]; unread: number }>(
    "/patient/notifications"
  );
}

export function markNotificationRead(id: string) {
  return api(`/patient/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return api("/patient/notifications/read-all", { method: "POST" });
}

export function deleteNotification(id: string) {
  return api(`/patient/notifications/${id}`, { method: "DELETE" });
}
