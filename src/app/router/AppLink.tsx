/**
 * An in-app link that is a real `<a href>`.
 *
 * Buttons with an onClick handler navigate fine for people, but search engines
 * only follow `href`s — a footer built from buttons links to nothing as far as
 * a crawler is concerned. This renders the localized URL as the href and keeps
 * the SPA navigation for ordinary clicks; modified clicks (new tab, new window)
 * fall through to the browser.
 */

import React from 'react';
import { localizePath, navigate, type NavigateOptions } from './navigation';

export interface AppLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** App path without a language prefix — build it with `paths`. */
  to: string;
  navigateOptions?: NavigateOptions;
  /** Scroll to the top after navigating (default: true). */
  scrollToTop?: boolean;
}

export const AppLink = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ to, navigateOptions, scrollToTop = true, onClick, children, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigate(to, navigateOptions);
      if (scrollToTop) window.scrollTo({ top: 0, behavior: 'auto' });
    };

    return (
      <a ref={ref} href={localizePath(to)} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  },
);

AppLink.displayName = 'AppLink';
