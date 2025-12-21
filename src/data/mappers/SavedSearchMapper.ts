// SavedSearch Mapper
// Converts between API DTOs and domain SavedSearch entity

import { SavedSearch } from '../../domain/entities/SavedSearch';

export class SavedSearchMapper {
  static toDomain(dto: any): SavedSearch {
    return SavedSearch.fromDTO({
      id: dto._id || dto.id,
      name: dto.name,
      filters: dto.filters,
      drawnBoundsJSON: dto.drawnBoundsJSON,
      createdAt: dto.createdAt,
      lastAccessed: dto.lastAccessed || dto.createdAt,
    });
  }

  static toDTO(savedSearch: SavedSearch): any {
    return savedSearch.toDTO();
  }
}
