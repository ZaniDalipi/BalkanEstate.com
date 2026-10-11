import React from 'react';
import { localizePath, navigate } from '@/src/app/router/navigation';

interface GuideLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** An app path from `paths` — without the language prefix. */
  to: string;
}

/**
 * A real `<a href>` (crawlable, middle-click and long-press work) that stays
 * inside the router on a plain left click.
 */
export const GuideLink: React.FC<GuideLinkProps> = ({ to, onClick, children, ...rest }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={localizePath(to)} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};
