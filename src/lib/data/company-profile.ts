// ─────────────────────────────────────────────────────────────────────────────
// Company details: reading and saving
//
// In plain words: who the company officially is: its registered name, tax
// number and tax office, registration numbers, address and contact
// details, as they'll appear on invoices. Everyone on the team can see
// them; owners and admins can change them. A Turkish tax number is checked
// before it's saved, so a typo doesn't end up on an invoice.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Every field
// is optional: a company fills them in when it needs them.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companyProfile } from "@/db/finance";
import {
  compactNumber,
  isValidMersis,
  isValidTaxId,
} from "@/lib/finance/company-identity";
import { isCountry } from "@/lib/finance/countries";
import { recordAudit } from "./audit";
import { DataError, getFinanceContext, optionalText } from "./common";

/** A company's official details; null where nothing was filled in */
export interface CompanyProfile {
  legalName: string | null;
  /** Two-letter country code, e.g. "TR" */
  country: string | null;
  taxId: string | null;
  taxOffice: string | null;
  mersisNo: string | null;
  tradeRegistryNo: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

const EMPTY: CompanyProfile = {
  legalName: null,
  country: null,
  taxId: null,
  taxOffice: null,
  mersisNo: null,
  tradeRegistryNo: null,
  address: null,
  district: null,
  city: null,
  postalCode: null,
  phone: null,
  email: null,
  website: null,
};

/** The current company's details (all empty until someone fills them in) */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  const { organizationId } = await getFinanceContext();
  const [row] = await db
    .select(
      Object.fromEntries(
        (Object.keys(EMPTY) as (keyof CompanyProfile)[]).map((key) => [key, companyProfile[key]]),
      ) as { [K in keyof CompanyProfile]: (typeof companyProfile)[K] },
    )
    .from(companyProfile)
    .where(eq(companyProfile.organizationId, organizationId));
  return row ?? EMPTY;
}

/** What was typed, checked: numbers without spaces, empty boxes as null */
export function parseCompanyProfile(input: Partial<Record<keyof CompanyProfile, unknown>>) {
  const country = optionalText(input.country, "country", 2);
  if (country !== null && !isCountry(country)) {
    throw new DataError("invalid", { field: "country" });
  }
  const number = (value: unknown, field: "taxId" | "mersisNo" | "tradeRegistryNo") => {
    const text = optionalText(value, field, 40);
    return text === null ? null : compactNumber(text);
  };
  const taxId = number(input.taxId, "taxId");
  if (taxId !== null && !isValidTaxId(taxId, country)) {
    throw new DataError(country === "TR" ? "invalidTurkishTaxId" : "invalid", {
      field: "taxId",
    });
  }
  const mersisNo = number(input.mersisNo, "mersisNo");
  if (mersisNo !== null && !isValidMersis(mersisNo)) {
    throw new DataError("invalidMersis");
  }
  const email = optionalText(input.email, "email", 200);
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DataError("invalid", { field: "email" });
  }
  return {
    legalName: optionalText(input.legalName, "legalName", 250),
    country,
    taxId,
    taxOffice: optionalText(input.taxOffice, "taxOffice", 100),
    mersisNo,
    tradeRegistryNo: number(input.tradeRegistryNo, "tradeRegistryNo"),
    address: optionalText(input.address, "address", 500),
    district: optionalText(input.district, "district", 100),
    city: optionalText(input.city, "city", 100),
    postalCode: optionalText(input.postalCode, "postalCode", 20),
    phone: optionalText(input.phone, "phone", 40),
    email,
    website: optionalText(input.website, "website", 200),
  } satisfies CompanyProfile;
}

/** Saves the company's details (owners and admins only) */
export async function updateCompanyProfile(
  input: Partial<Record<keyof CompanyProfile, unknown>>,
) {
  const actor = await getFinanceContext({ need: "company.update" });
  const profile = parseCompanyProfile(input);
  await db
    .insert(companyProfile)
    .values({ organizationId: actor.organizationId, ...profile })
    .onConflictDoUpdate({
      target: companyProfile.organizationId,
      set: { ...profile, updatedAt: new Date() },
    });
  await recordAudit(actor, {
    area: "settings",
    action: "updated",
    key: "companyDetailsChanged",
  });
}
