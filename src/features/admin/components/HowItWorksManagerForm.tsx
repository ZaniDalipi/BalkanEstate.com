import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
  CloudArrowUpIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@/constants';
import {
  type SiteContent,
  type Step,
  type FAQ,
  type HowItWorksFormData,
  SUBSECTIONS,
  CATEGORIES,
  ICON_OPTIONS,
  convertToYouTubeEmbedUrl,
  isYouTubeUrl,
} from './useHowItWorksManager';

interface ContentTypeOption {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  { id: 'video', label: 'Video Tutorial', icon: PlayCircleIcon },
  { id: 'guide', label: 'Step-by-Step Guide', icon: BookOpenIcon },
  { id: 'faq', label: 'FAQ Section', icon: QuestionMarkCircleIcon },
  { id: 'feature', label: 'Feature Highlight', icon: SparklesIcon },
];

interface HowItWorksManagerFormProps {
  editingItem: SiteContent | null;
  formData: HowItWorksFormData;
  setFormData: React.Dispatch<React.SetStateAction<HowItWorksFormData>>;
  isUploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addStep: () => void;
  updateStep: (index: number, field: keyof Step, value: any) => void;
  removeStep: (index: number) => void;
  moveStep: (index: number, direction: 'up' | 'down') => void;
  addFAQ: () => void;
  updateFAQ: (index: number, field: keyof FAQ, value: any) => void;
  removeFAQ: (index: number) => void;
  addFeature: () => void;
  updateFeature: (index: number, value: string) => void;
  removeFeature: (index: number) => void;
}

const HowItWorksManagerForm: React.FC<HowItWorksManagerFormProps> = ({
  editingItem,
  formData,
  setFormData,
  isUploading,
  uploadProgress,
  fileInputRef,
  onClose,
  onSubmit,
  onFileUpload,
  addStep,
  updateStep,
  removeStep,
  moveStep,
  addFAQ,
  updateFAQ,
  removeFAQ,
  addFeature,
  updateFeature,
  removeFeature,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">
            {editingItem ? t('admin:howItWorks.editContent') : t('admin:howItWorks.addNewContent')}
          </h2>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:howItWorks.contentType')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, contentType: type.id as any }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      formData.contentType === type.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:howItWorks.key')}
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, key: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., getting-started-create-account"
              required
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:howItWorks.titleLabel')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., How to Create an Account"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:howItWorks.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="Brief description of the content"
            />
          </div>

          {/* Subsection & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:howItWorks.section')}
              </label>
              <select
                value={formData.subsection}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, subsection: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SUBSECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:howItWorks.category')}
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Time & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:howItWorks.estimatedTime')}
              </label>
              <input
                type="text"
                value={formData.estimatedTime}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, estimatedTime: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5 mins"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin:howItWorks.difficulty')}
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, difficulty: e.target.value as any }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:howItWorks.displayOrder')}
            </label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={0}
            />
          </div>

          {/* Video Upload - Only for video type */}
          {formData.contentType === 'video' && (
            <>
              {/* Video URL / Embed URL input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube URL or Video URL
                </label>
                <input
                  type="url"
                  value={formData.url === 'placeholder' ? '' : formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  onBlur={(e) => {
                    const converted = convertToYouTubeEmbedUrl(e.target.value);
                    if (converted !== e.target.value) {
                      setFormData((prev) => ({ ...prev, url: converted }));
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (isYouTubeUrl(pasted)) {
                      e.preventDefault();
                      setFormData((prev) => ({ ...prev, url: convertToYouTubeEmbedUrl(pasted) }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste any YouTube link — it will be auto-converted to embed format. Also supports direct video URLs.
                </p>
                {formData.url && formData.url.includes('youtube.com/embed') && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    YouTube video detected — embed URL ready
                  </p>
                )}
              </div>

              {/* Video preview */}
              {formData.url && formData.url !== 'placeholder' && (
                <div className="space-y-2">
                  {isYouTubeUrl(formData.url) ? (
                    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={convertToYouTubeEmbedUrl(formData.url)}
                        title="Video preview"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      src={formData.url}
                      className="w-full aspect-video rounded-lg bg-gray-100"
                      controls
                    />
                  )}
                </div>
              )}

              {/* Or upload a file */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin:howItWorks.video')}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={onFileUpload}
                  className="hidden"
                />
                {formData.url && formData.url !== 'placeholder' && !isYouTubeUrl(formData.url) ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('admin:howItWorks.replaceVideo')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    {isUploading ? (
                      <div className="text-center">
                        <div className="w-32 h-2 bg-gray-200 rounded-full mx-auto mb-2">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {t('admin:howItWorks.uploading', { progress: uploadProgress })}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <CloudArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-gray-600">
                          Or upload a video file
                        </span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Steps Editor - Only for guide type */}
          {formData.contentType === 'guide' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Steps ({formData.steps.length})
                </label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('admin:howItWorks.addStep')}
                </button>
              </div>

              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {step.stepNumber}
                        </span>
                        <span className="font-medium text-gray-700">Step {step.stepNumber}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === formData.steps.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Step title"
                      />
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                        placeholder="Step description"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={step.icon || 'check'}
                          onChange={(e) => updateStep(index, 'icon', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon.id} value={icon.id}>
                              {icon.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={step.duration || ''}
                          onChange={(e) => updateStep(index, 'duration', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Duration (e.g., 2 mins)"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {formData.steps.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('admin:howItWorks.noStepsAdded')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FAQ Editor - Only for faq type */}
          {formData.contentType === 'faq' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  FAQs ({formData.faqs.length})
                </label>
                <button
                  type="button"
                  onClick={addFAQ}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('admin:howItWorks.addFaq')}
                </button>
              </div>

              <div className="space-y-4">
                {formData.faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700">Question {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeFAQ(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Question"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                        placeholder="Answer"
                      />
                    </div>
                  </div>
                ))}

                {formData.faqs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <QuestionMarkCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('admin:howItWorks.noFaqsAdded')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Editor - Only for feature type */}
          {formData.contentType === 'feature' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Features ({formData.features.length})
                </label>
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t('admin:howItWorks.addFeature')}
                </button>
              </div>

              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Feature description"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {formData.features.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{t('admin:howItWorks.noFeaturesAdded')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('common:cancel')}
            </button>
            <button
              type="submit"
              disabled={
                !formData.key ||
                !formData.title ||
                (formData.contentType === 'video' && !formData.url) ||
                (formData.contentType === 'guide' && formData.steps.length === 0) ||
                (formData.contentType === 'faq' && formData.faqs.length === 0)
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingItem ? t('common:saveChanges') : t('admin:howItWorks.addContent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HowItWorksManagerForm;
