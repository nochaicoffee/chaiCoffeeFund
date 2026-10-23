import "server-only";
import type { gmail_v1 } from "googleapis";

export interface GmailMessageRef {
  id: string;
}

async function getLabelId(gmail: gmail_v1.Gmail, labelName: string): Promise<string | null> {
  const res = await gmail.users.labels.list({ userId: "me" });
  const label = res.data.labels?.find((l) => l.name?.toLowerCase() === labelName.toLowerCase());
  return label?.id ?? null;
}

/**
 * Every message under a Gmail label, newest first — throws if the label doesn't
 * exist (a config error, not a per-run one). Reads page by page, so a label
 * holding years of statements is read in full (#82).
 */
export async function listMessagesWithLabel(gmail: gmail_v1.Gmail, labelName: string): Promise<GmailMessageRef[]> {
  const labelId = await getLabelId(gmail, labelName);
  if (!labelId) {
    throw new Error(`Gmail label "${labelName}" not found — create it and apply it to statement emails first.`);
  }
  const refs: GmailMessageRef[] = [];
  let pageToken: string | undefined;
  do {
    // 500 is the most Gmail returns at once. Each entry is just an id, so a page is cheap.
    const res = await gmail.users.messages.list({ userId: "me", labelIds: [labelId], maxResults: 500, pageToken });
    refs.push(...(res.data.messages ?? []).map((m) => ({ id: m.id! })));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return refs;
}

export async function getMessage(gmail: gmail_v1.Gmail, id: string): Promise<gmail_v1.Schema$Message> {
  const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  return res.data;
}

export function getSubjectHeader(message: gmail_v1.Schema$Message): string {
  const headers = message.payload?.headers ?? [];
  return headers.find((h) => h.name === "Subject")?.value ?? "";
}

/** A PDF on a message, without downloading it. */
export interface PdfPart {
  filename: string;
  attachmentId: string;
  size: number;
}

/** Every `.pdf` attachment on a message, walking nested multipart parts, in the order they appear. */
export function listPdfParts(message: gmail_v1.Schema$Message): PdfPart[] {
  const found: PdfPart[] = [];
  const queue: gmail_v1.Schema$MessagePart[] = message.payload ? [message.payload] : [];
  while (queue.length > 0) {
    const part = queue.shift()!;
    if (part.parts && part.parts.length > 0) {
      queue.push(...part.parts);
      continue;
    }
    const filename = part.filename ?? "";
    const attachmentId = part.body?.attachmentId;
    if (filename.toLowerCase().endsWith(".pdf") && attachmentId) found.push({ filename, attachmentId, size: part.body?.size ?? 0 });
  }
  return found;
}

/** Downloads one attachment's bytes. */
export async function downloadAttachment(gmail: gmail_v1.Gmail, messageId: string, attachmentId: string): Promise<Uint8Array | null> {
  const res = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: attachmentId });
  return res.data.data ? base64UrlDecode(res.data.data) : null;
}

export function getHeader(message: gmail_v1.Schema$Message, name: string): string {
  return (message.payload?.headers ?? []).find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/**
 * Downloads the first `.pdf` attachment on a message, walking nested
 * multipart parts — mirrors the reference `download_and_decrypt_pdf_bytes_from_message`'s
 * traversal, but returns raw bytes only; decryption lives in `lib/pdf`.
 */
export async function downloadPdfAttachment(
  gmail: gmail_v1.Gmail,
  message: gmail_v1.Schema$Message,
): Promise<Uint8Array | null> {
  const messageId = message.id;
  if (!messageId || !message.payload) return null;

  const queue: gmail_v1.Schema$MessagePart[] = [message.payload];
  while (queue.length > 0) {
    const part = queue.shift()!;
    if (part.parts && part.parts.length > 0) {
      queue.push(...part.parts);
      continue;
    }
    const filename = part.filename ?? "";
    const attachmentId = part.body?.attachmentId;
    if (!filename.toLowerCase().endsWith(".pdf") || !attachmentId) continue;

    const res = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: attachmentId });
    const data = res.data.data;
    if (!data) continue;
    return base64UrlDecode(data);
  }

  return null;
}

function base64UrlDecode(data: string): Uint8Array {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(base64, "base64"));
}
