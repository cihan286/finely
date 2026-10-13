// ─────────────────────────────────────────────────────────────────────────────
// One attached file (finely.com/dashboard/transactions/attachments/<id>)
//
// In plain words: opens a receipt or invoice that was attached to a
// transaction — in the browser, or as a download with ?download=1.
//
// For developers: a route handler, because it answers with a file instead
// of a page. getAttachmentFile() only finds files of the signed-in person's
// company (and sends visitors who aren't logged in to /login). The kind of
// file was checked when it was added and is one a browser shows without
// running anything; "nosniff" and the sandbox keep it that way.
// ─────────────────────────────────────────────────────────────────────────────

import { getAttachmentFile } from "@/lib/data/attachments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const file = await getAttachmentFile((await params).id);
  if (!file) return new Response("File not found.", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  // The name may contain any character: plain for old browsers, encoded for the rest
  const plainName = file.name.replace(/[^\x20-\x7e]/g, "_");
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${plainName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
      // A company's document: never kept by anything in between
      "Cache-Control": "private, no-store",
    },
  });
}
