import React, { useState } from 'react';
import { addAgentReview } from '../../services/apiService';
import { StarIcon, EnvelopeIcon, HomeIcon } from '../../constants';
import { Property } from '../../types';
import { formatPrice } from '../../utils/currency';

interface AgentReviewFormProps {
  agentId: string;
  agentName: string;
  agentProperties?: Property[];
  onContactAgent?: () => void;
  onReviewSubmitted: () => void;
}

const AgentReviewForm: React.FC<AgentReviewFormProps> = ({
  agentId,
  agentName,
  agentProperties = [],
  onContactAgent,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [quote, setQuote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [showProperties, setShowProperties] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quote.trim()) {
      setError('Please write a review');
      return;
    }

    if (quote.trim().length < 10) {
      setError('Review must be at least 10 characters long');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addAgentReview(agentId, { quote: quote.trim(), rating });
      setSuccess(true);
      setQuote('');
      setRating(5);

      // Call the callback after a short delay to show success message
      setTimeout(() => {
        onReviewSubmitted();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review. Please try again.';
      setError(errorMessage);

      // Check if error is about needing to contact agent first
      if (errorMessage.toLowerCase().includes('conversation') ||
          errorMessage.toLowerCase().includes('contact') ||
          errorMessage.toLowerCase().includes('inquire') ||
          errorMessage.toLowerCase().includes('property')) {
        setShowProperties(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-5xl mb-3">✓</div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Review Submitted!</h3>
        <p className="text-green-700">Thank you for sharing your experience with {agentName}.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-xl font-bold text-neutral-800 mb-4">Write a Review</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Your Rating
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <StarIcon
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-neutral-300'
                  }`}
                />
              </button>
            ))}
            <span className="ml-3 text-lg font-semibold text-neutral-700">
              {rating} {rating === 1 ? 'star' : 'stars'}
            </span>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor="review-text" className="block text-sm font-semibold text-neutral-700 mb-2">
            Your Review
          </label>
          <textarea
            id="review-text"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder={`Share your experience working with ${agentName}...`}
            rows={4}
            className="w-full px-4 py-3 border-2 border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            disabled={isSubmitting}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Minimum 10 characters ({quote.length}/10)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Show Properties if User Needs to Contact Agent First */}
        {showProperties && agentProperties.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <HomeIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                Before Leaving a Review
              </h4>
              <p className="text-gray-700 leading-relaxed">
                To ensure authentic testimonials, please inquire about one of {agentName}'s properties first.
                Browse their current offerings below and start a conversation!
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {agentProperties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4">
                    {/* Property Image */}
                    {property.imageUrl && (
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={property.imageUrl}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Property Details */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-gray-900 mb-1 line-clamp-1">
                        {property.title}
                      </h5>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                        {property.address}, {property.city}
                      </p>
                      <p className="text-lg font-bold text-blue-600 mb-3">
                        {formatPrice(property.price, property.country)}
                      </p>

                      {/* Contact Button */}
                      <button
                        onClick={() => {
                          if (onContactAgent) {
                            onContactAgent();
                          }
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                        <span>Inquire About This Property</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {agentProperties.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <HomeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>This agent currently has no active listings.</p>
                <p className="text-sm mt-2">Please contact them directly to start a conversation.</p>
                {onContactAgent && (
                  <button
                    onClick={onContactAgent}
                    className="mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mx-auto"
                  >
                    <EnvelopeIcon className="w-5 h-5" />
                    <span>Contact {agentName}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !quote.trim()}
          className="w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>
      </form>

      <p className="text-xs text-neutral-500 mt-4 text-center">
        Your review will be publicly visible and associated with your account.
      </p>
    </div>
  );
};

export default AgentReviewForm;
