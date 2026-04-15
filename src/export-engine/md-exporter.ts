import JSZip from "jszip";
import { getDesignSystem } from "@/storage/ephemeral-db";
import { buildMarkdown } from "@/lib/markdown-builder";

export async function exportMarkdown(sessionId: string): Promise<Blob> {
  const ds = await getDesignSystem(sessionId);
  if (!ds) throw new Error("No design system data for session");

  const { master, pages } = buildMarkdown(ds);
  const zip = new JSZip();
  zip.file("MASTER.md", master);

  const pagesFolder = zip.folder("pages")!;
  for (const [slug, content] of pages.entries()) {
    pagesFolder.file(`${slug}.md`, content);
  }

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
