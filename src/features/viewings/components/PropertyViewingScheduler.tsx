// PropertyViewingScheduler - Component for scheduling viewings on property details page
// Integrates PropertyViewingSlots and BookingModal with success/error states

import React, { useState } from 'react';
import { PropertyViewingSlots } from './PropertyViewingSlots';
import { BookingModal } from './BookingModal';
import type { AvailableSlot } from '../types';

interface PropertyInfo {
  id: string;
  title?: string;
  address: string;
  city: string;
  imageUrl?: string;
  price?: number;
  sellerId?: string;
}

interface PropertyViewingSchedulerProps {
  property: PropertyInfo;
  isOwner?: boolean;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}

export const PropertyViewingScheduler: React.FC<PropertyViewingSchedulerProps> = ({
  property,
  isOwner = false,
  isAuthenticated = false,
  onRequestAuth,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSlotSelect = (slot: AvailableSlot, date: string) => {
    if (!isAuthenticated) {
      onRequestAuth?.();
      return;
    }
    setSelectedSlot(slot);
    setSelectedDate(date);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setSelectedDate(null);
    setShowSuccessMessage(true);

    // Hide success message after 5 seconds
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  const handleCloseModal = () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    setSelectedDate(null);
  };

  // Don't show for property owners
  if (isOwner) {
    return null;
  }

  return (
    <div className="relative">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-green-800">Viewing Booked!</h4>
              <p className="text-sm text-green-600">
                You'll receive a confirmation email shortly. We'll remind you before your viewing.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-auto p-1 hover:bg-green-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Viewing Slots Component */}
      <PropertyViewingSlots
        propertyId={property.id}
        onSlotSelect={handleSlotSelect}
        selectedSlot={selectedSlot}
      />

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && selectedDate && (
        <BookingModal
          property={property}
          slot={selectedSlot}
          date={selectedDate}
          onClose={handleCloseModal}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Login Prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              <button
                onClick={onRequestAuth}
                className="font-semibold underline hover:no-underline"
              >
                Sign in
              </button>
              {' '}to book a viewing for this property.
            </p>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PropertyViewingScheduler;
