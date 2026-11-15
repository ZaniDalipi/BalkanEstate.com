/** An open house as visitors see it — never anyone else's details. */
export interface OpenHouse {
  id: string;
  propertyId: string;
  startsAt: string;
  endsAt: string;
  note?: string;
  capacity?: number;
  spotsLeft: number | null;
  rsvpCount: number;
  isFull: boolean;
  isGoing: boolean;
  myRsvpId?: string;
}

/** The host's view adds who is coming. */
export interface HostOpenHouse extends OpenHouse {
  rsvps: { name: string; email: string; phone?: string; createdAt: string }[];
}

/** What the seller picks in a form, before it is saved. */
export interface OpenHouseDraft {
  startsAt: string;
  endsAt: string;
  note?: string;
  capacity?: number;
}

export interface RsvpInput {
  name: string;
  email: string;
  phone?: string;
}
