// GeminiFormComponents
// Reusable form components for property listing creation

import React, { useState, useRef, useEffect } from 'react';

// --- Helper Icons ---
export const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// --- ImageTagSelector Component ---
interface ImageTagSelectorProps {
  value: string;
  options: string[];
  onChange: (tag: string) => void;
}

export const ImageTagSelector: React.FC<ImageTagSelectorProps> = ({
  value,
  options,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (tag: string) => {
    onChange(tag);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const selectedLabel = value ? value.replace(/_/g, ' ') : 'Select Tag';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 flex justify-between items-center capitalize"
      >
        {selectedLabel}
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>
      {isOpen && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {options.map((tag) => (
            <li
              key={tag}
              onClick={() => handleSelect(tag)}
              className="px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer capitalize"
            >
              {tag.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- TagListInput Component ---
interface TagListInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  label: string;
  inputBaseClasses: string;
}

export const TagListInput: React.FC<TagListInputProps> = ({
  tags,
  setTags,
  label,
  inputBaseClasses,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputId = `tag-input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
      </label>
      <div
        className={`${inputBaseClasses} flex flex-wrap items-center gap-2 h-auto py-1 cursor-text`}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 bg-primary-light text-primary-dark text-sm font-semibold px-2 py-1 rounded"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-primary-dark/70 hover:text-primary-dark"
            >
              &times;
            </button>
          </div>
        ))}
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="flex-grow bg-transparent outline-none text-base h-8 placeholder:text-neutral-700"
        />
      </div>
    </div>
  );
};

// --- TriStateCheckbox Component ---
interface TriStateCheckboxProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

export const TriStateCheckbox: React.FC<TriStateCheckboxProps> = ({ label, value, onChange }) => {
  const getButtonStyle = (state: 'no' | 'any' | 'yes') => {
    let isActive = false;
    if (state === 'no') isActive = value === false;
    if (state === 'any') isActive = value === undefined;
    if (state === 'yes') isActive = value === true;

    return `px-3 py-1.5 text-xs font-medium rounded transition-colors ${
      isActive
        ? 'bg-primary-dark text-white'
        : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
    }`;
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(false)} className={getButtonStyle('no')}>
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={getButtonStyle('any')}
        >
          Any
        </button>
        <button type="button" onClick={() => onChange(true)} className={getButtonStyle('yes')}>
          Yes
        </button>
      </div>
    </div>
  );
};
