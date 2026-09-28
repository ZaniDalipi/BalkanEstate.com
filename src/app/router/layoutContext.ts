/**
 * What the app layout offers the page inside it. Pages with their own mobile
 * header (home, search, rentals, villas) open the sidebar drawer from it.
 */

import { createContext, useContext } from 'react';

export const OpenSidebarContext = createContext<() => void>(() => {});

export function useOpenSidebar(): () => void {
  return useContext(OpenSidebarContext);
}
