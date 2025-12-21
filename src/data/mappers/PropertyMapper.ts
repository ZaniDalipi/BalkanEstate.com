// Property Mapper
// Converts between API DTOs and domain Property entity

import { Property } from '../../domain/entities/Property';

export class PropertyMapper {
  static toDomain(dto: any): Property {
    return Property.fromDTO({
      id: dto._id || dto.id,
      sellerId: dto.sellerId || dto.userId,
      status: dto.status,
      price: dto.price,
      lat: dto.lat || dto.location?.lat,
      lng: dto.lng || dto.location?.lng,
      address: dto.address || dto.location?.address,
      city: dto.city || dto.location?.city,
      country: dto.country || dto.location?.country,
      beds: dto.beds,
      baths: dto.baths,
      livingRooms: dto.livingRooms,
      sqft: dto.sqft,
      yearBuilt: dto.yearBuilt,
      parking: dto.parking,
      description: dto.description,
      specialFeatures: dto.specialFeatures || [],
      materials: dto.materials || [],
      amenities: dto.amenities || [],
      imageUrl: dto.imageUrl || dto.images?.[0]?.url || '',
      seller: dto.seller,
      propertyType: dto.propertyType,
      soldAt: dto.soldAt,
      tourUrl: dto.tourUrl,
      virtualTour360Url: dto.virtualTour360Url,
      hasVirtualTour360: dto.hasVirtualTour360,
      images: dto.images,
      floorNumber: dto.floorNumber,
      totalFloors: dto.totalFloors,
      floorplanUrl: dto.floorplanUrl,
      createdAt: dto.createdAt,
      lastRenewed: dto.lastRenewed,
      views: dto.views,
      saves: dto.saves,
      inquiries: dto.inquiries,
      furnishing: dto.furnishing,
      heatingType: dto.heatingType,
      condition: dto.condition,
      viewType: dto.viewType,
      energyRating: dto.energyRating,
      hasBalcony: dto.hasBalcony,
      hasGarden: dto.hasGarden,
      hasElevator: dto.hasElevator,
      hasSecurity: dto.hasSecurity,
      hasAirConditioning: dto.hasAirConditioning,
      hasPool: dto.hasPool,
      petsAllowed: dto.petsAllowed,
      distanceToCenter: dto.distanceToCenter,
      distanceToSea: dto.distanceToSea,
      distanceToSchool: dto.distanceToSchool,
      distanceToHospital: dto.distanceToHospital,
      // Promotion fields
      isPromoted: dto.isPromoted,
      promotionTier: dto.promotionTier,
      promotionStartDate: dto.promotionStartDate,
      promotionEndDate: dto.promotionEndDate,
      hasUrgentBadge: dto.hasUrgentBadge,
    });
  }

  static toDTO(property: Property): any {
    return property.toDTO();
  }

  static toCreateDTO(property: Property): any {
    const dto = property.toDTO();
    // Remove fields that shouldn't be in create request
    delete dto.id;
    delete dto.createdAt;
    delete dto.lastRenewed;
    delete dto.views;
    delete dto.saves;
    delete dto.inquiries;
    return dto;
  }
}
