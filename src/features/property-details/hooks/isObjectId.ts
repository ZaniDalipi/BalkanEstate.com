/** The property API validates :id as a Mongo ObjectId and rejects anything else with 400. */
export const isObjectId = (value: string): boolean => /^[a-f\d]{24}$/i.test(value);
