// ─────────────────────────────────────────────────────────────────────────────
// Category icons
//
// In plain words: which picture goes with each kind of category (people for
// Payroll, a building for Rent, …), and its name in the icon picker.
//
// For developers: maps CategoryIconKey (types/finance.ts) to Lucide icons.
// Add a key there and here together.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Briefcase,
  Building2,
  Laptop,
  Megaphone,
  MoreHorizontal,
  Plane,
  Receipt,
  TrendingUp,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconKey } from "@/types/finance";

export const CATEGORY_ICONS: Record<CategoryIconKey, { icon: LucideIcon; label: string }> = {
  income: { icon: TrendingUp, label: "Income" },
  users: { icon: Users, label: "People" },
  building: { icon: Building2, label: "Building" },
  laptop: { icon: Laptop, label: "Computer" },
  megaphone: { icon: Megaphone, label: "Marketing" },
  plane: { icon: Plane, label: "Travel" },
  utensils: { icon: UtensilsCrossed, label: "Meals" },
  receipt: { icon: Receipt, label: "Taxes & fees" },
  briefcase: { icon: Briefcase, label: "Services" },
  more: { icon: MoreHorizontal, label: "Other" },
};
