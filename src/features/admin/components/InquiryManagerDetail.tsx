import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  HomeIcon,
  UserIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from '@/constants';
import type { Inquiry } from './useInquiryManager';
import UserAvatar from '@/components/shared/UserAvatar';

interface InquiryDetailProps {
  inquiry: Inquiry;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onSaveNotes: () => void;
  onDelete: (id: string) => void;
  formatDate: (dateString: string) => string;
  getStatusBadgeColor: (status: string) => string;
  getTypeBadgeColor: (type: string) => string;
}

const InquiryManagerDetail: React.FC<InquiryDetailProps> = ({
  inquiry,
  adminNotes,
  setAdminNotes,
  onClose,
  onUpdateStatus,
  onSaveNotes,
  onDelete,
  formatDate,
  getStatusBadgeColor,
  getTypeBadgeColor,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">{t('admin:inquiries.inquiryDetails')}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(inquiry.type)}`}>
              {inquiry.type.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(inquiry.status)}`}>
              {inquiry.status}
            </span>
          </div>
          <button onClick={onClose}>
            <XMarkIcon className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Sender Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              {t('admin:inquiries.senderBuyerInfo')}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">{t('admin:inquiries.name')}</label>
                <p className="font-medium">{inquiry.buyerName}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('admin:inquiries.email')}</label>
                <p className="font-medium flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${inquiry.buyerEmail}`} className="text-blue-600 hover:underline">
                    {inquiry.buyerEmail}
                  </a>
                </p>
              </div>
              {inquiry.buyerPhone && (
                <div>
                  <label className="text-xs text-gray-500">{t('admin:inquiries.phone')}</label>
                  <p className="font-medium flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${inquiry.buyerPhone}`} className="text-blue-600 hover:underline">
                      {inquiry.buyerPhone}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-3">{t('admin:inquiries.recipientAgentSeller')}</h4>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-blue-50">
                <UserAvatar
                  src={inquiry.recipientId?.avatarUrl}
                  alt={inquiry.recipientName}
                  gender={inquiry.recipientId?.gender}
                  seed={inquiry.recipientId?._id || inquiry.recipientName}
                  avatarOptions={inquiry.recipientId?.avatarOptions}
                  width={96}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">{inquiry.recipientName}</p>
                <p className="text-sm text-gray-600">{inquiry.recipientEmail}</p>
              </div>
            </div>
          </div>

          {/* Property Info (if applicable) */}
          {inquiry.propertyId && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <HomeIcon className="w-5 h-5" />
                {t('admin:inquiries.property')}
              </h4>
              <div className="flex items-center gap-4">
                {inquiry.propertyId.images?.[0] && (
                  <img
                    src={inquiry.propertyId.images[0]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium">{inquiry.propertyId.title}</p>
                  <p className="text-sm text-gray-600">
                    {inquiry.propertyId.city}, {inquiry.propertyId.country}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {inquiry.propertyId.price?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Location for area search */}
          {inquiry.type === 'area_search' && inquiry.location && (
            <div className="bg-teal-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">{t('admin:inquiries.searchPreferences')}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">{t('admin:inquiries.location')}</label>
                  <p className="font-medium">{inquiry.location}</p>
                </div>
                {inquiry.propertyType && (
                  <div>
                    <label className="text-xs text-gray-500">{t('admin:inquiries.propertyType')}</label>
                    <p className="font-medium">{inquiry.propertyType}</p>
                  </div>
                )}
                {inquiry.budget && (
                  <div>
                    <label className="text-xs text-gray-500">{t('admin:inquiries.budget')}</label>
                    <p className="font-medium">{inquiry.budget.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Advertising request details */}
          {(() => {
            const adInq = inquiry as { adPage?: string; adPlacement?: string; attachmentUrl?: string };
            if (!adInq.adPage && !adInq.adPlacement && !adInq.attachmentUrl) return null;
            return (
              <div className="bg-indigo-50 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-2">
                  🔥 {t('admin:inquiries.advertisingRequest', 'Advertising Request')}
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-xs text-gray-500">{t('admin:inquiries.requestedPage', 'Requested page')}</label>
                    <p className="font-medium">{adInq.adPage || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t('admin:inquiries.requestedPlacement', 'Requested placement')}</label>
                    <p className="font-medium">{adInq.adPlacement || '-'}</p>
                  </div>
                </div>
                {adInq.attachmentUrl && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{t('admin:inquiries.creative', 'Attached creative')}</label>
                    <a href={adInq.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={adInq.attachmentUrl}
                        alt="Advertiser creative"
                        className="max-h-64 rounded-lg border border-indigo-200 object-contain bg-white"
                      />
                    </a>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Message */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">{t('admin:inquiries.message')}</h4>
            <div className="bg-gray-100 rounded-lg p-4 whitespace-pre-wrap">
              {inquiry.message}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <label className="text-xs text-gray-500">{t('admin:inquiries.created')}</label>
              <p>{formatDate(inquiry.createdAt)}</p>
            </div>
            {inquiry.readAt && (
              <div>
                <label className="text-xs text-gray-500">{t('admin:inquiries.read')}</label>
                <p>{formatDate(inquiry.readAt)}</p>
              </div>
            )}
            {inquiry.repliedAt && (
              <div>
                <label className="text-xs text-gray-500">{t('admin:inquiries.replied')}</label>
                <p>{formatDate(inquiry.repliedAt)}</p>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">{t('admin:inquiries.adminNotes')}</h4>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this inquiry..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
            <button
              onClick={onSaveNotes}
              className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              {t('admin:inquiries.saveNotes')}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
          <button
            onClick={() => onUpdateStatus(inquiry._id, 'replied')}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            {t('admin:inquiries.markAsReplied')}
          </button>
          <button
            onClick={() => onUpdateStatus(inquiry._id, 'archived')}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
          >
            <ArchiveBoxIcon className="w-5 h-5" />
            {t('admin:inquiries.archive')}
          </button>
          <button
            onClick={() => onDelete(inquiry._id)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            {t('admin:inquiries.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InquiryManagerDetail;
