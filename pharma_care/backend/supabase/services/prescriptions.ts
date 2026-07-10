import { admin } from "../client";

const SIGNED_URL_TTL_SECONDS = 3600;

// Short-lived signed URL for a file in the private "prescriptions" bucket.
// Callers are responsible for verifying the requester may see the order.
export async function getPrescriptionSignedUrl(path: string): Promise<string> {
  const { data, error } = await admin.storage
    .from("prescriptions")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Ordonnance introuvable");
  }
  return data.signedUrl;
}
