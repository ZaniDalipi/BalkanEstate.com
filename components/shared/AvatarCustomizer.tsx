import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '../../constants';
import { convertToUploadableImage, isHeicFile } from '@/shared/utils/imageConversion';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import ConfirmationModal from '../../src/shared/components/ui/ConfirmationModal';

// ─── DiceBear Avataaars customization options ────────────────────────────────

const SKIN_COLORS = [
  { value: 'f8d5c0', labelKey: 'account:avatar.skinColors.light' },
  { value: 'edb98a', labelKey: 'account:avatar.skinColors.lightTan' },
  { value: 'd08b5b', labelKey: 'account:avatar.skinColors.tan' },
  { value: 'ae5d29', labelKey: 'account:avatar.skinColors.brown' },
  { value: '614335', labelKey: 'account:avatar.skinColors.dark' },
  { value: 'ffdbb4', labelKey: 'account:avatar.skinColors.peach' },
];

const HAIR_COLORS = [
  { value: '2c1b18', labelKey: 'account:avatar.hairColors.black' },
  { value: '4a312c', labelKey: 'account:avatar.hairColors.darkBrown' },
  { value: '724133', labelKey: 'account:avatar.hairColors.brown' },
  { value: 'a55728', labelKey: 'account:avatar.hairColors.auburn' },
  { value: 'b58143', labelKey: 'account:avatar.hairColors.honey' },
  { value: 'd6b370', labelKey: 'account:avatar.hairColors.blonde' },
  { value: 'e8e1e1', labelKey: 'account:avatar.hairColors.gray' },
  { value: 'c93305', labelKey: 'account:avatar.hairColors.red' },
];

const HAIR_STYLES_MALE = [
  { value: 'shortFlat', labelKey: 'account:avatar.hairStyles.shortFlat' },
  { value: 'shortRound', labelKey: 'account:avatar.hairStyles.shortRound' },
  { value: 'shortWaved', labelKey: 'account:avatar.hairStyles.shortWavy' },
  { value: 'shortCurly', labelKey: 'account:avatar.hairStyles.shortCurly' },
  { value: 'theCaesar', labelKey: 'account:avatar.hairStyles.caesar' },
  { value: 'theCaesarAndSidePart', labelKey: 'account:avatar.hairStyles.caesarSidePart' },
  { value: 'sides', labelKey: 'account:avatar.hairStyles.sides' },
  { value: 'dreads01', labelKey: 'account:avatar.hairStyles.dreads' },
  { value: 'frizzle', labelKey: 'account:avatar.hairStyles.frizzle' },
];

const HAIR_STYLES_FEMALE = [
  { value: 'longButNotTooLong', labelKey: 'account:avatar.hairStyles.long' },
  { value: 'straight01', labelKey: 'account:avatar.hairStyles.straight' },
  { value: 'straight02', labelKey: 'account:avatar.hairStyles.straight2' },
  { value: 'bob', labelKey: 'account:avatar.hairStyles.bob' },
  { value: 'bun', labelKey: 'account:avatar.hairStyles.bun' },
  { value: 'curly', labelKey: 'account:avatar.hairStyles.curly' },
  { value: 'curvy', labelKey: 'account:avatar.hairStyles.curvy' },
  { value: 'bigHair', labelKey: 'account:avatar.hairStyles.bigHair' },
  { value: 'miaWallace', labelKey: 'account:avatar.hairStyles.sleek' },
  { value: 'straightAndStrand', labelKey: 'account:avatar.hairStyles.withStrand' },
  { value: 'fro', labelKey: 'account:avatar.hairStyles.afro' },
];

const CLOTHING = [
  { value: 'blazerAndShirt', labelKey: 'account:avatar.clothing.suitAndShirt' },
  { value: 'blazerAndSweater', labelKey: 'account:avatar.clothing.blazerAndSweater' },
  { value: 'collarAndSweater', labelKey: 'account:avatar.clothing.collarAndSweater' },
  { value: 'shirtCrewNeck', labelKey: 'account:avatar.clothing.crewNeck' },
  { value: 'shirtVNeck', labelKey: 'account:avatar.clothing.vNeck' },
  { value: 'shirtScoopNeck', labelKey: 'account:avatar.clothing.scoopNeck' },
];

const CLOTHES_COLORS = [
  { value: '1a1a2e', labelKey: 'account:avatar.clothesColors.black' },
  { value: '2d2d2d', labelKey: 'account:avatar.clothesColors.charcoal' },
  { value: '262e33', labelKey: 'account:avatar.clothesColors.dark' },
  { value: '3c4f5c', labelKey: 'account:avatar.clothesColors.navy' },
  { value: '25557c', labelKey: 'account:avatar.clothesColors.blue' },
  { value: '4a3728', labelKey: 'account:avatar.clothesColors.brown' },
  { value: '2e3d30', labelKey: 'account:avatar.clothesColors.forest' },
  { value: '5c2a3a', labelKey: 'account:avatar.clothesColors.burgundy' },
  { value: '929598', labelKey: 'account:avatar.clothesColors.gray' },
  { value: 'e6e6e6', labelKey: 'account:avatar.clothesColors.lightGray' },
  { value: '65c9ff', labelKey: 'account:avatar.clothesColors.lightBlue' },
  { value: '5199e4', labelKey: 'account:avatar.clothesColors.brightBlue' },
];

const ACCESSORIES = [
  { value: '', labelKey: 'account:avatar.accessories.none' },
  { value: 'prescription01', labelKey: 'account:avatar.accessories.glasses1' },
  { value: 'prescription02', labelKey: 'account:avatar.accessories.glasses2' },
  { value: 'round', labelKey: 'account:avatar.accessories.roundGlasses' },
  { value: 'wayfarers', labelKey: 'account:avatar.accessories.wayfarers' },
  { value: 'sunglasses', labelKey: 'account:avatar.accessories.sunglasses' },
];

const FACIAL_HAIR = [
  { value: '', labelKey: 'account:avatar.facialHair.none' },
  { value: 'beardLight', labelKey: 'account:avatar.facialHair.lightBeard' },
  { value: 'beardMedium', labelKey: 'account:avatar.facialHair.mediumBeard' },
  { value: 'beardMajestic', labelKey: 'account:avatar.facialHair.fullBeard' },
  { value: 'moustacheFancy', labelKey: 'account:avatar.facialHair.fancyMustache' },
  { value: 'moustacheMagnum', labelKey: 'account:avatar.facialHair.magnumMustache' },
];

const FACIAL_HAIR_COLORS = [
  { value: '2c1b18', labelKey: 'account:avatar.facialHairColors.black' },
  { value: '4a312c', labelKey: 'account:avatar.facialHairColors.darkBrown' },
  { value: '724133', labelKey: 'account:avatar.facialHairColors.brown' },
  { value: 'a55728', labelKey: 'account:avatar.facialHairColors.auburn' },
  { value: 'b58143', labelKey: 'account:avatar.facialHairColors.honey' },
  { value: 'd6b370', labelKey: 'account:avatar.facialHairColors.blonde' },
  { value: 'e8e1e1', labelKey: 'account:avatar.facialHairColors.gray' },
  { value: 'c93305', labelKey: 'account:avatar.facialHairColors.red' },
];

const EYES = [
  { value: 'default', labelKey: 'account:avatar.eyes.default' },
  { value: 'happy', labelKey: 'account:avatar.eyes.happy' },
  { value: 'wink', labelKey: 'account:avatar.eyes.wink' },
  { value: 'squint', labelKey: 'account:avatar.eyes.squint' },
  { value: 'side', labelKey: 'account:avatar.eyes.side' },
  { value: 'surprised', labelKey: 'account:avatar.eyes.surprised' },
];

const MOUTHS = [
  { value: 'smile', labelKey: 'account:avatar.mouths.smile' },
  { value: 'twinkle', labelKey: 'account:avatar.mouths.twinkle' },
  { value: 'default', labelKey: 'account:avatar.mouths.default' },
  { value: 'serious', labelKey: 'account:avatar.mouths.serious' },
  { value: 'grimace', labelKey: 'account:avatar.mouths.grimace' },
  { value: 'eating', labelKey: 'account:avatar.mouths.smirk' },
];

const EYEBROWS = [
  { value: 'defaultNatural', labelKey: 'account:avatar.eyebrows.default' },
  { value: 'flatNatural', labelKey: 'account:avatar.eyebrows.flat' },
  { value: 'raisedExcitedNatural', labelKey: 'account:avatar.eyebrows.excited' },
  { value: 'upDownNatural', labelKey: 'account:avatar.eyebrows.quirky' },
  { value: 'frownNatural', labelKey: 'account:avatar.eyebrows.frown' },
  { value: 'angryNatural', labelKey: 'account:avatar.eyebrows.intense' },
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
  facialHairColor: string;
  eyes: string;
  mouth: string;
  eyebrows: string;
}

export function buildAvatarUrl(options: AvatarOptions): string {
  const avatar = createAvatar(avataaars, {
    skinColor: [options.skinColor],
    hairColor: [options.hairColor],
    top: [options.top as any],
    clothing: [options.clothing as any],
    clothesColor: [options.clothesColor],
    accessories: options.accessories ? [options.accessories as any] : [],
    accessoriesProbability: options.accessories ? 100 : 0,
    facialHair: options.facialHair ? [options.facialHair as any] : [],
    facialHairProbability: options.facialHair ? 100 : 0,
    facialHairColor: options.facialHairColor ? [options.facialHairColor] : [],
    eyes: [options.eyes as any],
    mouth: [options.mouth as any],
    eyebrows: [options.eyebrows as any],
    backgroundColor: ['b6e3f4'],
  });
  return avatar.toDataUri();
}

export function getDefaultAvatarOptions(gender?: 'male' | 'female' | 'other'): AvatarOptions {
  const isFemale = gender === 'female';
  return {
    skinColor: 'f8d5c0',
    hairColor: '4a312c',
    top: isFemale ? 'longButNotTooLong' : 'shortFlat',
    clothing: 'blazerAndShirt',
    clothesColor: '1a1a2e',
    accessories: '',
    facialHair: '',
    facialHairColor: '2c1b18',
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
  const { t } = useTranslation(['account', 'common']);
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [options, setOptions] = useState<AvatarOptions>(
    currentAvatarOptions || getDefaultAvatarOptions(gender)
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isFemale = gender === 'female';
  const hairStyles = isFemale ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE;

  // Resolve labels for arrays using t()
  const resolveLabels = useCallback(
    (items: { value: string; labelKey: string }[]) =>
      items.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t]
  );

  const skinColors = useMemo(() => resolveLabels(SKIN_COLORS), [resolveLabels]);
  const hairColors = useMemo(() => resolveLabels(HAIR_COLORS), [resolveLabels]);
  const resolvedHairStyles = useMemo(() => resolveLabels(hairStyles), [resolveLabels, hairStyles]);
  const clothing = useMemo(() => resolveLabels(CLOTHING), [resolveLabels]);
  const clothesColors = useMemo(() => resolveLabels(CLOTHES_COLORS), [resolveLabels]);
  const accessories = useMemo(() => resolveLabels(ACCESSORIES), [resolveLabels]);
  const facialHair = useMemo(() => resolveLabels(FACIAL_HAIR), [resolveLabels]);
  const facialHairColors = useMemo(() => resolveLabels(FACIAL_HAIR_COLORS), [resolveLabels]);
  const eyes = useMemo(() => resolveLabels(EYES), [resolveLabels]);
  const mouths = useMemo(() => resolveLabels(MOUTHS), [resolveLabels]);
  const eyebrows = useMemo(() => resolveLabels(EYEBROWS), [resolveLabels]);

  // When gender or currentAvatarOptions change, update internal options state
  useEffect(() => {
    if (currentAvatarOptions) {
      // Adapt existing options for the new gender
      const validHairs = hairStyles.map(h => h.value);
      const needsHairSwap = !validHairs.includes(currentAvatarOptions.top);
      setOptions({
        ...currentAvatarOptions,
        top: needsHairSwap ? getDefaultAvatarOptions(gender).top : currentAvatarOptions.top,
        facialHair: isFemale ? '' : currentAvatarOptions.facialHair,
      });
    } else {
      setOptions(getDefaultAvatarOptions(gender));
    }
  }, [gender, currentAvatarOptions, hairStyles, isFemale]);

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
      facialHairColor: pick(FACIAL_HAIR_COLORS),
      eyes: pick(EYES),
      mouth: pick(MOUTHS),
      eyebrows: pick(EYEBROWS),
    });
  }, [hairStyles, isFemale]);

  const handleFileSelect = useCallback(async (selected: File) => {
    setUploadError('');
    if (!selected.type.startsWith('image/') && !isHeicFile(selected)) {
      setUploadError(t('account:errors.selectImage'));
      return;
    }
    // Convert HEIC/HEIF (iPhone photos) to JPEG so the avatar previews and uploads correctly.
    const file = await convertToUploadableImage(selected);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('account:errors.imageTooLarge'));
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

  const hasUnsavedChanges = activeTab === 'create' || uploadFile !== null;

  const requestClose = () => {
    if (isUploading) return;
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Confirmation modal for unsaved changes */}
      <ConfirmationModal
        isOpen={showCloseConfirmation}
        onClose={() => setShowCloseConfirmation(false)}
        onConfirm={() => { setShowCloseConfirmation(false); onClose(); }}
        title="Discard Changes?"
        message="You have unsaved avatar changes. Are you sure you want to close?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        type="danger"
        cancelPrimary
      />
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={requestClose} />

      {/* Modal - Liquid Glass */}
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl shadow-[0_8px_64px_rgba(0,0,0,0.18)] border border-white/40 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ring-1 ring-white/20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/30 bg-white/20">
          <h2 className="text-lg font-semibold text-neutral-800">
            {t('account:avatar.customizeYourAvatar')}
          </h2>
          <button
            onClick={requestClose}
            className="p-1.5 rounded-full hover:bg-white/40 backdrop-blur-sm transition-all"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/30 bg-white/10">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'create'
                ? 'text-primary bg-white/20'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/10'
            }`}
          >
            {t('account:avatar.createAvatar')}
            {activeTab === 'create' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'upload'
                ? 'text-primary bg-white/20'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/10'
            }`}
          >
            {t('account:avatar.uploadPhoto')}
            {activeTab === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Preview - 3D styled */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-36 h-36 group">
                  {/* Depth shadow */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-b from-neutral-300/60 to-neutral-400/40 blur-xl translate-y-3" />
                  {/* Avatar container with 3D effects */}
                  <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_-2px_6px_rgba(0,0,0,0.1)] bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
                    <img
                      src={previewUrl}
                      alt={t('account:avatar.avatarPreviewAlt')}
                      className="w-full h-full"
                    />
                    {/* Glossy highlight overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary bg-white/50 backdrop-blur-sm rounded-xl hover:bg-white/70 transition-all border border-white/40 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  {t('account:avatar.randomize')}
                </button>
              </div>

              {/* Skin Color */}
              <OptionSection label={t('account:avatar.sections.skinColor')}>
                <ColorPicker
                  colors={skinColors}
                  selected={options.skinColor}
                  onSelect={(v) => updateOption('skinColor', v)}
                />
              </OptionSection>

              {/* Hair Style */}
              <OptionSection label={t('account:avatar.sections.hairStyle')}>
                <PillPicker
                  items={resolvedHairStyles}
                  selected={options.top}
                  onSelect={(v) => updateOption('top', v)}
                />
              </OptionSection>

              {/* Hair Color */}
              <OptionSection label={t('account:avatar.sections.hairColor')}>
                <ColorPicker
                  colors={hairColors}
                  selected={options.hairColor}
                  onSelect={(v) => updateOption('hairColor', v)}
                />
              </OptionSection>

              {/* Clothing */}
              <OptionSection label={t('account:avatar.sections.clothing')}>
                <PillPicker
                  items={clothing}
                  selected={options.clothing}
                  onSelect={(v) => updateOption('clothing', v)}
                />
              </OptionSection>

              {/* Clothes Color */}
              <OptionSection label={t('account:avatar.sections.clothesColor')}>
                <ColorPicker
                  colors={clothesColors}
                  selected={options.clothesColor}
                  onSelect={(v) => updateOption('clothesColor', v)}
                />
              </OptionSection>

              {/* Accessories */}
              <OptionSection label={t('account:avatar.sections.glasses')}>
                <PillPicker
                  items={accessories}
                  selected={options.accessories}
                  onSelect={(v) => updateOption('accessories', v)}
                />
              </OptionSection>

              {/* Facial Hair (male only) */}
              {!isFemale && (
                <>
                  <OptionSection label={t('account:avatar.sections.facialHair')}>
                    <PillPicker
                      items={facialHair}
                      selected={options.facialHair}
                      onSelect={(v) => updateOption('facialHair', v)}
                    />
                  </OptionSection>
                  {options.facialHair && (
                    <OptionSection label={t('account:avatar.sections.beardColor')}>
                      <ColorPicker
                        colors={facialHairColors}
                        selected={options.facialHairColor}
                        onSelect={(v) => updateOption('facialHairColor', v)}
                      />
                    </OptionSection>
                  )}
                </>
              )}

              {/* Eyes */}
              <OptionSection label={t('account:avatar.sections.eyes')}>
                <PillPicker
                  items={eyes}
                  selected={options.eyes}
                  onSelect={(v) => updateOption('eyes', v)}
                />
              </OptionSection>

              {/* Eyebrows */}
              <OptionSection label={t('account:avatar.sections.eyebrows')}>
                <PillPicker
                  items={eyebrows}
                  selected={options.eyebrows}
                  onSelect={(v) => updateOption('eyebrows', v)}
                />
              </OptionSection>

              {/* Mouth */}
              <OptionSection label={t('account:avatar.sections.mouth')}>
                <PillPicker
                  items={mouths}
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
                      alt={t('account:avatar.photoPreviewAlt')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {uploadPreview && (
                    <p className="text-sm text-green-600 font-medium">
                      {t('account:avatar.readyToUpload')}
                    </p>
                  )}
                </div>
              )}

              {/* Drag & Drop zone */}
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all backdrop-blur-sm ${
                  dragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-white/60 bg-white/20 hover:border-primary/40 hover:bg-white/30'
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
                      {t('account:avatar.dragDropPhoto')}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                    >
                      {t('account:avatar.browseFiles')}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {t('account:avatar.imageRequirements')}
                  </p>
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-red-500 text-center">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer - Glass */}
        <div className="px-6 py-4 border-t border-white/30 bg-white/20 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white/50 backdrop-blur-sm rounded-xl hover:bg-white/70 transition-all border border-white/40"
          >
            {t('common:cancel')}
          </button>
          {activeTab === 'create' ? (
            <button
              type="button"
              onClick={() => {
                onSaveAvatar(options);
                onClose();
              }}
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary/80 backdrop-blur-sm rounded-xl hover:bg-primary transition-all shadow-lg shadow-primary/20 border border-primary/30"
            >
              {t('account:avatar.saveAvatar')}
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
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl shadow-lg transition-all backdrop-blur-sm border ${
                !uploadFile || isUploading
                  ? 'bg-neutral-300/60 cursor-not-allowed border-neutral-200/40'
                  : 'bg-primary/80 hover:bg-primary shadow-primary/20 border-primary/30'
              }`}
            >
              {isUploading
                ? t('account:avatar.uploading')
                : t('account:avatar.uploadAndSave')
              }
            </button>
          )}
        </div>
      </div>
    </div>
    </>,
    document.body
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const OptionSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="bg-white/30 backdrop-blur-sm rounded-2xl p-4 border border-white/40">
    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2.5">
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
        className={`w-9 h-9 rounded-full border-2 transition-all shadow-sm ${
          selected === c.value
            ? 'border-primary scale-110 shadow-md ring-2 ring-primary/30'
            : 'border-white/60 hover:border-white hover:scale-105'
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
        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border backdrop-blur-sm ${
          selected === item.value
            ? 'bg-primary/80 text-white border-primary/40 shadow-md shadow-primary/20'
            : 'bg-white/40 text-neutral-600 border-white/50 hover:border-primary/30 hover:bg-white/60'
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export default AvatarCustomizer;
