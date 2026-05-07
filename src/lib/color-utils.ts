export function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return null;
  return (
    "#" +
    [match[0], match[1], match[2]]
      .map((n) => parseInt(n ?? "0").toString(16).padStart(2, "0"))
      .join("")
  );
}
