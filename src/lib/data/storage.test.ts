// Checks attached files once file storage (Vercel Blob) is set up, against
// an in-memory database and a pretend store: files go to the store, not the
// database; they're read back from it, only by their own company; and
// whatever removes an attachment (deleting it, its transaction, its bill
// payment or its company) removes its file from the store too.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { attachment } from "@/db/finance";
import { todayIn } from "@/lib/dates";
import { actAs, createTestCompany, setUpTestDb, testDb } from "./testing";
import { createAccount } from "./accounts";
import { addAttachment, deleteAttachment, getAttachmentFile } from "./attachments";
import { createBill, payBill, undoBillPayment } from "./bills";
import { deleteCompany } from "./company";
import { createTransaction, deleteTransaction } from "./transactions";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
vi.mock("@/lib/session", async () => ({
  requireOrganization: (await import("./testing")).currentSession,
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: async () => true }));

// The pretend store: key → the file and how it was saved
const store = vi.hoisted(() => new Map<string, { bytes: Uint8Array; access: string }>());
vi.mock("@vercel/blob", () => ({
  put: async (key: string, body: Buffer, options: { access: string }) => {
    store.set(key, { bytes: new Uint8Array(body), access: options.access });
    return { pathname: key };
  },
  get: async (key: string) => {
    const file = store.get(key);
    return file
      ? { statusCode: 200, stream: new Response(Buffer.from(file.bytes)).body }
      : null;
  },
  del: async (keys: string[]) => {
    for (const key of keys) store.delete(key);
  },
}));

const PDF = new TextEncoder().encode("%PDF-1.4 stored");
const today = todayIn("UTC");

async function companyWithTransaction(name: string) {
  const company = await createTestCompany(name);
  actAs(company);
  const accountId = await createAccount({ name: "Checking", type: "checking" });
  const transactionId = await createTransaction({
    accountId,
    categoryId: null,
    name: "Stationery",
    amount: -12,
    date: today,
    status: "completed",
  });
  return { ...company, accountId, transactionId };
}

beforeAll(async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  await setUpTestDb();
});

beforeEach(() => store.clear());

describe("files in file storage", () => {
  it("are saved privately in the store, not in the database, and read back", async () => {
    const company = await companyWithTransaction("stored-one");
    const [file] = await addAttachment(company.transactionId, { name: "r.pdf", bytes: PDF });

    const [row] = await testDb.select().from(attachment).where(eq(attachment.id, file.id));
    expect(row.data).toBeNull();
    expect(row.storageKey).toBe(`attachments/${company.organizationId}/${file.id}`);
    expect(store.get(row.storageKey!)?.access).toBe("private");

    const read = await getAttachmentFile(file.id);
    expect(read?.contentType).toBe("application/pdf");
    expect(new TextDecoder().decode(read!.bytes)).toBe("%PDF-1.4 stored");

    // Another company can't read it
    const other = await createTestCompany("stored-other");
    actAs(other);
    expect(await getAttachmentFile(file.id)).toBeNull();

    actAs(company);
    expect(await deleteAttachment(file.id)).toEqual([]);
    expect(store.size).toBe(0);
  });

  it("go when their transaction or its company is deleted", async () => {
    const company = await companyWithTransaction("stored-two");
    await addAttachment(company.transactionId, { name: "a.pdf", bytes: PDF });
    await addAttachment(company.transactionId, { name: "b.pdf", bytes: PDF });
    expect(store.size).toBe(2);
    await deleteTransaction(company.transactionId);
    expect(store.size).toBe(0);

    const doomed = await companyWithTransaction("stored-doomed");
    const kept = await companyWithTransaction("stored-kept");
    actAs(doomed);
    await addAttachment(doomed.transactionId, { name: "d.pdf", bytes: PDF });
    actAs(kept);
    await addAttachment(kept.transactionId, { name: "k.pdf", bytes: PDF });
    actAs(doomed);
    await deleteCompany("stored-doomed");
    expect([...store.keys()]).toEqual([
      expect.stringMatching(`^attachments/${kept.organizationId}/`),
    ]);
  });

  it("go when the bill payment they were attached to is undone", async () => {
    const company = await companyWithTransaction("stored-bill");
    const billId = await createBill({
      name: "Rent",
      amount: 100,
      dueDate: today,
      repeat: "none",
      categoryId: null,
    });
    const paid = await payBill(billId, { accountId: company.accountId, date: today });
    await addAttachment(paid.transactionId, { name: "rent.pdf", bytes: PDF });
    expect(store.size).toBe(1);
    expect((await undoBillPayment(billId)).deletedPayment).toBe(true);
    expect(store.size).toBe(0);
  });
});
