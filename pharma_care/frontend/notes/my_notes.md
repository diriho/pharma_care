## 📝 Side Notes

- **Weekly Patient Volume:** Added a responsive weekly patient volume dashboard widget with loading, empty, and error states. The chart is backed by a new analytics API (`/api/data/analytics/weekly-patients`) with mock data available for development.

- **Patient Portal:** Implemented a complete patient-facing portal with its own authentication flow, dashboard, pharmacy directory, medication search, ordering, messaging, notifications, health records, and profile management.

- **Role-Based Authentication:** Extended the authentication system to support `facility_admin` and `patient` roles using Supabase `app_metadata`. Users are automatically redirected to their respective dashboards, and role-based route protection is enforced across the application.

- **Database Expansion:** Added new patient-related database tables for profiles, medication orders, medications, ratings, conversations, messages, notifications, and health records, along with RLS policies, search indexes, and prescription storage support.

- **Backend Enhancements:** Added dedicated patient APIs for pharmacy browsing, medication search, orders, messaging, ratings, notifications, and dashboard statistics. Administrative APIs were expanded to manage patient orders and conversations.

- **Messaging & Notifications:** Introduced a reusable messaging service and centralized notification system. Order updates and pharmacy ratings automatically generate notifications, making future push/email integration straightforward.

- **Healthcare Data Model:** Added FHIR R4-inspired data models for patient health records, allowing future integration with real electronic health record systems while currently displaying demo medical data where appropriate.

- **UI Improvements:** Introduced reusable UI components (error banners, loading skeletons, empty states, rating widgets, order status badges) and improved responsiveness across both the admin dashboard and patient portal.

- **Architecture Improvements:** Consolidated shared services for messaging, ratings, and notifications, improving maintainability and reducing duplicated logic throughout the application.

- **Known Limitations:** The application currently derives weekly patient volume from sales data. Some healthcare records and laboratory information are demo data intended to be replaced by real clinical integrations in the future.