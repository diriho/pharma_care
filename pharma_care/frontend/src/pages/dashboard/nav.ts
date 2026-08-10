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
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
};

// Single source of truth for the facility dashboard navigation
// (sidebar + page search both derive from this list). Labels are i18next
// keys in the "dashboard" namespace, resolved at render time.
export const DASHBOARD_NAV: DashboardNavItem[] = [
  { to: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/pos", labelKey: "nav.pos", icon: ShoppingCart },
  { to: "/dashboard/inventory", labelKey: "nav.inventory", icon: Pill },
  { to: "/dashboard/patients", labelKey: "nav.patients", icon: Users },
  { to: "/dashboard/orders", labelKey: "nav.orders", icon: ShoppingBag },
  { to: "/dashboard/messages", labelKey: "nav.messages", icon: MessageSquare },
  { to: "/dashboard/suppliers", labelKey: "nav.suppliers", icon: Truck },
  { to: "/dashboard/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { to: "/dashboard/settings", labelKey: "nav.settings", icon: Settings },
];
