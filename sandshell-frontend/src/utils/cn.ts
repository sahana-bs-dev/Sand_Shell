type ClassValue = string | number | null | undefined | false;

/**
 * Joins truthy class values into a single className string.
 * Kept dependency-free (no clsx/tailwind-merge) since the project
 * doesn't need conflict-resolution merging yet.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
