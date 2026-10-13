import { describe, expect, test } from "vitest";
import { cleanFileName, detectAttachmentType, formatFileSize } from "./attachments";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("detectAttachmentType", () => {
  test("recognizes PDFs and pictures by their first bytes", () => {
    expect(detectAttachmentType(text("%PDF-1.7\n…"))).toBe("application/pdf");
    expect(detectAttachmentType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe("image/jpeg");
    expect(
      detectAttachmentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)),
    ).toBe("image/png");
    expect(detectAttachmentType(text("RIFF\u0001\u0002\u0003\u0004WEBPVP8 "))).toBe("image/webp");
  });

  test("refuses everything else, whatever it's called", () => {
    expect(detectAttachmentType(text("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectAttachmentType(text("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(detectAttachmentType(text("PK\u0003\u0004"))).toBeNull();
    expect(detectAttachmentType(text("RIFF\u0001\u0002\u0003\u0004WAVE"))).toBeNull();
    expect(detectAttachmentType(bytes())).toBeNull();
  });
});

describe("cleanFileName", () => {
  test("drops folders and characters that don't belong in a name", () => {
    expect(cleanFileName("C:\\Users\\maya\\receipt.pdf")).toBe("receipt.pdf");
    expect(cleanFileName("../../etc/passwd")).toBe("passwd");
    expect(cleanFileName('in"voice\n.pdf')).toBe("invoice.pdf");
    expect(cleanFileName("  ")).toBe("attachment");
  });

  test("shortens long names but keeps the ending", () => {
    const cleaned = cleanFileName(`${"a".repeat(300)}.pdf`);
    expect(cleaned).toHaveLength(120);
    expect(cleaned.endsWith(".pdf")).toBe(true);
  });
});

test("formatFileSize", () => {
  expect(formatFileSize(512)).toBe("512 B");
  expect(formatFileSize(2048)).toBe("2 KB");
  expect(formatFileSize(1572864)).toBe("1.5 MB");
});
