// Patient portal shared types (mirror the /api/patient responses)

export type OperatingHours = Record<string, string>;

export type PharmacySummary = {
  user_id: string;
  name: string;
  address: string;
  commune: string;
  province: string;
  phone: string;
  operating_hours: OperatingHours | null;
  rating_avg: number;
  rating_count: number;
  medicines_available: number;
};

export type PharmacyRating = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  patient_name: string;
};

export type PharmacyDetails = PharmacySummary & {
  recent_ratings: PharmacyRating[];
};

export type PharmacyMedicine = {
  id: string;
  name: string;
  dosage: string | null;
  molecule: string | null;
  category: string | null;
  stock: number;
  selling_price: number;
};

export type MedicineSearchResult = {
  id: string;
  medicine: string;
  dosage: string | null;
  molecule: string | null;
  category: string | null;
  quantity: number;
  price: number;
  pharmacy: {
    user_id: string;
    name: string;
    address: string;
    commune: string;
    province: string;
  } | null;
};

export type OrderStatus =
  | "pending"
  | "approved"
  | "preparing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type OrderItem = {
  medicine_id: string;
  name?: string;
  quantity: number;
  unit_price?: number;
};

export type MedicationOrder = {
  id: string;
  patient_user_id: string;
  pharmacy_user_id: string;
  items: OrderItem[];
  prescription_path: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pharmacy_name?: string;
};

export type PatientMedication = {
  id: string;
  medication_name: string;
  dosage: string | null;
  physician: string | null;
  start_date: string | null;
  end_date: string | null;
  refills: number;
  status: "active" | "completed" | "stopped";
  notes: string | null;
  created_at: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  patient_user_id: string;
  pharmacy_user_id: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  counterpart_name: string;
  last_message: Message | null;
  unread: number;
};

export type PatientNotification = {
  id: string;
  kind: string;
  message: string;
  meta: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type PatientDashboardData = {
  profile: {
    user_id: string;
    full_name: string;
    phone: string | null;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    allergies: string | null;
  } | null;
  medications: PatientMedication[];
  orders: MedicationOrder[];
  notifications: PatientNotification[];
  unreadNotifications: number;
  unreadMessages: number;
  topPharmacies: PharmacySummary[];
};
