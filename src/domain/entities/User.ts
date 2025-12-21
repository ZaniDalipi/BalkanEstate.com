// Domain Entity: User
// Pure TypeScript - No framework dependencies

export enum UserRole {
  BUYER = 'buyer',
  PRIVATE_SELLER = 'private_seller',
  AGENT = 'agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface Testimonial {
  quote: string;
  clientName: string;
  rating: number;
  createdAt?: string;
  userId?: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
}

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly role: UserRole,
    public readonly isSubscribed: boolean,
    public readonly avatarUrl?: string,
    public readonly city?: string,
    public readonly country?: string,
    public readonly agencyName?: string,
    public readonly agentId?: string,
    public readonly agencyId?: string,
    public readonly licenseNumber?: string,
    public readonly licenseVerified?: boolean,
    public readonly licenseVerificationDate?: Date,
    public readonly listingsCount?: number,
    public readonly totalListingsCreated?: number,
    public readonly testimonials?: Testimonial[],
    public readonly publicKey?: string, // E2E encryption public key
    public readonly _id?: string // MongoDB compatibility
  ) {}

  // Business logic methods

  get displayName(): string {
    return this.name;
  }

  get fullLocation(): string | null {
    if (this.city && this.country) {
      return `${this.city}, ${this.country}`;
    }
    return this.city || this.country || null;
  }

  isBuyer(): boolean {
    return this.role === UserRole.BUYER;
  }

  isSeller(): boolean {
    return this.role === UserRole.PRIVATE_SELLER || this.role === UserRole.AGENT;
  }

  isAgent(): boolean {
    return this.role === UserRole.AGENT;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.SUPER_ADMIN;
  }

  isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }

  canCreateListings(): boolean {
    return this.isSubscribed && (this.isSeller() || this.isAdmin());
  }

  canManageAgency(): boolean {
    return this.isAgent() && !!this.agencyId;
  }

  hasReachedListingLimit(maxListings: number): boolean {
    return (this.listingsCount || 0) >= maxListings;
  }

  get averageRating(): number {
    if (!this.testimonials || this.testimonials.length === 0) {
      return 0;
    }
    const sum = this.testimonials.reduce((acc, t) => acc + t.rating, 0);
    return sum / this.testimonials.length;
  }

  isLicenseValid(): boolean {
    return !!this.licenseNumber && this.licenseVerified === true;
  }

  // Factory method to create from DTO
  static fromDTO(dto: any): User {
    return new User(
      dto.id || dto._id,
      dto.name,
      dto.email,
      dto.phone,
      dto.role,
      dto.isSubscribed,
      dto.avatarUrl,
      dto.city,
      dto.country,
      dto.agencyName,
      dto.agentId,
      dto.agencyId,
      dto.licenseNumber,
      dto.licenseVerified,
      dto.licenseVerificationDate ? new Date(dto.licenseVerificationDate) : undefined,
      dto.listingsCount,
      dto.totalListingsCreated,
      dto.testimonials,
      dto.publicKey,
      dto._id
    );
  }

  // Convert to plain object (for API calls)
  toDTO(): any {
    return {
      id: this.id,
      _id: this._id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      isSubscribed: this.isSubscribed,
      avatarUrl: this.avatarUrl,
      city: this.city,
      country: this.country,
      agencyName: this.agencyName,
      agentId: this.agentId,
      agencyId: this.agencyId,
      licenseNumber: this.licenseNumber,
      licenseVerified: this.licenseVerified,
      licenseVerificationDate: this.licenseVerificationDate,
      listingsCount: this.listingsCount,
      totalListingsCreated: this.totalListingsCreated,
      testimonials: this.testimonials,
      publicKey: this.publicKey,
    };
  }
}
