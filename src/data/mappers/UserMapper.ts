// User Mapper
// Converts between API DTOs and domain User/Agent entities

import { User, Agent, UserRole } from '../../domain/entities/User';

export class UserMapper {
  static toDomain(dto: any): User {
    return User.fromDTO({
      id: dto._id || dto.id,
      _id: dto._id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role as UserRole,
      isSubscribed: dto.isSubscribed || false,
      avatarUrl: dto.avatarUrl,
      city: dto.city,
      country: dto.country,
      agencyName: dto.agencyName,
      agentId: dto.agentId,
      agencyId: dto.agencyId,
      licenseNumber: dto.licenseNumber,
      licenseVerified: dto.licenseVerified,
      licenseVerificationDate: dto.licenseVerificationDate,
      listingsCount: dto.listingsCount,
      totalListingsCreated: dto.totalListingsCreated,
      testimonials: dto.testimonials,
      publicKey: dto.publicKey,
    });
  }

  static toDTO(user: User): any {
    return user.toDTO();
  }

  static toAgentDomain(dto: any): Agent {
    return Agent.fromDTO({
      id: dto._id || dto.id,
      _id: dto._id,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role as UserRole,
      isSubscribed: dto.isSubscribed || false,
      avatarUrl: dto.avatarUrl,
      city: dto.city,
      country: dto.country,
      agencyName: dto.agencyName,
      agentId: dto.agentId,
      agencyId: dto.agencyId,
      licenseNumber: dto.licenseNumber,
      licenseVerified: dto.licenseVerified,
      licenseVerificationDate: dto.licenseVerificationDate,
      listingsCount: dto.listingsCount,
      totalListingsCreated: dto.totalListingsCreated,
      testimonials: dto.testimonials,
      publicKey: dto.publicKey,
      userId: dto.userId,
      totalSalesValue: dto.totalSalesValue || 0,
      propertiesSold: dto.propertiesSold || 0,
      activeListings: dto.activeListings || 0,
      rating: dto.rating || 0,
      totalReviews: dto.totalReviews,
      bio: dto.bio,
      specializations: dto.specializations,
      yearsOfExperience: dto.yearsOfExperience,
      languages: dto.languages,
      serviceAreas: dto.serviceAreas,
      websiteUrl: dto.websiteUrl,
      facebookUrl: dto.facebookUrl,
      instagramUrl: dto.instagramUrl,
      linkedinUrl: dto.linkedinUrl,
      officeAddress: dto.officeAddress,
      officePhone: dto.officePhone,
    });
  }
}
