"use client";

import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

type DeviceType = "desktop" | "tablet" | "mobile";

interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  device?: DeviceType;
}

const deviceStyles: Record<
  DeviceType,
  { wrapper: string; inner: string; bezel: string }
> = {
  desktop: {
    wrapper:
      "max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl",
    inner:
      "h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4",
    bezel: "",
  },
  tablet: {
    wrapper:
      "max-w-md mx-auto -mt-12 h-[32rem] md:h-[42rem] w-full border-4 border-[#6C6C6C] p-2 md:p-4 bg-[#222222] rounded-[24px] shadow-2xl",
    inner:
      "h-full w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-900 md:rounded-xl md:p-3",
    bezel: "",
  },
  mobile: {
    wrapper:
      "max-w-[260px] mx-auto -mt-12 h-[28rem] md:h-[34rem] w-full border-4 border-[#6C6C6C] p-1.5 md:p-2 bg-[#222222] rounded-[36px] shadow-2xl relative",
    inner:
      "h-full w-full overflow-hidden rounded-[28px] bg-gray-100 dark:bg-zinc-900 md:p-2",
    bezel:
      "absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a1a] rounded-full z-10",
  },
};

export const ContainerScroll: React.FC<ContainerScrollProps> = ({
  titleComponent,
  children,
  device = "desktop",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: "1000px" }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale} device={device}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
  device = "desktop",
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
  device?: DeviceType;
}) => {
  const styles = deviceStyles[device];

  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className={styles.wrapper}
    >
      {styles.bezel && <div className={styles.bezel} />}
      <div className={styles.inner}>{children}</div>
    </motion.div>
  );
};

/**
 * Multi-device showcase that animates between desktop, tablet, and mobile
 * as the user scrolls, showing different screenshots/content for each device.
 */
interface DeviceShowcaseProps {
  desktopContent: React.ReactNode;
  tabletContent: React.ReactNode;
  mobileContent: React.ReactNode;
  titleComponent?: React.ReactNode;
}

export const DeviceShowcase: React.FC<DeviceShowcaseProps> = ({
  desktopContent,
  tabletContent,
  mobileContent,
  titleComponent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Desktop visible from 0-40%, tablet 30-70%, mobile 60-100%
  const desktopOpacity = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const desktopScale = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0.8]);
  const desktopRotateY = useTransform(scrollYProgress, [0.25, 0.35], [0, -15]);

  const tabletOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.55, 0.65], [0, 1, 1, 0]);
  const tabletScale = useTransform(scrollYProgress, [0.25, 0.35, 0.55, 0.65], [0.8, 1, 1, 0.8]);

  const mobileOpacity = useTransform(scrollYProgress, [0.55, 0.65, 0.85], [0, 1, 1]);
  const mobileScale = useTransform(scrollYProgress, [0.55, 0.65, 0.85], [0.8, 1, 1]);
  const mobileRotateY = useTransform(scrollYProgress, [0.55, 0.65], [15, 0]);

  return (
    <div ref={containerRef} className="relative min-h-[200vh] py-20">
      {titleComponent && (
        <div className="sticky top-8 z-10 text-center mb-12 pointer-events-none">
          {titleComponent}
        </div>
      )}

      <div className="sticky top-[15vh] flex items-center justify-center h-[70vh]">
        {/* Desktop */}
        <motion.div
          style={{ opacity: desktopOpacity, scale: desktopScale, rotateY: desktopRotateY }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={deviceStyles.desktop.wrapper}>
            <div className={deviceStyles.desktop.inner}>{desktopContent}</div>
          </div>
        </motion.div>

        {/* Tablet */}
        <motion.div
          style={{ opacity: tabletOpacity, scale: tabletScale }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={deviceStyles.tablet.wrapper}>
            <div className={deviceStyles.tablet.inner}>{tabletContent}</div>
          </div>
        </motion.div>

        {/* Mobile */}
        <motion.div
          style={{ opacity: mobileOpacity, scale: mobileScale, rotateY: mobileRotateY }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={deviceStyles.mobile.wrapper}>
            {deviceStyles.mobile.bezel && <div className={deviceStyles.mobile.bezel} />}
            <div className={deviceStyles.mobile.inner}>{mobileContent}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContainerScroll;
