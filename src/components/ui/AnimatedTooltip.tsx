import React, { useState } from 'react';
import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from 'framer-motion';

export interface AnimatedTooltipItem {
  id: number;
  name: string;
  designation: string;
  image: string;
  // Extended fields for rich tooltip
  location?: string;
  phone?: string;
  email?: string;
  services?: string[];
  isVerified?: boolean;
  listingId?: string;
}

interface AnimatedTooltipProps {
  items: AnimatedTooltipItem[];
  onItemClick?: (item: AnimatedTooltipItem) => void;
  onQuoteRequest?: (item: AnimatedTooltipItem) => void;
}

const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({ items, onItemClick, onQuoteRequest }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);

  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const halfWidth = (event.target as HTMLElement).offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className="flex flex-row items-center justify-center gap-[-8px]">
      {items.map((item) => {
        const hasRichData = item.phone || item.services?.length;

        return (
          <div
            className="-mr-3 relative group"
            key={item.id}
            onMouseEnter={() => setHoveredIndex(item.id)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence mode="popLayout">
              {hoveredIndex === item.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: 'spring',
                      stiffness: 260,
                      damping: 10,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  style={hasRichData ? { whiteSpace: 'normal' } : { translateX, rotate, whiteSpace: 'nowrap' }}
                  className={`absolute left-1/2 -translate-x-1/2 z-50 ${
                    hasRichData ? 'bottom-full mb-2 w-56' : '-top-16'
                  }`}
                >
                  {hasRichData ? (
                    /* Rich tooltip card */
                    <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
                      {/* Header */}
                      <div className="p-3 pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-sm">{item.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-neutral-900 truncate flex items-center gap-1">
                              {item.name}
                              {item.isVerified && (
                                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="text-xs text-neutral-500">{item.designation}</div>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      {item.location && (
                        <div className="px-3 pb-1.5">
                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                            </svg>
                            <span className="truncate">{item.location}</span>
                          </div>
                        </div>
                      )}

                      {/* Services */}
                      {item.services && item.services.length > 0 && (
                        <div className="px-3 pb-2">
                          <div className="flex flex-wrap gap-1">
                            {item.services.slice(0, 2).map(s => (
                              <span key={s} className="px-1.5 py-0.5 bg-primary/5 text-primary rounded text-[9px] font-medium border border-primary/10 truncate max-w-[90px]">
                                {s}
                              </span>
                            ))}
                            {item.services.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-neutral-50 text-neutral-400 rounded text-[9px] font-medium">
                                +{item.services.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="p-2 pt-0 flex gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                          className="flex-1 py-1.5 bg-gradient-to-r from-primary to-blue-600 text-white text-[11px] font-bold rounded-lg hover:shadow-md transition-shadow text-center"
                        >
                          View Profile
                        </button>
                        {onQuoteRequest && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onQuoteRequest(item); }}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors text-center"
                          >
                            Get Quote
                          </button>
                        )}
                      </div>

                      {/* Phone quick-dial */}
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 py-2 bg-neutral-50 border-t border-neutral-100 text-neutral-500 hover:text-primary hover:bg-primary/5 transition-colors text-[11px] font-medium"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                          </svg>
                          {item.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    /* Simple tooltip (fallback) */
                    <div className="flex text-xs flex-col items-center justify-center rounded-md bg-black shadow-xl px-4 py-2">
                      <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                      <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                      <div className="font-bold text-white relative z-30 text-base">
                        {item.name}
                      </div>
                      <div className="text-white/60 text-xs">{item.designation}</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => onItemClick?.(item)}
              onMouseMove={handleMouseMove}
              className="relative rounded-full h-14 w-14 border-2 border-white group-hover:scale-105 group-hover:z-30 transition duration-500 overflow-hidden cursor-pointer"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="object-cover w-full h-full rounded-full"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Online pulse indicator */}
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white">
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-50" />
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnimatedTooltip;
