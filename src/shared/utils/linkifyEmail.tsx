import React from 'react';

/**
 * Takes a string and returns JSX with email addresses wrapped in clickable mailto links.
 */
export function linkifyEmail(text: string): React.ReactNode {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const parts = text.split(emailRegex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    emailRegex.test(part) ? (
      <a
        key={i}
        href={`mailto:${part}`}
        className="text-blue-600 underline hover:text-blue-800 font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}
