/**
 * "This weekend" in the visitor's own clock: Saturday 00:00 to Monday 00:00.
 * On a Saturday or Sunday it is the weekend already under way.
 */
export function weekendRange(now: Date): { from: Date; to: Date } {
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  const daysToSaturday = day === 0 ? -1 : 6 - day;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSaturday);
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 2);
  return { from, to };
}
