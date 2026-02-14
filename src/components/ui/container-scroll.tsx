"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

// ── Device frame components ───────────────────────────────────────

export const TabletFrame: React.FC<{
  children: React.ReactNode;
  landscape?: boolean;
}> = ({ children, landscape = false }) => (
  <div className={`relative mx-auto ${landscape ? "max-w-2xl" : "max-w-md"}`}>
    <div className="relative border-[6px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[22px] p-1 shadow-2xl">
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#333] rounded-full z-10" />
      <div
        className={`w-full overflow-hidden rounded-[16px] bg-white ${
          landscape ? "h-[22rem] md:h-[30rem]" : "h-[32rem] md:h-[44rem]"
        }`}
      >
        {children}
      </div>
      <div className="mx-auto mt-1.5 w-16 h-1 bg-[#333] rounded-full" />
    </div>
  </div>
);

export const PhoneFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`relative mx-auto max-w-[280px] ${className}`}>
    <div className="relative border-[5px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[36px] p-1 shadow-2xl">
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-[22px] bg-[#1a1a1a] rounded-full z-10" />
      <div className="w-full h-[34rem] md:h-[38rem] overflow-hidden rounded-[30px] bg-white">
        {children}
      </div>
      <div className="mx-auto mt-1 w-20 h-1 bg-[#444] rounded-full" />
    </div>
  </div>
);

// ── ContainerScrollDevice ─────────────────────────────────────────
// Same Aceternity scroll animation but renders the device frame
// INSIDE the animation (no extra box-shadow wrapper)

interface ContainerScrollDeviceProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  scrollHeight?: string;
}

export const ContainerScrollDevice: React.FC<ContainerScrollDeviceProps> = ({
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
          className="max-w-5xl mx-auto text-center"
        >
          {titleComponent}
        </motion.div>
        <motion.div
          style={{ rotateX: rotate, scale }}
          className="-mt-12 mx-auto"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

// ── Phone parade ──────────────────────────────────────────────────

interface PhoneParadeProps {
  phones: { content: React.ReactNode; label: string }[];
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
        {phones.map((phone, index) => (
          <PhoneScrollItem
            key={index}
            scrollYProgress={scrollYProgress}
            index={index}
            total={phones.length}
            label={phone.label}
          >
            {phone.content}
          </PhoneScrollItem>
        ))}
      </div>
    </div>
  );
};

const PhoneScrollItem: React.FC<{
  scrollYProgress: MotionValue<number>;
  index: number;
  total: number;
  label: string;
  children: React.ReactNode;
}> = ({ scrollYProgress, index, total, label, children }) => {
  const centerIndex = Math.floor(total / 2);
  const distanceFromCenter = Math.abs(index - centerIndex);
  const delayedStart = 0.1 + index * (0.5 / total) + distanceFromCenter * 0.05;

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
  const rotateZ = useTransform(
    scrollYProgress,
    [delayedStart, Math.min(delayedStart + 0.2, 1)],
    [index < centerIndex ? -8 : index > centerIndex ? 8 : 0, 0]
  );

  return (
    <motion.div style={{ opacity, y, rotateZ }} className="flex flex-col items-center">
      <div className="w-[140px] md:w-[200px]">
        <div className="relative border-[4px] border-[#2a2a2a] bg-[#1a1a1a] rounded-[24px] md:rounded-[30px] p-0.5">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-14 md:w-16 h-3 md:h-4 bg-[#1a1a1a] rounded-full z-10" />
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

// ── Video in device frame ─────────────────────────────────────────

interface VideoDeviceProps {
  src: string;
  poster?: string;
  device: "tablet" | "phone";
}

export const VideoDevice: React.FC<VideoDeviceProps> = ({ src, poster, device }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
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
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const content = (
    <div ref={containerRef} className="w-full h-full relative">
      {!hasError ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover object-top"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 gap-3">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-sm font-medium">Drop intro.webm in public/videos/</p>
        </div>
      )}
    </div>
  );

  if (device === "phone") return <PhoneFrame>{content}</PhoneFrame>;
  return <TabletFrame>{content}</TabletFrame>;
};

// Re-export
export { ContainerScroll } from "./container-scroll-animation";
