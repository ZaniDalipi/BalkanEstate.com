/**
 * Turn a failed open-house request into a translated message. The server
 * answers in English; the reasons a visitor can act on are mapped by status.
 */
export function openHouseErrorKey(error: unknown): { key: string; defaultValue: string } {
  const status = (error as { statusCode?: number } | null)?.statusCode;
  if (status === 409) {
    return {
      key: 'property:openHouse.errors.unavailable',
      defaultValue: "This open house can't take more sign-ups. Pick another time or ask for a private viewing.",
    };
  }
  if (status === 429) {
    return { key: 'property:openHouse.errors.tooMany', defaultValue: 'Too many tries. Please wait a little and try again.' };
  }
  if (status === 400) {
    return { key: 'property:openHouse.errors.checkDetails', defaultValue: 'Please check the details and try again.' };
  }
  return { key: 'property:openHouse.errors.generic', defaultValue: 'Something went wrong. Please try again.' };
}
