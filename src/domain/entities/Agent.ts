// Domain Entity: Agent
// Extends User with agent-specific properties and behavior

import { User, UserRole } from './User';

export class Agent extends User {
  constructor(
    id: string,
    name: string,
    email: string,
    phone: string,
    role: UserRole,
    isSubscribed: boolean,
    public readonly totalSalesValue: number,
    public readonly propertiesSold: number,
    public readonly activeListings: number,
    public readonly rating: number,
    avatarUrl?: string,
    city?: string,
    country?: string,
    agencyName?: string,
    agentId?: string,
    agencyId?: string,
    licenseNumber?: string,
    licenseVerified?: boolean,
    licenseVerificationDate?: Date,
    listingsCount?: number,
    totalListingsCreated?: number,
    testimonials?: any[],
    publicKey?: string,
    _id?: string,
    // Agent-specific properties
    public readonly userId?: string,
    public readonly totalReviews?: number,
    public readonly bio?: string,
    public readonly specializations?: string[],
    public readonly yearsOfExperience?: number,
    public readonly languages?: string[],
    public readonly serviceAreas?: string[],
    public readonly websiteUrl?: string,
    public readonly facebookUrl?: string,
    public readonly instagramUrl?: string,
    public readonly linkedinUrl?: string,
    public readonly officeAddress?: string,
    public readonly officePhone?: string
  ) {
    super(
      id,
      name,
      email,
      phone,
      role,
      isSubscribed,
      avatarUrl,
      city,
      country,
      agencyName,
      agentId,
      agencyId,
      licenseNumber,
      licenseVerified,
      licenseVerificationDate,
      listingsCount,
      totalListingsCreated,
      testimonials,
      publicKey,
      _id
    );
  }

  // Agent-specific business logic

  get formattedTotalSales(): string {
    return `€${this.totalSalesValue.toLocaleString()}`;
  }

  get experienceLevel(): 'Junior' | 'Mid-Level' | 'Senior' | 'Expert' {
    const years = this.yearsOfExperience || 0;
    if (years < 2) return 'Junior';
    if (years < 5) return 'Mid-Level';
    if (years < 10) return 'Senior';
    return 'Expert';
  }

  get performanceScore(): number {
    // Calculate performance based on sales, rating, and reviews
    const salesScore = Math.min(this.totalSalesValue / 1000000, 10); // Max 10 points for sales
    const ratingScore = this.rating * 2; // Max 10 points for rating
    const reviewScore = Math.min((this.totalReviews || 0) / 10, 5); // Max 5 points for reviews
    return (salesScore + ratingScore + reviewScore) / 25 * 100; // Normalize to 0-100
  }

  hasSpecialization(specialization: string): boolean {
    return this.specializations?.includes(specialization) || false;
  }

  speaksLanguage(language: string): boolean {
    return this.languages?.includes(language) || false;
  }

  servesArea(area: string): boolean {
    return this.serviceAreas?.includes(area) || false;
  }

  get socialMediaLinks(): { platform: string; url: string }[] {
    const links = [];
    if (this.facebookUrl) links.push({ platform: 'Facebook', url: this.facebookUrl });
    if (this.instagramUrl) links.push({ platform: 'Instagram', url: this.instagramUrl });
    if (this.linkedinUrl) links.push({ platform: 'LinkedIn', url: this.linkedinUrl });
    if (this.websiteUrl) links.push({ platform: 'Website', url: this.websiteUrl });
    return links;
  }

  isTopPerformer(): boolean {
    return this.performanceScore >= 80 && this.rating >= 4.5;
  }

  // Factory method
  static fromDTO(dto: any): Agent {
    return new Agent(
      dto.id || dto._id,
      dto.name,
      dto.email,
      dto.phone,
      dto.role,
      dto.isSubscribed,
      dto.totalSalesValue || 0,
      dto.propertiesSold || 0,
      dto.activeListings || 0,
      dto.rating || 0,
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
      dto._id,
      dto.userId,
      dto.totalReviews,
      dto.bio,
      dto.specializations,
      dto.yearsOfExperience,
      dto.languages,
      dto.serviceAreas,
      dto.websiteUrl,
      dto.facebookUrl,
      dto.instagramUrl,
      dto.linkedinUrl,
      dto.officeAddress,
      dto.officePhone
    );
  }

  toDTO(): any {
    return {
      ...super.toDTO(),
      userId: this.userId,
      totalSalesValue: this.totalSalesValue,
      propertiesSold: this.propertiesSold,
      activeListings: this.activeListings,
      rating: this.rating,
      totalReviews: this.totalReviews,
      bio: this.bio,
      specializations: this.specializations,
      yearsOfExperience: this.yearsOfExperience,
      languages: this.languages,
      serviceAreas: this.serviceAreas,
      websiteUrl: this.websiteUrl,
      facebookUrl: this.facebookUrl,
      instagramUrl: this.instagramUrl,
      linkedinUrl: this.linkedinUrl,
      officeAddress: this.officeAddress,
      officePhone: this.officePhone,
    };
  }
}
