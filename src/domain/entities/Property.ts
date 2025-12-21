// Domain Entity: Property
// Pure TypeScript - No framework dependencies

export type PropertyStatus = 'active' | 'pending' | 'sold' | 'draft';
export type PropertyType = 'house' | 'apartment' | 'villa' | 'other';
export type PropertyImageTag = 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
export type FurnishingStatus = 'any' | 'furnished' | 'semi-furnished' | 'unfurnished';
export type HeatingType = 'any' | 'central' | 'electric' | 'gas' | 'oil' | 'heat-pump' | 'solar' | 'wood' | 'none';
export type PropertyCondition = 'any' | 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
export type ViewType = 'any' | 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
export type EnergyRating = 'any' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type PromotionTier = 'standard' | 'featured' | 'highlight' | 'premium';

export interface PropertyImage {
  url: string;
  tag: PropertyImageTag;
}

export interface Seller {
  type: 'agent' | 'private';
  name: string;
  avatarUrl?: string;
  phone: string;
  agencyName?: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

export class Property {
  constructor(
    public readonly id: string,
    public readonly sellerId: string,
    public readonly status: PropertyStatus,
    public readonly price: number,
    public readonly location: Location,
    public readonly beds: number,
    public readonly baths: number,
    public readonly livingRooms: number,
    public readonly sqft: number,
    public readonly yearBuilt: number,
    public readonly parking: number,
    public readonly description: string,
    public readonly specialFeatures: string[],
    public readonly materials: string[],
    public readonly amenities: string[],
    public readonly imageUrl: string,
    public readonly seller: Seller,
    public readonly propertyType: PropertyType,
    public readonly soldAt?: number,
    public readonly tourUrl?: string,
    public readonly virtualTour360Url?: string,
    public readonly hasVirtualTour360?: boolean,
    public readonly images?: PropertyImage[],
    public readonly floorNumber?: number,
    public readonly totalFloors?: number,
    public readonly floorplanUrl?: string,
    public readonly createdAt?: number,
    public readonly lastRenewed?: number,
    public readonly views?: number,
    public readonly saves?: number,
    public readonly inquiries?: number,
    public readonly furnishing?: FurnishingStatus,
    public readonly heatingType?: HeatingType,
    public readonly condition?: PropertyCondition,
    public readonly viewType?: ViewType,
    public readonly energyRating?: EnergyRating,
    public readonly hasBalcony?: boolean,
    public readonly hasGarden?: boolean,
    public readonly hasElevator?: boolean,
    public readonly hasSecurity?: boolean,
    public readonly hasAirConditioning?: boolean,
    public readonly hasPool?: boolean,
    public readonly petsAllowed?: boolean,
    public readonly distanceToCenter?: number,
    public readonly distanceToSea?: number,
    public readonly distanceToSchool?: number,
    public readonly distanceToHospital?: number,
    // Promotion fields
    public readonly isPromoted?: boolean,
    public readonly promotionTier?: PromotionTier,
    public readonly promotionStartDate?: number,
    public readonly promotionEndDate?: number,
    public readonly hasUrgentBadge?: boolean
  ) {}

  // Business logic methods

  get formattedPrice(): string {
    return `€${this.price.toLocaleString()}`;
  }

  get pricePerSqft(): number {
    return Math.round(this.price / this.sqft);
  }

  get formattedPricePerSqft(): string {
    return `€${this.pricePerSqft.toLocaleString()}/sqft`;
  }

  get fullAddress(): string {
    return `${this.location.address}, ${this.location.city}, ${this.location.country}`;
  }

  get coordinates(): [number, number] {
    return [this.location.lat, this.location.lng];
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isSold(): boolean {
    return this.status === 'sold';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isDraft(): boolean {
    return this.status === 'draft';
  }

  get propertyAge(): number {
    return new Date().getFullYear() - this.yearBuilt;
  }

  isNew(): boolean {
    return this.propertyAge <= 1;
  }

  get totalRooms(): number {
    return this.beds + this.livingRooms;
  }

  hasAmenity(amenity: string): boolean {
    return this.amenities.includes(amenity);
  }

  get mainImage(): string {
    return this.imageUrl;
  }

  get allImages(): string[] {
    if (this.images && this.images.length > 0) {
      return this.images.map(img => img.url);
    }
    return [this.imageUrl];
  }

  getImagesByTag(tag: PropertyImageTag): PropertyImage[] {
    return this.images?.filter(img => img.tag === tag) || [];
  }

  get engagementScore(): number {
    const viewScore = Math.min((this.views || 0) / 100, 10);
    const saveScore = Math.min((this.saves || 0) / 10, 5);
    const inquiryScore = Math.min((this.inquiries || 0) / 5, 5);
    return viewScore + saveScore + inquiryScore; // Max 20 points
  }

  isHighlyEngaged(): boolean {
    return this.engagementScore >= 15;
  }

  needsRenewal(daysThreshold: number = 30): boolean {
    if (!this.lastRenewed) return false;
    const daysSinceRenewal = (Date.now() - this.lastRenewed) / (1000 * 60 * 60 * 24);
    return daysSinceRenewal >= daysThreshold;
  }

  get daysActive(): number {
    if (!this.createdAt) return 0;
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  }

  get sellerType(): 'agent' | 'private' {
    return this.seller.type;
  }

  isListedByAgent(): boolean {
    return this.seller.type === 'agent';
  }

  get valueScore(): number {
    // Lower price per sqft = better value
    const avgPricePerSqft = 2000; // Average market price per sqft (configurable)
    return Math.max(0, 100 - (this.pricePerSqft / avgPricePerSqft) * 100);
  }

  matchesMinimumRequirements(minBeds: number, minBaths: number, maxPrice: number): boolean {
    return this.beds >= minBeds && this.baths >= minBaths && this.price <= maxPrice;
  }

  // Promotion-related methods

  get isActivelyPromoted(): boolean {
    if (!this.isPromoted || !this.promotionEndDate) {
      return false;
    }
    return this.promotionEndDate > Date.now();
  }

  get promotionDaysRemaining(): number {
    if (!this.isActivelyPromoted || !this.promotionEndDate) {
      return 0;
    }
    return Math.max(0, Math.ceil((this.promotionEndDate - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  get promotionBadgeColor(): string {
    switch (this.promotionTier) {
      case 'premium':
        return '#8B5CF6'; // Purple
      case 'highlight':
        return '#F59E0B'; // Amber
      case 'featured':
        return '#3B82F6'; // Blue
      default:
        return '#6B7280'; // Gray
    }
  }

  get promotionBadgeText(): string {
    if (this.hasUrgentBadge) {
      return 'URGENT';
    }
    switch (this.promotionTier) {
      case 'premium':
        return 'PREMIUM';
      case 'highlight':
        return 'HIGHLIGHT';
      case 'featured':
        return 'FEATURED';
      default:
        return '';
    }
  }

  get displayMultiplier(): number {
    switch (this.promotionTier) {
      case 'premium':
        return 3.0;
      case 'highlight':
        return 2.5;
      case 'featured':
        return 2.0;
      default:
        return 1.0;
    }
  }

  get shouldShowImageCarousel(): boolean {
    return this.isActivelyPromoted && this.promotionTier !== 'standard' && this.promotionTier !== undefined;
  }

  get featuredImages(): PropertyImage[] {
    if (!this.images || this.images.length === 0) {
      return [{ url: this.imageUrl, tag: 'other' }];
    }

    // Prioritize images with specific tags (exterior, living_room, kitchen)
    const priorityTags: PropertyImageTag[] = ['exterior', 'living_room', 'kitchen'];
    const taggedImages = this.images.filter(img => priorityTags.includes(img.tag));

    // If we have tagged images, return up to 3
    if (taggedImages.length >= 3) {
      return taggedImages.slice(0, 3);
    }

    // Otherwise, combine tagged images with first available images
    const remainingImages = this.images.filter(img => !taggedImages.includes(img));
    const combined = [...taggedImages, ...remainingImages];

    return combined.slice(0, 3);
  }

  // Factory method
  static fromDTO(dto: any): Property {
    return new Property(
      dto.id,
      dto.sellerId,
      dto.status,
      dto.price,
      {
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        city: dto.city,
        country: dto.country,
      },
      dto.beds,
      dto.baths,
      dto.livingRooms,
      dto.sqft,
      dto.yearBuilt,
      dto.parking,
      dto.description,
      dto.specialFeatures || [],
      dto.materials || [],
      dto.amenities || [],
      dto.imageUrl,
      dto.seller,
      dto.propertyType,
      dto.soldAt,
      dto.tourUrl,
      dto.virtualTour360Url,
      dto.hasVirtualTour360,
      dto.images,
      dto.floorNumber,
      dto.totalFloors,
      dto.floorplanUrl,
      dto.createdAt,
      dto.lastRenewed,
      dto.views,
      dto.saves,
      dto.inquiries,
      dto.furnishing,
      dto.heatingType,
      dto.condition,
      dto.viewType,
      dto.energyRating,
      dto.hasBalcony,
      dto.hasGarden,
      dto.hasElevator,
      dto.hasSecurity,
      dto.hasAirConditioning,
      dto.hasPool,
      dto.petsAllowed,
      dto.distanceToCenter,
      dto.distanceToSea,
      dto.distanceToSchool,
      dto.distanceToHospital,
      // Promotion fields
      dto.isPromoted,
      dto.promotionTier,
      dto.promotionStartDate,
      dto.promotionEndDate,
      dto.hasUrgentBadge
    );
  }

  toDTO(): any {
    return {
      id: this.id,
      sellerId: this.sellerId,
      status: this.status,
      price: this.price,
      address: this.location.address,
      city: this.location.city,
      country: this.location.country,
      lat: this.location.lat,
      lng: this.location.lng,
      beds: this.beds,
      baths: this.baths,
      livingRooms: this.livingRooms,
      sqft: this.sqft,
      yearBuilt: this.yearBuilt,
      parking: this.parking,
      description: this.description,
      specialFeatures: this.specialFeatures,
      materials: this.materials,
      amenities: this.amenities,
      imageUrl: this.imageUrl,
      seller: this.seller,
      propertyType: this.propertyType,
      soldAt: this.soldAt,
      tourUrl: this.tourUrl,
      virtualTour360Url: this.virtualTour360Url,
      hasVirtualTour360: this.hasVirtualTour360,
      images: this.images,
      floorNumber: this.floorNumber,
      totalFloors: this.totalFloors,
      floorplanUrl: this.floorplanUrl,
      createdAt: this.createdAt,
      lastRenewed: this.lastRenewed,
      views: this.views,
      saves: this.saves,
      inquiries: this.inquiries,
      furnishing: this.furnishing,
      heatingType: this.heatingType,
      condition: this.condition,
      viewType: this.viewType,
      energyRating: this.energyRating,
      hasBalcony: this.hasBalcony,
      hasGarden: this.hasGarden,
      hasElevator: this.hasElevator,
      hasSecurity: this.hasSecurity,
      hasAirConditioning: this.hasAirConditioning,
      hasPool: this.hasPool,
      petsAllowed: this.petsAllowed,
      distanceToCenter: this.distanceToCenter,
      distanceToSea: this.distanceToSea,
      distanceToSchool: this.distanceToSchool,
      distanceToHospital: this.distanceToHospital,
      // Promotion fields
      isPromoted: this.isPromoted,
      promotionTier: this.promotionTier,
      promotionStartDate: this.promotionStartDate,
      promotionEndDate: this.promotionEndDate,
      hasUrgentBadge: this.hasUrgentBadge,
    };
  }
}
