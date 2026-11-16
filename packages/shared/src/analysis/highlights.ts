export function splitHighlights(highlights: string | null | undefined): string[] {
  return (highlights ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
