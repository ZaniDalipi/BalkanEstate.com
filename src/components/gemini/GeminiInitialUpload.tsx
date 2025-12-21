// GeminiInitialUpload
// Initial AI upload screen with language/property type selection

import React from 'react';
import { SparklesIcon } from '../../../constants';
import {
  UploadIcon,
  ImageTagSelector,
} from './GeminiFormComponents';
import {
  ImageData,
  LANGUAGES,
  floatingInputClasses,
  floatingSelectLabelClasses,
} from './GeminiTypes';

interface GeminiInitialUploadProps {
  language: string;
  setLanguage: (lang: string) => void;
  aiPropertyType: 'house' | 'apartment' | 'villa' | 'other';
  setAiPropertyType: (type: 'house' | 'apartment' | 'villa' | 'other') => void;
  images: ImageData[];
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  handleGenerate: () => void;
}

/**
 * GeminiInitialUpload Component
 *
 * Initial screen for AI-powered listing creation:
 * - Language selection
 * - Property type selection
 * - Image upload with preview
 * - Generate button
 *
 * This is step 1 of the AI flow before the AI analyzes images.
 */
export const GeminiInitialUpload: React.FC<GeminiInitialUploadProps> = ({
  language,
  setLanguage,
  aiPropertyType,
  setAiPropertyType,
  images,
  handleImageChange,
  removeImage,
  handleGenerate,
}) => {
  return (
    <div className="animate-fade-in">
      <div>
        {/* Language and Property Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="relative">
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`${floatingInputClasses} border-neutral-300`}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <label htmlFor="language" className={floatingSelectLabelClasses}>
              Description Language
            </label>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select
              id="aiPropertyType"
              value={aiPropertyType}
              onChange={(e) => setAiPropertyType(e.target.value as any)}
              className={`${floatingInputClasses} border-neutral-300`}
            >
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="villa">Villa</option>
              <option value="other">Other</option>
            </select>
            <label htmlFor="aiPropertyType" className={floatingSelectLabelClasses}>
              Property Type
            </label>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Image Upload Area */}
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-neutral-50 hover:bg-neutral-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 mb-3 text-neutral-400" />
            <p className="mb-2 text-sm text-neutral-500">
              <span className="font-semibold">Click to upload photos</span>
            </p>
            <p className="text-xs text-neutral-500">PNG, JPG or WEBP</p>
          </div>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-sm mb-2">{images.length} image(s) selected:</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.previewUrl}
                    alt={`preview ${index}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full mt-6 py-3 text-lg font-bold text-white bg-primary rounded-lg shadow-md hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          disabled={images.length === 0}
        >
          <SparklesIcon className="w-6 h-6" />
          Generate Listing
        </button>
      </div>
    </div>
  );
};
