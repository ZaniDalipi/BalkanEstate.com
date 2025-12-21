// Agency Mapper
// Converts between API DTOs and domain Agency entity

import { Agency } from '../../domain/entities/Agency';

export class AgencyMapper {
  static toDomain(dto: any): Agency {
    return Agency.fromDTO({
      id: dto._id || dto.id,
      _id: dto._id,
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      logo: dto.logo,
      coverImage: dto.coverImage,
      email: dto.email,
      phone: dto.phone,
      city: dto.city,
      country: dto.country,
      address: dto.address,
      website: dto.website,
      lat: dto.lat || dto.location?.lat,
      lng: dto.lng || dto.location?.lng,
      totalProperties: dto.totalProperties || 0,
      totalAgents: dto.totalAgents || 0,
      yearsInBusiness: dto.yearsInBusiness,
      isFeatured: dto.isFeatured || false,
      specialties: dto.specialties,
      certifications: dto.certifications,
      agents: dto.agents,
      ownerId: dto.ownerId,
      admins: dto.admins,
      invitationCode: dto.invitationCode,
    });
  }

  static toDTO(agency: Agency): any {
    return agency.toDTO();
  }
}
