import React from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export type GlassTone = 'plain' | 'on' | 'dark' | 'danger';

const TONES: Record<GlassTone, string> = {
  plain: 'text-neutral-700',
  on: 'text-primary',
  dark: 'bg-neutral-900/85 text-white',
  danger: 'bg-red-500 text-white',
};

interface GlassIconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  /** Short word shown under the icon, so the action is clear without a hover tooltip. */
  caption?: string;
  tone?: GlassTone;
  children: React.ReactNode;
}

/**
 * A 44pt icon button (54pt with a caption) for the phone map's glass stacks. It squashes under the
 * finger and springs back, like an iOS control (no squash with reduced motion).
 */
const GlassIconButton: React.FC<GlassIconButtonProps> = ({ label, caption, tone = 'plain', className, children, ...rest }) => {
  const reduce = !!useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={caption ? undefined : label}
      whileTap={reduce ? undefined : { scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={`relative flex items-center justify-center ${caption ? 'h-[54px] w-[54px] flex-col gap-0.5 rounded-[20px]' : 'h-11 w-11 rounded-full'} [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${TONES[tone]} ${className ?? ''}`}
      {...rest}
    >
      {children}
      {caption && (
        <span aria-hidden="true" className="max-w-full truncate px-0.5 text-[10px] font-semibold leading-none">
          {caption}
        </span>
      )}
    </motion.button>
  );
};

export default GlassIconButton;
