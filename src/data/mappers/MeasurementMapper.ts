// Measurement Mapper
// Converts between DTOs and domain entities

import { Measurement, MeasurementPoint } from '@/src/domain/entities/Measurement';
import { MeasurementDTO, MeasurementPointDTO } from '../api/MeasurementApiClient';

/**
 * Mapper for Measurement entity
 */
export class MeasurementMapper {
  /**
   * Map DTO to domain entity
   */
  static toDomain(dto: MeasurementDTO): Measurement {
    return new Measurement(
      dto.id,
      dto.name,
      dto.points.map(p => MeasurementMapper.pointToDomain(p)),
      dto.type,
      dto.distance || 0,
      dto.area || 0,
      dto.perimeter || 0,
      dto.address || null,
      dto.notes || null,
      new Date(dto.createdAt),
      dto.updatedAt ? new Date(dto.updatedAt) : null
    );
  }

  /**
   * Map domain entity to DTO
   */
  static toDTO(entity: Measurement): MeasurementDTO {
    return {
      id: entity.id,
      name: entity.name,
      points: entity.points.map(p => MeasurementMapper.pointToDTO(p)),
      type: entity.type,
      distance: entity.distance,
      area: entity.area,
      perimeter: entity.perimeter,
      address: entity.address || undefined,
      notes: entity.notes || undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt?.toISOString(),
    };
  }

  /**
   * Map array of DTOs to domain entities
   */
  static toDomainList(dtos: MeasurementDTO[]): Measurement[] {
    return dtos.map(dto => MeasurementMapper.toDomain(dto));
  }

  /**
   * Map point DTO to domain
   */
  private static pointToDomain(dto: MeasurementPointDTO): MeasurementPoint {
    return {
      lat: dto.lat,
      lng: dto.lng,
    };
  }

  /**
   * Map point domain to DTO
   */
  private static pointToDTO(point: MeasurementPoint): MeasurementPointDTO {
    return {
      lat: point.lat,
      lng: point.lng,
    };
  }
}
