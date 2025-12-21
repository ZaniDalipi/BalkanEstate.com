// Domain Entity: SavedSearch
// Pure TypeScript - No framework dependencies

import { PropertyFilters } from './PropertyFilters';

export class SavedSearch {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly filters: PropertyFilters,
    public readonly drawnBoundsJSON: string | null,
    public readonly createdAt: number,
    public readonly lastAccessed: number
  ) {}

  // Business logic methods

  get age(): number {
    return Date.now() - this.createdAt;
  }

  get ageDays(): number {
    return Math.floor(this.age / (1000 * 60 * 60 * 24));
  }

  get timeSinceLastAccess(): number {
    return Date.now() - this.lastAccessed;
  }

  get daysSinceLastAccess(): number {
    return Math.floor(this.timeSinceLastAccess / (1000 * 60 * 60 * 24));
  }

  isRecentlyAccessed(daysThreshold: number = 7): boolean {
    return this.daysSinceLastAccess < daysThreshold;
  }

  isStale(daysThreshold: number = 30): boolean {
    return this.daysSinceLastAccess >= daysThreshold;
  }

  hasCustomBounds(): boolean {
    return this.drawnBoundsJSON !== null;
  }

  get filterSummary(): string {
    const parts: string[] = [];

    if (this.filters.country && this.filters.country !== 'any') {
      parts.push(this.filters.country);
    }

    if (this.filters.propertyType && this.filters.propertyType !== 'any') {
      parts.push(this.filters.propertyType);
    }

    if (this.filters.minPrice || this.filters.maxPrice) {
      const priceRange = [
        this.filters.minPrice ? `€${this.filters.minPrice.toLocaleString()}` : '',
        this.filters.maxPrice ? `€${this.filters.maxPrice.toLocaleString()}` : ''
      ].filter(Boolean).join(' - ');
      if (priceRange) parts.push(priceRange);
    }

    if (this.filters.beds) {
      parts.push(`${this.filters.beds}+ beds`);
    }

    if (this.filters.baths) {
      parts.push(`${this.filters.baths}+ baths`);
    }

    return parts.join(', ') || 'No filters';
  }

  matchesProperty(property: any): boolean {
    // Simple matching logic - can be expanded
    if (this.filters.minPrice && property.price < this.filters.minPrice) return false;
    if (this.filters.maxPrice && property.price > this.filters.maxPrice) return false;
    if (this.filters.beds && property.beds < this.filters.beds) return false;
    if (this.filters.baths && property.baths < this.filters.baths) return false;
    if (this.filters.propertyType !== 'any' && property.propertyType !== this.filters.propertyType) return false;
    return true;
  }

  // Factory method
  static fromDTO(dto: any): SavedSearch {
    return new SavedSearch(
      dto.id,
      dto.name,
      PropertyFilters.fromDTO(dto.filters),
      dto.drawnBoundsJSON,
      dto.createdAt,
      dto.lastAccessed
    );
  }

  toDTO(): any {
    return {
      id: this.id,
      name: this.name,
      filters: this.filters.toDTO(),
      drawnBoundsJSON: this.drawnBoundsJSON,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
    };
  }
}
