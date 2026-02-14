"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

// ── Device frame components ───────────────────────────────────────
// Realistic device frames for desktop monitor, tablet, and phone

export const DesktopFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative mx-auto w-full max-w-5xl">
    {/* Monitor body */}
    <div className="relative border-4 border-[#2a2a2a] bg-[#1a1a1a] rounded-t-xl p-1.5 md:p-3 shadow-2xl">
      {/* Camera dot */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#333] rounded-full" />
      {/* Screen */}
      <div className="w-full h-[28rem] md:h-[38rem] overflow-hidden rounded-lg bg-white">
        {children}
      </div>
    </div>
    {/* Stand neck */}
    <div className="mx-auto w-24 h-6 bg-gradient-to-b from-[#2a2a2a] to-[#3a3a3a]" />
    {/* Stand base */}
    <div className="mx-auto w-40 h-2 bg-[#3a3a3a] rounded-b-lg" />
  </div>
);

export const TabletFrame: React.FC<{
  children: React.ReactNode;
  landscape?: boolean;
}> = ({ children, landscape = false }) => (
  <div
    className={`relative mx-auto ${
      landscape ? "max-w-xl" : "max-w-sm"
    }`}
  >
    <div className="relative border-[6px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[20px] p-1 shadow-2xl">
      {/* Camera */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#333] rounded-full z-10" />
      {/* Screen */}
      <div
        className={`w-full overflow-hidden rounded-[14px] bg-white ${
          landscape ? "h-[22rem] md:h-[28rem]" : "h-[30rem] md:h-[40rem]"
        }`}
      >
        {children}
      </div>
      {/* Home bar indicator */}
      <div className="mx-auto mt-1 w-16 h-1 bg-[#333] rounded-full" />
    </div>
  </div>
);

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative mx-auto max-w-[280px]">
    <div className="relative border-[5px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[36px] p-1 shadow-2xl">
      {/* Dynamic Island / Notch */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-[22px] bg-[#1a1a1a] rounded-full z-10" />
      {/* Screen */}
      <div className="w-full h-[32rem] md:h-[36rem] overflow-hidden rounded-[30px] bg-white">
        {children}
      </div>
      {/* Home bar */}
      <div className="mx-auto mt-1 w-20 h-1 bg-[#444] rounded-full" />
    </div>
  </div>
);

// ── Scroll section for individual device ──────────────────────────
// Each one of these is a scroll-linked 3D animation section

interface ScrollDeviceSectionProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  /** Height of the scroll container (controls how much scroll is needed) */
  scrollHeight?: string;
}

export const ScrollDeviceSection: React.FC<ScrollDeviceSectionProps> = ({
  titleComponent,
  children,
  scrollHeight = "h-[60rem] md:h-[80rem]",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className={`${scrollHeight} flex items-center justify-center relative p-2 md:p-20`}
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          style={{ translateY: translate }}
          className="max-w-5xl mx-auto text-center mb-8"
        >
          {titleComponent}
        </motion.div>
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
          }}
          className="mx-auto"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

// ── Horizontal multi-phone showcase ───────────────────────────────
// Shows multiple phones appearing from the sides as user scrolls

interface PhoneParadeProps {
  /** Array of phone screen content (left to right) */
  phones: {
    content: React.ReactNode;
    label: string;
  }[];
  titleComponent?: React.ReactNode;
}

export const PhoneParade: React.FC<PhoneParadeProps> = ({
  phones,
  titleComponent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={containerRef} className="relative py-16 md:py-24 overflow-hidden">
      {titleComponent && (
        <div className="text-center mb-12">{titleComponent}</div>
      )}

      <div className="flex items-center justify-center gap-4 md:gap-8 px-4">
        {phones.map((phone, index) => {
          const total = phones.length;
          const startOffset = 0.1 + index * (0.5 / total);
          const endOffset = startOffset + 0.25;

          return (
            <PhoneScrollItem
              key={index}
              scrollYProgress={scrollYProgress}
              index={index}
              total={total}
              startOffset={startOffset}
              endOffset={endOffset}
              label={phone.label}
            >
              {phone.content}
            </PhoneScrollItem>
          );
        })}
      </div>
    </div>
  );
};

const PhoneScrollItem: React.FC<{
  scrollYProgress: MotionValue<number>;
  index: number;
  total: number;
  startOffset: number;
  endOffset: number;
  label: string;
  children: React.ReactNode;
}> = ({ scrollYProgress, index, total, startOffset, endOffset, label, children }) => {
  // Center items come in first, sides come in later
  const centerIndex = Math.floor(total / 2);
  const distanceFromCenter = Math.abs(index - centerIndex);
  const delayedStart = startOffset + distanceFromCenter * 0.05;

  const opacity = useTransform(
    scrollYProgress,
    [delayedStart, Math.min(delayedStart + 0.15, 1)],
    [0, 1]
  );
  const y = useTransform(
    scrollYProgress,
    [delayedStart, Math.min(delayedStart + 0.15, 1)],
    [60, 0]
  );
  // Slight rotation that straightens out
  const rotateZ = useTransform(
    scrollYProgress,
    [delayedStart, Math.min(delayedStart + 0.2, 1)],
    [index < centerIndex ? -8 : index > centerIndex ? 8 : 0, 0]
  );

  return (
    <motion.div style={{ opacity, y, rotateZ }} className="flex flex-col items-center">
      <div className="w-[140px] md:w-[200px]">
        <div className="relative border-[4px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[24px] md:rounded-[30px] p-0.5 shadow-xl">
          {/* Dynamic Island */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 md:w-16 h-3 md:h-4 bg-[#1a1a1a] rounded-full z-10" />
          {/* Screen */}
          <div className="w-full h-[240px] md:h-[340px] overflow-hidden rounded-[20px] md:rounded-[26px] bg-white">
            {children}
          </div>
          <div className="mx-auto mt-0.5 w-10 h-0.5 bg-[#444] rounded-full" />
        </div>
      </div>
      <p className="mt-3 text-xs md:text-sm font-medium text-gray-600">{label}</p>
    </motion.div>
  );
};

// ── Video device frame ────────────────────────────────────────────
// Wraps a video in a device frame with autoplay on scroll-into-view

interface VideoDeviceProps {
  src: string;
  poster?: string;
  device: "desktop" | "tablet" | "phone";
}

export const VideoDevice: React.FC<VideoDeviceProps> = ({ src, poster, device }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const video = (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="w-full h-full object-cover object-top"
    />
  );

  const wrapper = (
    <div ref={containerRef} className="w-full h-full">
      {video}
    </div>
  );

  switch (device) {
    case "desktop":
      return <DesktopFrame>{wrapper}</DesktopFrame>;
    case "tablet":
      return <TabletFrame>{wrapper}</TabletFrame>;
    case "phone":
      return <PhoneFrame>{wrapper}</PhoneFrame>;
  }
};

// Re-export ContainerScroll from aceternity for convenience
export { ContainerScroll } from "./container-scroll-animation";
