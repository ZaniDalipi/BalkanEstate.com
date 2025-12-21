// Domain Entity: Agency
// Pure TypeScript - No framework dependencies

export class Agency {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly totalProperties: number,
    public readonly totalAgents: number,
    public readonly isFeatured: boolean,
    public readonly slug?: string,
    public readonly description?: string,
    public readonly logo?: string,
    public readonly coverImage?: string,
    public readonly city?: string,
    public readonly country?: string,
    public readonly address?: string,
    public readonly website?: string,
    public readonly lat?: number,
    public readonly lng?: number,
    public readonly yearsInBusiness?: number,
    public readonly specialties?: string[],
    public readonly certifications?: string[],
    public readonly agents?: any[],
    public readonly ownerId?: string,
    public readonly admins?: string[],
    public readonly invitationCode?: string,
    public readonly _id?: string
  ) {}

  // Business logic methods

  get fullLocation(): string | null {
    if (this.city && this.country) {
      return `${this.city}, ${this.country}`;
    }
    return this.city || this.country || null;
  }

  get coordinates(): [number, number] | null {
    if (this.lat !== undefined && this.lng !== undefined) {
      return [this.lat, this.lng];
    }
    return null;
  }

  hasLocation(): boolean {
    return this.coordinates !== null;
  }

  get experienceLevel(): 'New' | 'Established' | 'Experienced' | 'Industry Leader' {
    const years = this.yearsInBusiness || 0;
    if (years < 2) return 'New';
    if (years < 5) return 'Established';
    if (years < 10) return 'Experienced';
    return 'Industry Leader';
  }

  get propertiesPerAgent(): number {
    if (this.totalAgents === 0) return 0;
    return Math.round(this.totalProperties / this.totalAgents);
  }

  hasSpecialty(specialty: string): boolean {
    return this.specialties?.includes(specialty) || false;
  }

  hasCertification(certification: string): boolean {
    return this.certifications?.includes(certification) || false;
  }

  isLargeAgency(): boolean {
    return this.totalAgents >= 10;
  }

  isActiveAgency(): boolean {
    return this.totalProperties > 0 && this.totalAgents > 0;
  }

  canUserJoin(userId: string, code?: string): boolean {
    // User can join if they have the invitation code
    if (this.invitationCode && code === this.invitationCode) {
      return true;
    }
    // Owner and admins can always add members
    return false;
  }

  isOwner(userId: string): boolean {
    return this.ownerId === userId;
  }

  isAdmin(userId: string): boolean {
    return this.admins?.includes(userId) || this.isOwner(userId) || false;
  }

  get agencyScore(): number {
    // Score based on properties, agents, years in business, and certifications
    const propertyScore = Math.min(this.totalProperties / 10, 10);
    const agentScore = Math.min(this.totalAgents / 5, 10);
    const experienceScore = Math.min((this.yearsInBusiness || 0) / 2, 10);
    const certScore = Math.min((this.certifications?.length || 0) * 2, 5);
    return propertyScore + agentScore + experienceScore + certScore; // Max 35
  }

  isTopAgency(): boolean {
    return this.agencyScore >= 25 && this.isFeatured;
  }

  // Factory method
  static fromDTO(dto: any): Agency {
    return new Agency(
      dto.id || dto._id,
      dto.name,
      dto.email,
      dto.phone,
      dto.totalProperties || 0,
      dto.totalAgents || 0,
      dto.isFeatured || false,
      dto.slug,
      dto.description,
      dto.logo,
      dto.coverImage,
      dto.city,
      dto.country,
      dto.address,
      dto.website,
      dto.lat,
      dto.lng,
      dto.yearsInBusiness,
      dto.specialties,
      dto.certifications,
      dto.agents,
      dto.ownerId,
      dto.admins,
      dto.invitationCode,
      dto._id
    );
  }

  toDTO(): any {
    return {
      _id: this._id || this.id,
      slug: this.slug,
      name: this.name,
      description: this.description,
      logo: this.logo,
      coverImage: this.coverImage,
      email: this.email,
      phone: this.phone,
      city: this.city,
      country: this.country,
      address: this.address,
      website: this.website,
      lat: this.lat,
      lng: this.lng,
      totalProperties: this.totalProperties,
      totalAgents: this.totalAgents,
      yearsInBusiness: this.yearsInBusiness,
      isFeatured: this.isFeatured,
      specialties: this.specialties,
      certifications: this.certifications,
      agents: this.agents,
      ownerId: this.ownerId,
      admins: this.admins,
      invitationCode: this.invitationCode,
    };
  }
}
