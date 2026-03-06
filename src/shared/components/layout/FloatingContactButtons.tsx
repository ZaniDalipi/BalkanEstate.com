import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

/**
 * FloatingContactButtons
 *
 * Floating action button (bottom-right) that expands to show
 * WhatsApp and Viber quick-contact options using the company number.
 */
const FloatingContactButtons: React.FC = () => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  const whatsappUrl = `https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}?text=${encodeURIComponent(
    t('floatingContact.whatsappMessage', 'Hi, I have a question about a property on BalkanEstate.')
  )}`;

  const viberUrl = `viber://chat/?number=%2B${CONTACT_CONFIG.social.whatsappNumber}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Expanded buttons */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 animate-fade-in-up">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366] text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg hover:bg-[#20BD5A] transition-all hover:scale-105"
          >
            <span className="text-sm font-semibold whitespace-nowrap">WhatsApp</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>

          {/* Viber */}
          <a
            href={viberUrl}
            className="flex items-center gap-2 bg-[#7360F2] text-white pl-4 pr-3 py-2.5 rounded-full shadow-lg hover:bg-[#6050E0] transition-all hover:scale-105"
          >
            <span className="text-sm font-semibold whitespace-nowrap">Viber</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.41 9.91.302 13.05.088 18.953 5.978 20.637l.043.013v2.93s-.035.567.348.684c.462.14.733-.298 1.175-.773.242-.26.576-.642.828-.926l.026-.03.021-.024c2.237 2.14 5.103 2.804 7.537 2.907h.002c.093.004.184.006.273.006 1.868 0 3.473-.408 4.748-1.164l.028-.016c1.72-1.02 2.868-2.414 3.59-3.586.58-.94.886-1.878 1.052-2.682.18-.871.2-1.558.192-1.942l-.001-.057C24.242 6.743 18.303.259 12.094.014c-.234-.01-.468-.014-.696-.012zM11.4 1.466c.2-.002.401.002.607.01 5.455.213 10.628 5.977 10.625 14.38.003.258.003.886-.156 1.654-.14.68-.4 1.476-.893 2.275-.63 1.023-1.634 2.243-3.146 3.14-1.098.65-2.506 1.024-4.147 1.024-.081 0-.163-.002-.247-.005-2.108-.09-4.727-.648-6.8-2.67l-.076-.073-.081-.088.042.047.01.011c.018.02.017.015.001-.012a1.64 1.64 0 00-.076-.093c-.234-.276-.556-.64-.787-.891-.173-.19-.323-.339-.443-.417-.093-.06-.116-.04-.085-.049l.016-.005-.258-.082C3.154 18.4 1.77 13.443 1.873 9.95c.1-2.888.81-5.193 2.288-6.66C6.137 1.388 9.702 1.07 11.4 1.466zM11.93 4.19c-.11 0-.155.08-.14.18a.326.326 0 00.07.147c.48.498.876 1.054 1.205 1.652a6.818 6.818 0 01.699 1.902c.07.313.115.638.14.963l.001.02c.004.03.016.064.046.089a.129.129 0 00.088.027h.006c.064-.005.098-.059.1-.107a7.395 7.395 0 00-.14-1.13 7.498 7.498 0 00-.76-2.04 8.11 8.11 0 00-1.256-1.665.196.196 0 00-.06-.037zm-3.78.67a.93.93 0 00-.457.128c-.332.185-.633.42-.888.699l-.012.013-.007.008a1.872 1.872 0 00-.48.872c-.105.47-.012.986.194 1.537l.004.012.006.011c.614 1.437 1.437 2.772 2.444 3.956a14.71 14.71 0 003.57 3.244c.757.492 1.553.916 2.38 1.267l.013.006h.001c.35.145.702.221 1.033.221.402 0 .773-.119 1.063-.369l.01-.009.01-.008c.253-.232.468-.501.635-.799.192-.355.096-.744-.195-.965a10.4 10.4 0 00-1.713-1.076l-.01-.005c-.321-.17-.7-.138-1 .094l-.534.44a.506.506 0 01-.565.06l-.024-.014a10.89 10.89 0 01-2.087-1.51 10.696 10.696 0 01-1.596-1.881l-.02-.032a.504.504 0 01.009-.55l.388-.555c.206-.298.24-.67.073-.992l-.006-.012a10.73 10.73 0 00-.968-1.587c-.13-.16-.31-.25-.487-.259h-.001a.75.75 0 00-.135-.024c-.028-.002-.055-.003-.082-.003v.001l-.102-.002h-.015zm5.42.51c-.079-.007-.135.06-.128.131.03.245.039.493.025.74a4.165 4.165 0 01-.287 1.332c-.09.222-.2.437-.332.634l-.003.008c-.034.053-.01.118.04.15.017.01.034.016.05.016a.1.1 0 00.078-.035c.286-.377.51-.795.67-1.24.168-.48.255-.987.258-1.497l.001-.019a.098.098 0 00-.031-.093c-.017-.012-.035-.019-.055-.022l-.005-.001-.016-.003h-.001a.265.265 0 00-.038-.003h-.006l-.007-.001a.236.236 0 00-.017-.001l-.006-.001h-.02l-.008-.002h-.008l-.016-.002a.284.284 0 00-.038-.002h-.011l-.008-.001h-.028zm-1.43.317c-.11 0-.156.104-.128.195.1.31.223.61.372.895.217.42.491.81.814 1.153l.017.018c.02.02.04.027.06.027a.088.088 0 00.073-.038.097.097 0 00-.005-.119 5.629 5.629 0 01-.77-1.072 5.1 5.1 0 01-.344-.864.16.16 0 00-.055-.1.1.1 0 00-.034-.023l-.016-.005c-.006-.002-.012-.002-.019-.002v-.065z" />
            </svg>
          </a>
        </div>
      )}

      {/* Main toggle FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-neutral-700 hover:bg-neutral-800 rotate-45'
            : 'bg-[#25D366] hover:bg-[#20BD5A]'
        }`}
        aria-label={t('floatingContact.toggleLabel', 'Contact us via messaging apps')}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FloatingContactButtons;
