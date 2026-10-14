/** The form a category or brand name is stored in: surrounding whitespace removed. */
export function cleanName(name: string): string {
  return name.trim();
}

/** The form used for uniqueness: trimmed and lowercased, so "Nike" and " nike " collide. */
export function normalizeName(name: string): string {
  return cleanName(name).toLowerCase();
}
