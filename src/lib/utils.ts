/**
 * Simple class name merge utility.
 * Concatenates class name arguments, filtering out falsy values.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
