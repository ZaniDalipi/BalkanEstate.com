/**
 * "This week" in the visitor's own clock: from now until the end of Sunday
 * (Monday 00:00). On a Sunday that is just the rest of today.
 */
export function thisWeekRange(now: Date): { from: Date; to: Date } {
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  const daysToMonday = day === 0 ? 1 : 8 - day;
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday);
  return { from: new Date(now.getTime()), to };
}
