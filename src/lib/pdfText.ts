// ACTORVERSE — read the text out of a PDF, in the browser (pdf.js)
// Used when a PDF is uploaded to the Script Vault and when a saved PDF
// is tapped in the Teleprompter, so the PDF's words land straight in
// the reading box. Never fakes text: a PDF with no extractable text
// (scanned/photo PDF) gives back null, and the caller says so plainly.

const MAX_PAGES = 200;
const MAX_CHARS = 200_000;

function joinPageText(items: unknown[]): string {
  // getTextContent items carry a `str` field; join them into plain text.
  const parts: string[] = [];
  for (const item of items) {
    if (item && typeof item === "object" && "str" in item) {
      const s = String((item as { str: unknown }).str);
      if (s) parts.push(s);
    }
  }
  return parts.join(" ");
}

async function extractOnce(data: ArrayBuffer): Promise<string | null> {
  const pdfjs = await import("pdfjs-dist");
  // The worker is fetched from the same version on jsDelivr, matching
  // how tesseract.js already loads its worker from a CDN in this app.
  // pdf.js falls back to a main-thread worker on its own if the CDN
  // worker cannot start, so no manual retry is needed.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  try {
    const pages = Math.min(doc.numPages, MAX_PAGES);
    const chunks: string[] = [];
    let total = 0;
    for (let n = 1; n <= pages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const text = joinPageText(content.items)
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        chunks.push(text);
        total += text.length;
        if (total >= MAX_CHARS) break;
      }
    }
    const joined = chunks.join("\n\n").trim().slice(0, MAX_CHARS);
    return joined ? joined : null;
  } finally {
    await task.destroy();
  }
}

/**
 * Extract readable text from PDF bytes. Returns null when the PDF has
 * no extractable text (for example a scanned photo PDF). Throws when
 * the file is not a readable PDF or extraction fails.
 */
export async function extractPdfText(
  data: ArrayBuffer,
): Promise<string | null> {
  return extractOnce(data);
}

/** Fetch a PDF from a URL and extract its text. */
export async function extractPdfTextFromUrl(
  url: string,
): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download the PDF (${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  return extractPdfText(buf);
}
