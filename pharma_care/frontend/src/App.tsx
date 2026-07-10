import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  AuthProvider,
  homePathForRole,
  useAuth,
  type UserRole,
} from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import InventoryPage from "./pages/dashboard/Inventory";
import PosPage from "./pages/dashboard/Pos";
import PatientsPage from "./pages/dashboard/Patients";
import SuppliersPage from "./pages/dashboard/Suppliers";
import AnalyticsPage from "./pages/dashboard/Analytics";
import SettingsPage from "./pages/dashboard/Settings";
import PatientOrdersPage from "./pages/dashboard/PatientOrders";
import PharmacyMessagesPage from "./pages/dashboard/Messages";
import PharmacyNotificationsPage from "./pages/dashboard/Notifications";
import PatientLayout from "./pages/patient/PatientLayout";
import PatientDashboard from "./pages/patient/Dashboard";
import PatientPharmacies from "./pages/patient/Pharmacies";
import FindMedication from "./pages/patient/FindMedication";
import PatientOrders from "./pages/patient/Orders";
import PatientMessages from "./pages/patient/Messages";
import PatientNotifications from "./pages/patient/Notifications";
import DrugHistory from "./pages/patient/History";
import HealthRecords from "./pages/patient/HealthRecords";
import PatientProfile from "./pages/patient/Profile";

// Guard a subtree to authenticated users of a given role; users with another
// role are sent to their own home instead.
function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactElement;
  role: UserRole;
}) {
  const { user, role: userRole, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Chargement…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== role) return <Navigate to={homePathForRole(userRole)} replace />;
  return children;
}

function PublicOnly({ children }: { children: React.ReactElement }) {
  const { user, role } = useAuth();
  if (user) return <Navigate to={homePathForRole(role)} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnly>
                <Signup />
              </PublicOnly>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="facility_admin">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="orders" element={<PatientOrdersPage />} />
            <Route path="messages" element={<PharmacyMessagesPage />} />
            <Route path="notifications" element={<PharmacyNotificationsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route
            path="/patient"
            element={
              <ProtectedRoute role="patient">
                <PatientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/patient/dashboard" replace />} />
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="pharmacies" element={<PatientPharmacies />} />
            <Route path="find-medication" element={<FindMedication />} />
            <Route path="orders" element={<PatientOrders />} />
            <Route path="messages" element={<PatientMessages />} />
            <Route path="notifications" element={<PatientNotifications />} />
            <Route path="history" element={<DrugHistory />} />
            <Route path="health-records" element={<HealthRecords />} />
            <Route path="profile" element={<PatientProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
