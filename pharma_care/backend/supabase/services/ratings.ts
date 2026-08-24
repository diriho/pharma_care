import { admin } from "../client.js";
import { createNotification } from "./notifications.js";

export type RatingRow = {
  id: string;
  pharmacy_user_id: string;
  patient_user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
};

// Upsert a patient's rating for a pharmacy (one rating per patient/pharmacy pair),
// refresh the denormalized aggregates and notify the pharmacy.
export async function ratePharmacy(
  pharmacyUserId: string,
  patientUserId: string,
  rating: number,
  review?: string
): Promise<RatingRow> {
  const { data, error } = await admin
    .from("pharmacy_ratings")
    .upsert(
      {
        pharmacy_user_id: pharmacyUserId,
        patient_user_id: patientUserId,
        rating,
        review: review?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pharmacy_user_id,patient_user_id" }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);

  await refreshRatingAggregates(pharmacyUserId);
  await createNotification(
    pharmacyUserId,
    "new_rating",
    `Nouvelle évaluation reçue : ${rating}/5`,
    { rating, patient_user_id: patientUserId }
  );

  return data as RatingRow;
}

// Recompute rating_avg / rating_count on pharmacy_settings.
export async function refreshRatingAggregates(pharmacyUserId: string): Promise<void> {
  const { data, error } = await admin
    .from("pharmacy_ratings")
    .select("rating")
    .eq("pharmacy_user_id", pharmacyUserId);
  if (error) throw new Error(error.message);

  const ratings = (data || []).map((r: { rating: number }) => r.rating);
  const count = ratings.length;
  const avg = count === 0 ? 0 : ratings.reduce((s, r) => s + r, 0) / count;

  await admin
    .from("pharmacy_settings")
    .update({ rating_avg: Math.round(avg * 100) / 100, rating_count: count })
    .eq("user_id", pharmacyUserId);
}

// List ratings of a pharmacy with reviewer display names.
export async function listPharmacyRatings(pharmacyUserId: string, limit = 20) {
  const { data, error } = await admin
    .from("pharmacy_ratings")
    .select("*")
    .eq("pharmacy_user_id", pharmacyUserId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const ratings = (data || []) as RatingRow[];
  if (ratings.length === 0) return [];

  const { data: profiles } = await admin
    .from("patient_profiles")
    .select("user_id,full_name")
    .in("user_id", ratings.map((r) => r.patient_user_id));
  const names = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

  return ratings.map((r) => ({
    ...r,
    patient_name: names.get(r.patient_user_id) || "Patient",
  }));
}
