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
}

interface AnimatedTooltipProps {
  items: AnimatedTooltipItem[];
  onItemClick?: (item: AnimatedTooltipItem) => void;
}

const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({ items, onItemClick }) => {
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
      {items.map((item) => (
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
                style={{ translateX, rotate, whiteSpace: 'nowrap' }}
                className="absolute -top-16 -left-1/2 translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-black z-50 shadow-xl px-4 py-2"
              >
                <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px" />
                <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />
                <div className="font-bold text-white relative z-30 text-base">
                  {item.name}
                </div>
                <div className="text-white/60 text-xs">{item.designation}</div>
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
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnimatedTooltip;
