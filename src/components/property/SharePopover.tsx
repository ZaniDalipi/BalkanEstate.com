// SharePopover Component
// Social sharing functionality for properties

import React, { useState } from 'react';
import { Property } from '../../../types';
import {
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  EnvelopeIcon,
} from '../../../constants';

interface SharePopoverProps {
  property: Property;
  onClose: () => void;
}

/**
 * SharePopover Component
 *
 * Provides social sharing options for properties:
 * - Copy link
 * - Facebook
 * - Twitter
 * - WhatsApp
 * - Email
 *
 * Usage:
 * ```tsx
 * <SharePopover property={property} onClose={() => setShowShare(false)} />
 * ```
 */
export const SharePopover: React.FC<SharePopoverProps> = ({ property, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const propertyUrl = `${window.location.origin}${window.location.pathname}?propertyId=${property.id}`;
    navigator.clipboard.writeText(propertyUrl).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    });
  };

  const getShareUrl = (service: 'facebook' | 'twitter' | 'whatsapp' | 'email') => {
    const propertyUrl = encodeURIComponent(
      `${window.location.origin}${window.location.pathname}?propertyId=${property.id}`
    );
    const text = encodeURIComponent(
      `Check out this property on Balkan Estate: ${property.address}, ${property.city}`
    );

    switch (service) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${propertyUrl}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${propertyUrl}&text=${text}`;
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${text}%20${propertyUrl}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent(
          `Property Listing: ${property.address}`
        )}&body=${text}%0A%0A${propertyUrl}`;
    }
  };

  const openShareWindow = (url: string, service: 'email' | 'other' = 'other') => {
    if (service === 'email') {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-neutral-200 p-4 z-20 animate-fade-in">
      <h4 className="font-bold text-neutral-800 mb-3 text-center">Share this Property</h4>

      <button
        onClick={handleCopyLink}
        className="w-full text-left px-3 py-2 rounded-md hover:bg-neutral-100 font-semibold text-neutral-700 mb-2"
      >
        {copied ? '✅ Link Copied!' : '📋 Copy Link'}
      </button>

      <div className="border-t border-neutral-200 pt-2 flex items-center justify-around">
        <a
          href={getShareUrl('facebook')}
          onClick={(e) => {
            e.preventDefault();
            openShareWindow(getShareUrl('facebook'));
          }}
          className="p-2 rounded-full hover:bg-blue-50 text-[#1877F2]"
          aria-label="Share on Facebook"
        >
          <FacebookIcon className="w-7 h-7" />
        </a>

        <a
          href={getShareUrl('twitter')}
          onClick={(e) => {
            e.preventDefault();
            openShareWindow(getShareUrl('twitter'));
          }}
          className="p-2 rounded-full hover:bg-neutral-100 text-black"
          aria-label="Share on Twitter"
        >
          <TwitterIcon className="w-6 h-6" />
        </a>

        <a
          href={getShareUrl('whatsapp')}
          onClick={(e) => {
            e.preventDefault();
            openShareWindow(getShareUrl('whatsapp'));
          }}
          className="p-2 rounded-full hover:bg-green-50 text-[#25D366]"
          aria-label="Share on WhatsApp"
        >
          <WhatsappIcon className="w-7 h-7" />
        </a>

        <a
          href={getShareUrl('email')}
          onClick={(e) => {
            e.preventDefault();
            openShareWindow(getShareUrl('email'), 'email');
          }}
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-600"
          aria-label="Share via Email"
        >
          <EnvelopeIcon className="w-7 h-7" />
        </a>
      </div>
    </div>
  );
};
