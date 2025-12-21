// PropertyInfo Component
// Displays property details, description, and amenities

import React from 'react';
import { Property } from '../../../types';
import { formatPrice } from '../../../utils/currency';
import {
  MapPinIcon,
  BedIcon,
  BathIcon,
  SqftIcon,
  CalendarIcon,
  ParkingIcon,
  StarIcon,
  CubeIcon,
  BuildingOfficeIcon,
  CubeTransparentIcon,
  LivingRoomIcon,
  CheckCircleIcon,
} from '../../../constants';
import { DetailItem } from './PropertyCommon';

interface PropertyInfoProps {
  property: Property;
  onOpenFloorPlan: () => void;
}

/**
 * PropertyInfo Component
 *
 * Comprehensive property information display including:
 * - Price and address
 * - Key stats (beds, baths, sqft)
 * - Description
 * - Detailed property information
 * - Amenities and features
 * - Distance information
 *
 * Usage:
 * ```tsx
 * <PropertyInfo
 *   property={property}
 *   onOpenFloorPlan={() => setFloorPlanOpen(true)}
 * />
 * ```
 */
export const PropertyInfo: React.FC<PropertyInfoProps> = ({ property, onOpenFloorPlan }) => {
  return (
    <>
      {/* Price, Address, and Key Stats */}
      <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
        <div className="p-6">
          {property.status === 'sold' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-neutral-100 to-neutral-200 border-l-4 border-neutral-600 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-neutral-700" />
                <span className="font-bold text-lg text-neutral-800">Property Sold</span>
              </div>
              <p className="text-sm text-neutral-600 mt-1">
                This property has been sold and is no longer available.
              </p>
            </div>
          )}

          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900">
            {formatPrice(property.price, property.country)}
          </p>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-neutral-600 mt-2 group"
            title="Open in Google Maps"
          >
            <MapPinIcon className="w-5 h-5 mr-2 text-neutral-400 group-hover:text-primary transition-colors" />
            <span className="text-sm sm:text-base lg:text-lg group-hover:underline group-hover:text-primary transition-colors">
              {property.address}, {property.city}, {property.country}
            </span>
          </a>

          <div className="mt-6 flex flex-wrap justify-around text-base sm:text-lg text-neutral-800 border-t border-neutral-200 pt-4 gap-4">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
              <BedIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span>
                <span className="font-bold">{property.beds}</span> beds
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
              <BathIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span>
                <span className="font-bold">{property.baths}</span> baths
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
              <LivingRoomIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span>
                <span className="font-bold">{property.livingRooms}</span>{' '}
                {property.livingRooms === 1 ? 'living room' : 'living rooms'}
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary-light/50 transition-all duration-200 cursor-default group">
              <SqftIcon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              <span>
                <span className="font-bold">{property.sqft}</span> m²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* About This Home */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-4">About This Home</h3>
        <div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
          {property.description}
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
        <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-6">Property Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-4">
          <DetailItem icon={<CalendarIcon />} label="Year Built">
            {property.yearBuilt}
          </DetailItem>
          <DetailItem icon={<ParkingIcon />} label="Parking">
            {property.parking > 0
              ? `${property.parking} ${property.parking === 1 ? 'spot' : 'spots'}`
              : 'None'}
          </DetailItem>

          {property.propertyType === 'apartment' && property.floorNumber && (
            <DetailItem icon={<BuildingOfficeIcon />} label="Floor">
              {property.floorNumber}
            </DetailItem>
          )}
          {(property.propertyType === 'house' || property.propertyType === 'villa') &&
            property.totalFloors && (
              <DetailItem icon={<BuildingOfficeIcon />} label="Floors">
                {property.totalFloors}
              </DetailItem>
            )}

          {property.furnishing && property.furnishing !== 'any' && (
            <DetailItem icon={<span className="text-2xl">🛋️</span>} label="Furnishing">
              <span className="capitalize">{property.furnishing.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.heatingType &&
            property.heatingType !== 'any' &&
            property.heatingType !== 'none' && (
              <DetailItem icon={<span className="text-2xl">🔥</span>} label="Heating">
                <span className="capitalize">{property.heatingType.replace('-', ' ')}</span>
              </DetailItem>
            )}

          {property.condition && property.condition !== 'any' && (
            <DetailItem icon={<span className="text-2xl">⭐</span>} label="Condition">
              <span className="capitalize">{property.condition.replace('-', ' ')}</span>
            </DetailItem>
          )}

          {property.viewType && property.viewType !== 'any' && (
            <DetailItem icon={<span className="text-2xl">👁️</span>} label="View">
              <span className="capitalize">{property.viewType} View</span>
            </DetailItem>
          )}

          {property.energyRating && property.energyRating !== 'any' && (
            <DetailItem icon={<span className="text-2xl">⚡</span>} label="Energy Rating">
              <span className="font-bold text-lg">{property.energyRating}</span>
            </DetailItem>
          )}

          {property.floorplanUrl && (
            <div className="sm:col-span-2">
              <DetailItem icon={<CubeTransparentIcon />} label="Floor Plan">
                <button
                  onClick={onOpenFloorPlan}
                  className="px-4 py-2 bg-primary-light text-primary-dark font-semibold rounded-lg hover:bg-primary/20 transition-colors"
                >
                  View Interactive Floor Plan
                </button>
              </DetailItem>
            </div>
          )}

          <div className="sm:col-span-2">
            <DetailItem icon={<StarIcon />} label="Special Features">
              {Array.isArray(property.specialFeatures) && property.specialFeatures.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {property.specialFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : (
                'Not listed'
              )}
            </DetailItem>
          </div>
          <div className="sm:col-span-2">
            <DetailItem icon={<CubeIcon />} label="Materials">
              {Array.isArray(property.materials) && property.materials.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {property.materials.map((material) => (
                    <li key={material}>{material}</li>
                  ))}
                </ul>
              ) : (
                'Not listed'
              )}
            </DetailItem>
          </div>
        </div>
      </div>

      {/* Amenities & Features Section */}
      {((property.amenities && property.amenities.length > 0) ||
        property.hasBalcony !== undefined ||
        property.hasGarden !== undefined ||
        property.hasElevator !== undefined ||
        property.hasSecurity !== undefined ||
        property.hasAirConditioning !== undefined ||
        property.hasPool !== undefined ||
        property.petsAllowed !== undefined ||
        property.distanceToCenter !== undefined ||
        property.distanceToSea !== undefined ||
        property.distanceToSchool !== undefined ||
        property.distanceToHospital !== undefined) && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
          <h3 className="text-lg sm:text-xl font-bold text-neutral-800 mb-6">
            Amenities & Features
          </h3>

          {/* Hashtag-style Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-neutral-700 mb-3">Property Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-4 py-2 bg-primary-light text-primary-dark font-semibold rounded-full text-sm border border-primary/20 hover:bg-primary/20 hover:scale-105 hover:shadow-md transition-all duration-200 cursor-default"
                  >
                    {amenity.startsWith('#') ? amenity : `#${amenity}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Boolean Property Features */}
          {(property.hasBalcony !== undefined ||
            property.hasGarden !== undefined ||
            property.hasElevator !== undefined ||
            property.hasSecurity !== undefined ||
            property.hasAirConditioning !== undefined ||
            property.hasPool !== undefined ||
            property.petsAllowed !== undefined) && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-neutral-700 mb-3">Property Features</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.hasBalcony !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasBalcony
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasBalcony ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Balcony/Terrace</span>
                      <span
                        className={`block text-xs ${
                          property.hasBalcony ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasBalcony ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasGarden !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasGarden
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasGarden ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Garden/Yard</span>
                      <span
                        className={`block text-xs ${
                          property.hasGarden ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasGarden ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasElevator !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasElevator
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasElevator ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Elevator</span>
                      <span
                        className={`block text-xs ${
                          property.hasElevator ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasElevator ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasSecurity !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasSecurity
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasSecurity ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Security System</span>
                      <span
                        className={`block text-xs ${
                          property.hasSecurity ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasSecurity ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasAirConditioning !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasAirConditioning
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasAirConditioning ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Air Conditioning</span>
                      <span
                        className={`block text-xs ${
                          property.hasAirConditioning ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasAirConditioning ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.hasPool !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.hasPool ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.hasPool ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Swimming Pool</span>
                      <span
                        className={`block text-xs ${
                          property.hasPool ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.hasPool ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                )}
                {property.petsAllowed !== undefined && (
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                      property.petsAllowed
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-red-50 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <span className="text-2xl">{property.petsAllowed ? '✓' : '✗'}</span>
                    <div>
                      <span className="font-medium text-neutral-800">Pets Allowed</span>
                      <span
                        className={`block text-xs ${
                          property.petsAllowed ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {property.petsAllowed ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Distance Information */}
          {(property.distanceToCenter !== undefined ||
            property.distanceToSea !== undefined ||
            property.distanceToSchool !== undefined ||
            property.distanceToHospital !== undefined) && (
            <div>
              <h4 className="text-md font-semibold text-neutral-700 mb-3">
                Distance Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.distanceToCenter !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏙️</span>
                    <div>
                      <span className="font-medium text-neutral-800">City Center</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToCenter.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToSea !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🌊</span>
                    <div>
                      <span className="font-medium text-neutral-800">Sea/Beach</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToSea.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToSchool !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏫</span>
                    <div>
                      <span className="font-medium text-neutral-800">School</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToSchool.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
                {property.distanceToHospital !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-100 cursor-default">
                    <span className="text-2xl">🏥</span>
                    <div>
                      <span className="font-medium text-neutral-800">Hospital</span>
                      <span className="block text-sm text-blue-700 font-semibold">
                        {property.distanceToHospital.toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
