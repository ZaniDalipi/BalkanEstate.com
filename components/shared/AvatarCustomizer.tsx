import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '../../constants';

// ─── DiceBear Avataaars customization options ────────────────────────────────

const SKIN_COLORS = [
  { value: 'f8d5c0', label: 'Light' },
  { value: 'edb98a', label: 'Light tan' },
  { value: 'd08b5b', label: 'Tan' },
  { value: 'ae5d29', label: 'Brown' },
  { value: '614335', label: 'Dark' },
  { value: 'ffdbb4', label: 'Peach' },
];

const HAIR_COLORS = [
  { value: '2c1b18', label: 'Black' },
  { value: '4a312c', label: 'Dark Brown' },
  { value: '724133', label: 'Brown' },
  { value: 'a55728', label: 'Auburn' },
  { value: 'b58143', label: 'Honey' },
  { value: 'd6b370', label: 'Blonde' },
  { value: 'e8e1e1', label: 'Gray' },
  { value: 'c93305', label: 'Red' },
];

const HAIR_STYLES_MALE = [
  { value: 'shortFlat', label: 'Short Flat' },
  { value: 'shortRound', label: 'Short Round' },
  { value: 'shortWaved', label: 'Short Wavy' },
  { value: 'shortCurly', label: 'Short Curly' },
  { value: 'theCaesar', label: 'Caesar' },
  { value: 'theCaesarAndSidePart', label: 'Caesar Side Part' },
  { value: 'sides', label: 'Sides' },
  { value: 'dreads01', label: 'Dreads' },
  { value: 'frizzle', label: 'Frizzle' },
];

const HAIR_STYLES_FEMALE = [
  { value: 'longButNotTooLong', label: 'Long' },
  { value: 'straight01', label: 'Straight' },
  { value: 'straight02', label: 'Straight 2' },
  { value: 'bob', label: 'Bob' },
  { value: 'bun', label: 'Bun' },
  { value: 'curly', label: 'Curly' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'bigHair', label: 'Big Hair' },
  { value: 'miaWallace', label: 'Sleek' },
  { value: 'straightAndStrand', label: 'With Strand' },
  { value: 'fro', label: 'Afro' },
];

const CLOTHING = [
  { value: 'blazerAndShirt', label: 'Blazer & Shirt' },
  { value: 'blazerAndSweater', label: 'Blazer & Sweater' },
  { value: 'collarAndSweater', label: 'Collar & Sweater' },
  { value: 'shirtCrewNeck', label: 'Crew Neck' },
  { value: 'shirtVNeck', label: 'V-Neck' },
  { value: 'shirtScoopNeck', label: 'Scoop Neck' },
];

const CLOTHES_COLORS = [
  { value: '262e33', label: 'Dark' },
  { value: '3c4f5c', label: 'Navy' },
  { value: '25557c', label: 'Blue' },
  { value: '65c9ff', label: 'Light Blue' },
  { value: '929598', label: 'Gray' },
  { value: 'e6e6e6', label: 'Light Gray' },
  { value: '5199e4', label: 'Bright Blue' },
  { value: 'ff5c5c', label: 'Red' },
];

const ACCESSORIES = [
  { value: '', label: 'None' },
  { value: 'prescription01', label: 'Glasses 1' },
  { value: 'prescription02', label: 'Glasses 2' },
  { value: 'round', label: 'Round Glasses' },
  { value: 'wayfarers', label: 'Wayfarers' },
  { value: 'sunglasses', label: 'Sunglasses' },
];

const FACIAL_HAIR = [
  { value: '', label: 'None' },
  { value: 'beardLight', label: 'Light Beard' },
  { value: 'beardMedium', label: 'Medium Beard' },
  { value: 'beardMajestic', label: 'Full Beard' },
  { value: 'moustacheFancy', label: 'Fancy Mustache' },
  { value: 'moustacheMagnum', label: 'Magnum Mustache' },
];

const EYES = [
  { value: 'default', label: 'Default' },
  { value: 'happy', label: 'Happy' },
  { value: 'wink', label: 'Wink' },
  { value: 'squint', label: 'Squint' },
  { value: 'side', label: 'Side' },
  { value: 'surprised', label: 'Surprised' },
];

const MOUTHS = [
  { value: 'smile', label: 'Smile' },
  { value: 'twinkle', label: 'Twinkle' },
  { value: 'default', label: 'Default' },
  { value: 'serious', label: 'Serious' },
  { value: 'grimace', label: 'Grimace' },
  { value: 'eating', label: 'Smirk' },
];

const EYEBROWS = [
  { value: 'defaultNatural', label: 'Default' },
  { value: 'flatNatural', label: 'Flat' },
  { value: 'raisedExcitedNatural', label: 'Excited' },
  { value: 'upDownNatural', label: 'Quirky' },
  { value: 'frownNatural', label: 'Frown' },
  { value: 'angryNatural', label: 'Intense' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AvatarOptions {
  skinColor: string;
  hairColor: string;
  top: string;
  clothing: string;
  clothesColor: string;
  accessories: string;
  facialHair: string;
  eyes: string;
  mouth: string;
  eyebrows: string;
}

export function buildAvatarUrl(options: AvatarOptions): string {
  const params = new URLSearchParams();
  params.set('skinColor', options.skinColor);
  params.set('hairColor', options.hairColor);
  params.set('top', options.top);
  params.set('clothing', options.clothing);
  params.set('clothesColor', options.clothesColor);
  if (options.accessories) params.set('accessories', options.accessories);
  params.set('accessoriesProbability', options.accessories ? '100' : '0');
  if (options.facialHair) params.set('facialHair', options.facialHair);
  params.set('facialHairProbability', options.facialHair ? '100' : '0');
  params.set('eyes', options.eyes);
  params.set('mouth', options.mouth);
  params.set('eyebrows', options.eyebrows);
  params.set('backgroundColor', 'b6e3f4');
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export function getDefaultAvatarOptions(gender?: 'male' | 'female' | 'other'): AvatarOptions {
  const isFemale = gender === 'female';
  return {
    skinColor: 'f8d5c0',
    hairColor: '4a312c',
    top: isFemale ? 'longButNotTooLong' : 'shortFlat',
    clothing: 'blazerAndShirt',
    clothesColor: '3c4f5c',
    accessories: '',
    facialHair: '',
    eyes: 'default',
    mouth: 'smile',
    eyebrows: 'defaultNatural',
  };
}

export function avatarOptionsToSeed(options: AvatarOptions): string {
  return JSON.stringify(options);
}

export function parseAvatarOptions(json: string | undefined): AvatarOptions | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && parsed.skinColor) return parsed as AvatarOptions;
    return null;
  } catch {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AvatarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  gender?: 'male' | 'female' | 'other';
  currentAvatarOptions?: AvatarOptions | null;
  currentAvatarUrl?: string;
  onSaveAvatar: (options: AvatarOptions) => void;
  onUploadPhoto: (file: File) => void;
  isUploading?: boolean;
}

type TabType = 'create' | 'upload';

const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  isOpen,
  onClose,
  gender,
  currentAvatarOptions,
  currentAvatarUrl,
  onSaveAvatar,
  onUploadPhoto,
  isUploading = false,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [options, setOptions] = useState<AvatarOptions>(
    currentAvatarOptions || getDefaultAvatarOptions(gender)
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isFemale = gender === 'female';
  const hairStyles = isFemale ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE;

  const previewUrl = useMemo(() => buildAvatarUrl(options), [options]);

  const updateOption = useCallback(<K extends keyof AvatarOptions>(key: K, value: AvatarOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRandomize = useCallback(() => {
    const pick = <T,>(arr: { value: T }[]): T => arr[Math.floor(Math.random() * arr.length)].value;
    setOptions({
      skinColor: pick(SKIN_COLORS),
      hairColor: pick(HAIR_COLORS),
      top: pick(hairStyles),
      clothing: pick(CLOTHING),
      clothesColor: pick(CLOTHES_COLORS),
      accessories: Math.random() > 0.5 ? pick(ACCESSORIES.filter(a => a.value)) : '',
      facialHair: !isFemale && Math.random() > 0.6 ? pick(FACIAL_HAIR.filter(f => f.value)) : '',
      eyes: pick(EYES),
      mouth: pick(MOUTHS),
      eyebrows: pick(EYEBROWS),
    });
  }, [hairStyles, isFemale]);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError(t('errors.selectImage', 'Please select an image file'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('errors.imageTooLarge', 'Image must be less than 5MB'));
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {t('profile.customizeAvatar', 'Customize Your Avatar')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'create'
                ? 'text-primary'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t('profile.createAvatar', 'Create Avatar')}
            {activeTab === 'create' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'upload'
                ? 'text-primary'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t('profile.uploadPhoto', 'Upload Photo')}
            {activeTab === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-neutral-200 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="w-full h-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  {t('profile.randomize', 'Randomize')}
                </button>
              </div>

              {/* Skin Color */}
              <OptionSection label={t('profile.skinColor', 'Skin Color')}>
                <ColorPicker
                  colors={SKIN_COLORS}
                  selected={options.skinColor}
                  onSelect={(v) => updateOption('skinColor', v)}
                />
              </OptionSection>

              {/* Hair Style */}
              <OptionSection label={t('profile.hairStyle', 'Hair Style')}>
                <PillPicker
                  items={hairStyles}
                  selected={options.top}
                  onSelect={(v) => updateOption('top', v)}
                />
              </OptionSection>

              {/* Hair Color */}
              <OptionSection label={t('profile.hairColor', 'Hair Color')}>
                <ColorPicker
                  colors={HAIR_COLORS}
                  selected={options.hairColor}
                  onSelect={(v) => updateOption('hairColor', v)}
                />
              </OptionSection>

              {/* Clothing */}
              <OptionSection label={t('profile.clothing', 'Clothing')}>
                <PillPicker
                  items={CLOTHING}
                  selected={options.clothing}
                  onSelect={(v) => updateOption('clothing', v)}
                />
              </OptionSection>

              {/* Clothes Color */}
              <OptionSection label={t('profile.clothesColor', 'Clothes Color')}>
                <ColorPicker
                  colors={CLOTHES_COLORS}
                  selected={options.clothesColor}
                  onSelect={(v) => updateOption('clothesColor', v)}
                />
              </OptionSection>

              {/* Accessories */}
              <OptionSection label={t('profile.accessories', 'Glasses')}>
                <PillPicker
                  items={ACCESSORIES}
                  selected={options.accessories}
                  onSelect={(v) => updateOption('accessories', v)}
                />
              </OptionSection>

              {/* Facial Hair (male only) */}
              {!isFemale && (
                <OptionSection label={t('profile.facialHair', 'Facial Hair')}>
                  <PillPicker
                    items={FACIAL_HAIR}
                    selected={options.facialHair}
                    onSelect={(v) => updateOption('facialHair', v)}
                  />
                </OptionSection>
              )}

              {/* Eyes */}
              <OptionSection label={t('profile.eyes', 'Eyes')}>
                <PillPicker
                  items={EYES}
                  selected={options.eyes}
                  onSelect={(v) => updateOption('eyes', v)}
                />
              </OptionSection>

              {/* Eyebrows */}
              <OptionSection label={t('profile.eyebrows', 'Eyebrows')}>
                <PillPicker
                  items={EYEBROWS}
                  selected={options.eyebrows}
                  onSelect={(v) => updateOption('eyebrows', v)}
                />
              </OptionSection>

              {/* Mouth */}
              <OptionSection label={t('profile.mouth', 'Mouth')}>
                <PillPicker
                  items={MOUTHS}
                  selected={options.mouth}
                  onSelect={(v) => updateOption('mouth', v)}
                />
              </OptionSection>
            </div>
          ) : (
            /* Upload Photo Tab */
            <div className="space-y-6">
              {/* Current photo preview */}
              {(uploadPreview || currentAvatarUrl) && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-neutral-200 shadow-lg">
                    <img
                      src={uploadPreview || currentAvatarUrl}
                      alt="Photo preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {uploadPreview && (
                    <p className="text-sm text-green-600 font-medium">
                      {t('profile.readyToUpload', 'Ready to upload')}
                    </p>
                  )}
                </div>
              )}

              {/* Drag & Drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-300 hover:border-primary/50 hover:bg-neutral-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      {t('profile.dragDropPhoto', 'Drag & drop your photo here, or')}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                    >
                      {t('profile.browseFiles', 'browse files')}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {t('profile.imageRequirements', 'JPG, PNG or WebP. Max 5MB.')}
                  </p>
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-red-500 text-center">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          {activeTab === 'create' ? (
            <button
              type="button"
              onClick={() => {
                onSaveAvatar(options);
                onClose();
              }}
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
            >
              {t('profile.saveAvatar', 'Save Avatar')}
            </button>
          ) : (
            <button
              type="button"
              disabled={!uploadFile || isUploading}
              onClick={() => {
                if (uploadFile) {
                  onUploadPhoto(uploadFile);
                  onClose();
                }
              }}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${
                !uploadFile || isUploading
                  ? 'bg-neutral-300 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {isUploading
                ? t('profile.uploading', 'Uploading...')
                : t('profile.uploadAndSave', 'Upload & Save')
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const OptionSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
      {label}
    </label>
    {children}
  </div>
);

const ColorPicker: React.FC<{
  colors: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}> = ({ colors, selected, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    {colors.map((c) => (
      <button
        key={c.value}
        type="button"
        title={c.label}
        onClick={() => onSelect(c.value)}
        className={`w-9 h-9 rounded-full border-2 transition-all ${
          selected === c.value
            ? 'border-primary scale-110 shadow-md'
            : 'border-transparent hover:border-neutral-300 hover:scale-105'
        }`}
        style={{ backgroundColor: `#${c.value}` }}
      />
    ))}
  </div>
);

const PillPicker: React.FC<{
  items: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}> = ({ items, selected, onSelect }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onSelect(item.value)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
          selected === item.value
            ? 'bg-primary text-white border-primary shadow-sm'
            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export default AvatarCustomizer;
