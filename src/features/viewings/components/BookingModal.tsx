// BookingModal - Modal for booking a property viewing
// Shows property details, selected slot, and allows adding notes

import React, { useState } from 'react';
import { useViewingMutations } from '../hooks/useViewingMutations';
import type { AvailableSlot } from '../types';

interface PropertyInfo {
  id: string;
  title?: string;
  address: string;
  city: string;
  imageUrl?: string;
  price?: number;
}

interface BookingModalProps {
  property: PropertyInfo;
  slot: AvailableSlot;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  property,
  slot,
  date,
  onClose,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const { bookViewing, isBooking, bookError } = useViewingMutations();

  const handleBook = async () => {
    try {
      await bookViewing({
        propertyId: property.id,
        startTime: slot.startTime,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to book viewing:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative">
          {property.imageUrl ? (
            <img
              src={property.imageUrl}
              alt={property.title || property.address}
              className="w-full h-40 object-cover"
            />
          ) : (
            <div className="w-full h-40 bg-gradient-to-r from-blue-600 to-blue-700" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h2 className="text-white font-semibold text-lg">
              {property.title || property.address}
            </h2>
            {property.price && (
              <p className="text-white/90 text-sm">{formatPrice(property.price)}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Your Viewing</h3>

          {/* Viewing Details */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{formatDate(date)}</p>
                <p className="text-blue-600 font-semibold">{slot.formatted}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Property Location</p>
              <p className="text-gray-900">{property.address}, {property.city}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any questions or specific things you'd like to see?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{notes.length}/500 characters</p>
          </div>

          {/* Error Message */}
          {bookError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {(bookError as Error).message || 'Failed to book viewing. Please try again.'}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isBooking}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={isBooking}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Booking...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Booking
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            You'll receive a confirmation email and reminders before your viewing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
