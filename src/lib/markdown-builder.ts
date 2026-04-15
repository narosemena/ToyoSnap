import type { DesignSystem } from "@/types/design-system";

/**
 * Converts a DesignSystem record to a MASTER.md string plus per-page files.
 * Returns { master: string; pages: Map<urlSlug, content> }
 */
export function buildMarkdown(ds: DesignSystem): {
  master: string;
  pages: Map<string, string>;
} {
  const lines: string[] = [
    `# ToyoSnap Design System`,
    ``,
    `Session: \`${ds.sessionId}\`  `,
    `Captured: ${new Date(ds.capturedAt).toISOString()}`,
    ``,
    `## Colors`,
    ``,
    `| Hex | Usage | Contrast on White | Contrast on Black |`,
    `|-----|-------|-------------------|-------------------|`,
    ...ds.colors.map(
      (c) =>
        `| ${c.hex} | ${c.usage} | ${c.contrastOnWhite.toFixed(2)}:1 | ${c.contrastOnBlack.toFixed(2)}:1 |`
    ),
    ``,
    `## Typography`,
    ``,
    `| Family | Size | Weight | Line Height | Usage |`,
    `|--------|------|--------|-------------|-------|`,
    ...ds.typography.map(
      (t) => `| ${t.family} | ${t.size} | ${t.weight} | ${t.lineHeight} | ${t.usage} |`
    ),
    ``,
    `## Shadows`,
    ``,
    ...ds.shadows.map((s) => `- \`${s.value}\``),
    ``,
    `## Border Radii`,
    ``,
    ...ds.radii.map((r) => `- \`${r.value}\``),
    ``,
    `## Anti-Patterns`,
    ``,
  ];

  if (ds.antiPatterns.length === 0) {
    lines.push(`_No anti-patterns detected._`);
  } else {
    lines.push(`| Type | Selector | Detail | Step |`);
    lines.push(`|------|----------|--------|------|`);
    for (const ap of ds.antiPatterns) {
      lines.push(`| ${ap.type} | \`${ap.selector}\` | ${ap.detail} | ${ap.stepIndex} |`);
    }
  }

  lines.push(``, `## Pages`, ``);
  for (const page of ds.pageBreadcrumbs) {
    lines.push(`- [Step ${page.stepIndex}: ${page.pageTitle}](pages/${page.urlSlug}.md)`);
  }

  const pages = new Map<string, string>();
  for (const page of ds.pageBreadcrumbs) {
    pages.set(
      page.urlSlug,
      [`# ${page.pageTitle}`, ``, `URL: \`${page.url}\``, `Step: ${page.stepIndex}`].join("\n")
    );
  }

  return { master: lines.join("\n"), pages };
}
