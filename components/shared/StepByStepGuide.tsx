import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  StarIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CloudArrowUpIcon,
  ClockIcon,
  ChevronDownIcon,
  PlayCircleIcon,
  BookOpenIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface Step {
  stepNumber: number;
  title: string;
  description: string;
  icon?: string;
  duration?: string;
  tips?: string[];
}

interface FAQ {
  question: string;
  answer: string;
  order: number;
}

interface GuideContent {
  _id: string;
  key: string;
  contentType: 'video' | 'guide' | 'faq' | 'feature';
  url?: string;
  title: string;
  description?: string;
  category?: string;
  steps?: Step[];
  faqs?: FAQ[];
  features?: string[];
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
}

// Icon mapping
const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.FC<{ className?: string }>> = {
    user: UserIcon,
    building: BuildingOfficeIcon,
    document: DocumentTextIcon,
    'credit-card': CreditCardIcon,
    check: CheckCircleIcon,
    search: MagnifyingGlassIcon,
    home: HomeIcon,
    star: StarIcon,
    bell: BellIcon,
    chat: ChatBubbleLeftRightIcon,
    settings: Cog6ToothIcon,
    upload: CloudArrowUpIcon,
  };
  return icons[iconName] || CheckCircleIcon;
};

// Difficulty badge colors
const getDifficultyColor = (difficulty?: string) => {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-amber-100 text-amber-700';
    case 'advanced': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Step-by-Step Guide Component
export const StepGuide: React.FC<{ guide: GuideContent; accentColor?: string }> = ({
  guide,
  accentColor = 'blue',
}) => {
  const { t } = useTranslation(['howItWorks']);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const toggleStepComplete = (stepNumber: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber)
        ? prev.filter((n) => n !== stepNumber)
        : [...prev, stepNumber]
    );
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue: { bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    green: { bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
    purple: { bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
    orange: { bg: 'bg-orange-600', border: 'border-orange-600', text: 'text-orange-600', light: 'bg-orange-50' },
    cyan: { bg: 'bg-cyan-600', border: 'border-cyan-600', text: 'text-cyan-600', light: 'bg-cyan-50' },
  };

  const colors = colorClasses[accentColor] || colorClasses.blue;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`${colors.light} px-6 py-5 border-b border-gray-100`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpenIcon className={`w-5 h-5 ${colors.text}`} />
              <span className={`text-sm font-medium ${colors.text}`}>
                {t('howItWorks:guide.stepByStep', 'Step-by-Step Guide')}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{guide.title}</h3>
            {guide.description && (
              <p className="text-gray-600 mt-1 text-sm">{guide.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {guide.estimatedTime && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <ClockIcon className="w-4 h-4" />
                <span>{guide.estimatedTime}</span>
              </div>
            )}
            {guide.difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                {guide.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {guide.steps && guide.steps.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>{t('howItWorks:guide.progress', 'Progress')}</span>
              <span>{completedSteps.length} / {guide.steps.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.bg} transition-all duration-500 ease-out`}
                style={{ width: `${(completedSteps.length / guide.steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="p-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {guide.steps?.map((step, index) => {
              const isCompleted = completedSteps.includes(step.stepNumber);
              const isExpanded = expandedStep === index;
              const IconComponent = getIconComponent(step.icon || 'check');

              return (
                <div key={step.stepNumber} className="relative pl-12">
                  {/* Step number circle */}
                  <button
                    onClick={() => toggleStepComplete(step.stepNumber)}
                    className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? `${colors.bg} text-white shadow-lg`
                        : 'bg-white border-2 border-gray-300 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{step.stepNumber}</span>
                    )}
                  </button>

                  {/* Step content card */}
                  <div
                    className={`bg-gray-50 rounded-xl overflow-hidden transition-all duration-300 ${
                      isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : index)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center`}>
                          <IconComponent className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {step.title}
                          </h4>
                          {step.duration && (
                            <span className="text-xs text-gray-500">{step.duration}</span>
                          )}
                        </div>
                      </div>
                      <ChevronDownIcon
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 animate-fade-in">
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                          {step.description}
                        </p>
                        {step.tips && step.tips.length > 0 && (
                          <div className={`${colors.light} rounded-lg p-3`}>
                            <p className={`text-xs font-semibold ${colors.text} mb-2`}>
                              {t('howItWorks:guide.tips', 'Tips')}:
                            </p>
                            <ul className="space-y-1">
                              {step.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="text-xs text-gray-600 flex items-start gap-2">
                                  <SparklesIcon className={`w-3 h-3 ${colors.text} flex-shrink-0 mt-0.5`} />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion message */}
        {guide.steps && completedSteps.length === guide.steps.length && (
          <div className={`mt-6 p-4 ${colors.light} rounded-xl text-center animate-fade-in`}>
            <CheckCircleIcon className={`w-10 h-10 ${colors.text} mx-auto mb-2`} />
            <p className={`font-semibold ${colors.text}`}>
              {t('howItWorks:guide.completed', 'Guide Completed!')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('howItWorks:guide.completedMessage', 'Great job! You\'ve completed all the steps.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// FAQ Section Component
export const FAQSection: React.FC<{ content: GuideContent; accentColor?: string }> = ({
  content,
  accentColor = 'purple',
}) => {
  const { t } = useTranslation(['howItWorks']);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
    green: { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50' },
  };

  const colors = colorClasses[accentColor] || colorClasses.purple;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`${colors.light} px-6 py-5 border-b border-gray-100`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-sm font-medium ${colors.text}`}>
            {t('howItWorks:faq.title', 'Frequently Asked Questions')}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900">{content.title}</h3>
        {content.description && (
          <p className="text-gray-600 mt-1 text-sm">{content.description}</p>
        )}
      </div>

      {/* FAQs */}
      <div className="divide-y divide-gray-100">
        {content.faqs?.map((faq, index) => (
          <div key={index}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 pb-4 animate-fade-in">
                <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Video Tutorial Component
export const VideoTutorial: React.FC<{ content: GuideContent; accentColor?: string }> = ({
  content,
  accentColor = 'blue',
}) => {
  const { t } = useTranslation(['howItWorks']);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Video container */}
      <div className="relative aspect-video bg-gray-900">
        {content.url && content.url !== 'placeholder' ? (
          <video
            src={content.url}
            className="w-full h-full object-cover"
            controls
            poster={`${content.url.replace(/\.[^.]+$/, '.jpg')}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <PlayCircleIcon className="w-16 h-16 opacity-50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <PlayCircleIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">
            {t('howItWorks:video.tutorial', 'Video Tutorial')}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900">{content.title}</h3>
        {content.description && (
          <p className="text-gray-600 mt-1 text-sm">{content.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          {content.estimatedTime && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <ClockIcon className="w-4 h-4" />
              <span>{content.estimatedTime}</span>
            </div>
          )}
          {content.difficulty && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(content.difficulty)}`}>
              {content.difficulty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Feature Highlight Component
export const FeatureHighlight: React.FC<{ content: GuideContent; accentColor?: string }> = ({
  content,
  accentColor = 'amber',
}) => {
  const { t } = useTranslation(['howItWorks']);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium text-amber-600">
            {t('howItWorks:feature.highlight', 'Feature Highlight')}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{content.title}</h3>
        {content.description && (
          <p className="text-gray-600 text-sm mb-4">{content.description}</p>
        )}

        {content.features && content.features.length > 0 && (
          <ul className="space-y-2">
            {content.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Main Content Renderer
export const GuideContentRenderer: React.FC<{
  content: GuideContent;
  accentColor?: string;
}> = ({ content, accentColor }) => {
  switch (content.contentType) {
    case 'guide':
      return <StepGuide guide={content} accentColor={accentColor} />;
    case 'faq':
      return <FAQSection content={content} accentColor={accentColor} />;
    case 'feature':
      return <FeatureHighlight content={content} accentColor={accentColor} />;
    case 'video':
    default:
      return <VideoTutorial content={content} accentColor={accentColor} />;
  }
};

export default StepGuide;
