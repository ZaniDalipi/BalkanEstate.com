import type React from 'react';

export interface DockApp {
  id: string;
  name: string;
  /** An image URL, or any node (e.g. an illustration) drawn inside the icon box. */
  icon: string | React.ReactNode;
  /** Small count bubble on the icon's corner; hidden when 0 or missing. */
  badge?: number;
}
