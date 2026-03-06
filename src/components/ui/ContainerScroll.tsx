import React, { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion';

export const ContainerScroll: React.FC<{
  titleComponent: React.ReactNode;
  children: React.ReactNode;
  phoneContent?: React.ReactNode;
}> = ({ titleComponent, children, phoneContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
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

  // Phone transforms - delayed entrance, slides in from the right
  const phoneOpacity = useTransform(scrollYProgress, [0.2, 0.5], [0, 1]);
  const phoneX = useTransform(
    scrollYProgress,
    [0.2, 0.6],
    isMobile ? [60, 0] : [120, 0]
  );
  const phoneRotate = useTransform(scrollYProgress, [0.2, 0.6], [15, 0]);
  const phoneScale = useTransform(scrollYProgress, [0.2, 0.6], [0.8, 1]);

  return (
    <div
      className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-40 w-full relative"
        style={{ perspective: '1000px' }}
      >
        <Header translate={translate} titleComponent={titleComponent} />

        {/* Devices container */}
        <div className="relative max-w-6xl mx-auto flex items-end justify-center">
          {/* Tablet - original style */}
          <Card rotate={rotate} translate={translate} scale={scale}>
            {children}
          </Card>

          {/* Phone - slides in from the right */}
          {phoneContent && (
            <motion.div
              style={{
                opacity: phoneOpacity,
                x: phoneX,
                rotateY: phoneRotate,
                scale: phoneScale,
              }}
              className="absolute -right-2 sm:right-4 md:right-8 lg:right-16 bottom-0 md:bottom-4 z-20"
            >
              <div
                className="w-[140px] sm:w-[160px] md:w-[200px] h-[280px] sm:h-[320px] md:h-[400px] bg-neutral-900 rounded-[24px] md:rounded-[32px] border-4 border-neutral-700 p-1 md:p-1.5 shadow-2xl"
                style={{
                  boxShadow:
                    '0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
                }}
              >
                {/* Phone notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 md:w-20 h-4 md:h-5 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-neutral-800 border border-neutral-700" />
                </div>
                <div className="h-full w-full overflow-hidden rounded-[20px] md:rounded-[26px] bg-gray-50">
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
  translate: MotionValue<number>;
  children: React.ReactNode;
}> = ({ rotate, scale, children }) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
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
