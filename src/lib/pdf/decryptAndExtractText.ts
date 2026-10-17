import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument, PasswordResponses } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

// In Node, pdf.js runs its worker code in-process (a "fake worker") by
// importing `GlobalWorkerOptions.workerSrc`, whose default it sets itself to
// "./pdf.worker.mjs", relative to pdf.js's own file. That default only works
// while pdf.js runs from node_modules: once Next bundles it into a server
// chunk, the import looks for pdf.worker.mjs next to the chunk and fails
// ("Setting up fake worker failed"). So it's always pointed at the real file.
//
// The path is built from the project folder rather than with
// `require.resolve`: Next's bundler (Turbopack) rewrites `require.resolve(...)`
// into an internal module id, which pdf.js rejects ("Invalid `workerSrc`
// type"), breaking `next build`. `import.meta.resolve` returns an unresolved
// relative path under Vitest, so that's out too. It's set on first use, not at
// module load, so the build never evaluates it.

/** Where pdf.js's worker lives. Relies on the server starting in the project folder, as `next dev`/`next start` do. */
export function pdfWorkerPath(): string {
  return path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
}

function ensureWorker(): void {
  const worker = pdfWorkerPath();
  if (!existsSync(worker)) {
    throw new Error(`pdf.js worker not found at ${worker}. Start the server from the project folder, or include the file in the deployment.`);
  }
  GlobalWorkerOptions.workerSrc = pathToFileURL(worker).href;
}

export type DecryptResult =
  | { text: string; passwordUsed: string | null }
  | { failure: "no_password_matched" | "no_text_extracted" };

/**
 * Opens a PDF (encrypted or not) and extracts its plain text.
 *
 * For an encrypted PDF, pdf.js rejects `getDocument(...).promise` with a
 * `PasswordException` — `NEED_PASSWORD` on the first attempt (no password
 * given yet) and `INCORRECT_PASSWORD` after a wrong one — so
 * `candidatePasswords` are tried in order by re-calling `getDocument`,
 * mirroring the reference pypdf `decrypt()`-then-retry loop. Text
 * extraction (`getTextContent`) never touches canvas/DOMMatrix — those are
 * only needed for `page.render()` (rasterizing), never called here.
 */
export async function decryptAndExtractText(
  pdfBytes: Uint8Array,
  candidatePasswords: string[],
): Promise<DecryptResult> {
  ensureWorker();
  const attempts: (string | null)[] = [null, ...candidatePasswords];

  for (const password of attempts) {
    // pdf.js's Node "fake worker" transfers (detaches) the `data` buffer on
    // each call — reusing `pdfBytes` across retry attempts would hand the
    // second attempt an already-detached buffer and fail with an unrelated
    // DataCloneError. Each attempt gets its own copy.
    const task = getDocument({
      data: pdfBytes.slice(),
      password: password ?? undefined,
      disableFontFace: true,
      standardFontDataUrl: undefined,
    });

    let doc: PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (error) {
      // Always destroy a rejected task before retrying — leaving its fake
      // worker/message-port state alive corrupts the *next* getDocument
      // call in this process (surfaces as an unrelated DataCloneError deep
      // in pdf.js's internal message passing, not as an error here).
      await task.destroy();
      if (isPasswordException(error)) {
        // NEED_PASSWORD (no password given yet) or INCORRECT_PASSWORD
        // (wrong candidate) — move on to the next candidate.
        continue;
      }
      throw error;
    }

    try {
      const text = await extractAllText(doc);
      if (!text.trim()) return { failure: "no_text_extracted" };
      return { text, passwordUsed: password };
    } finally {
      await task.destroy();
    }
  }

  return { failure: "no_password_matched" };
}

function isPasswordException(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) return false;
  if (error.name !== "PasswordException") return false;
  const code = (error as { code?: number }).code;
  return code === PasswordResponses.NEED_PASSWORD || code === PasswordResponses.INCORRECT_PASSWORD;
}

async function extractAllText(doc: PDFDocumentProxy): Promise<string> {
  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(pageText);
  }
  return pageTexts.join("\n");
}
