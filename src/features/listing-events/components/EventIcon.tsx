import React from 'react';
import { DoorOpen, Gavel } from 'lucide-react';

/** Open door for an open house, gavel for an auction. Decorative. */
const EventIcon: React.FC<{ kind: 'openHouse' | 'auction'; className?: string }> = ({ kind, className = 'h-3.5 w-3.5' }) => {
  const Icon = kind === 'openHouse' ? DoorOpen : Gavel;
  return <Icon aria-hidden="true" className={className} strokeWidth={2.2} />;
};

export default EventIcon;
