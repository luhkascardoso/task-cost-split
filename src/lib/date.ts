/** "2025-12-20" → "20/12/25" (formato curto usado nos cards do Figma). */
export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y.slice(2)}`;
}

/** "20/12/25" ou "20/12/2025" → "2025-12-20". Retorna null se inválida. */
export function parseShortDate(input: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(input.trim());
  if (!match) return null;
  const [, d, m, yRaw] = match as unknown as [string, string, string, string];
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(d)) return null;
  return `${y}-${m}-${d}`;
}

/** Iniciais para o Avatar: "Jonas Santos" → "JS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
