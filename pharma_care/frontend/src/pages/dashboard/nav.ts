import {
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Pill,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

// Single source of truth for the facility dashboard navigation
// (sidebar + page search both derive from this list).
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { to: "/dashboard", label: "Tableau de Bord", icon: LayoutDashboard, end: true },
  { to: "/dashboard/pos", label: "Caisse (POS)", icon: ShoppingCart },
  { to: "/dashboard/inventory", label: "Inventaire Médicaments", icon: Pill },
  { to: "/dashboard/patients", label: "Patients & Clients", icon: Users },
  { to: "/dashboard/orders", label: "Commandes Patients", icon: ShoppingBag },
  { to: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { to: "/dashboard/suppliers", label: "Fournisseurs", icon: Truck },
  { to: "/dashboard/analytics", label: "Analyses", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Profile", icon: Settings },
];
