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

// Each icon's name is in the page's words: m.settings.icons
export const CATEGORY_ICONS: Record<CategoryIconKey, { icon: LucideIcon }> = {
  income: { icon: TrendingUp },
  users: { icon: Users },
  building: { icon: Building2 },
  laptop: { icon: Laptop },
  megaphone: { icon: Megaphone },
  plane: { icon: Plane },
  utensils: { icon: UtensilsCrossed },
  receipt: { icon: Receipt },
  briefcase: { icon: Briefcase },
  more: { icon: MoreHorizontal },
};
