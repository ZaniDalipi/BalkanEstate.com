import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useScroll, useTransform, useMotionValue, useSpring, motion, MotionValue } from 'framer-motion';

export const ContainerScroll: React.FC<{
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  phoneContent?: React.ReactNode;
}> = ({ titleComponent, children, phoneContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scaleDimensions = (): [number, number] => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  // Mouse-follow 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Normalize to -1..1
    mouseX.set((e.clientX - centerX) / (rect.width / 2));
    mouseY.set((e.clientY - centerY) / (rect.height / 2));
  }, [isMobile, mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Map mouse to subtle rotation (±5°)
  const tiltY = useSpring(useTransform(mouseX, [-1, 1], [-5, 5]), { stiffness: 100, damping: 30 });
  const tiltX = useSpring(useTransform(mouseY, [-1, 1], [3, -3]), { stiffness: 100, damping: 30 });

  // Phone parallax
  const phoneY = useTransform(scrollYProgress, [0, 0.5, 1], [60, 20, -40]);
  const phoneOpacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 1, 1]);
  const phoneScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 1]);

  return (
    <div
      className={`${phoneContent ? 'h-[65rem] md:h-[85rem]' : 'h-[60rem] md:h-[80rem]'} flex items-center justify-center relative p-2 md:p-20`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: '1000px' }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <div className="relative">
          <Card rotate={rotate} scale={scale} tiltX={tiltX} tiltY={tiltY}>
            {children}
          </Card>

          {/* Phone mockup floating beside tablet */}
          {phoneContent && (
            <motion.div
              className="hidden lg:block absolute -right-4 xl:right-0 bottom-4"
              style={{
                y: phoneY,
                opacity: phoneOpacity,
                scale: phoneScale,
                rotateX: rotate,
                rotateY: tiltY,
              }}
            >
              <div
                className="w-[220px] h-[440px] rounded-[36px] border-4 border-[#4a4a4a] bg-[#1a1a1a] p-2 shadow-2xl"
                style={{
                  boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                {/* Phone notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a1a] rounded-b-2xl z-20" />
                <div className="h-full w-full overflow-hidden rounded-[28px] bg-white">
                  {phoneContent}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{
  translate: MotionValue<number>;
  titleComponent: React.ReactNode;
}> = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

const Card: React.FC<{
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  children: React.ReactNode;
}> = ({ rotate, scale, tiltX, tiltY, children }) => {
  // Combine scroll rotateX with mouse tiltX
  const combinedRotateX = useTransform([rotate, tiltX], ([r, t]) => (r as number) + (t as number));

  return (
    <motion.div
      style={{
        rotateX: combinedRotateX,
        rotateY: tiltY,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className="max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-gray-100 md:rounded-2xl md:p-4">
        {children}
      </div>
    </motion.div>
  );
};

export default ContainerScroll;
