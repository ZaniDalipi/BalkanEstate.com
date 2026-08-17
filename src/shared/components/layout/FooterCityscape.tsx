import React from 'react';
import { usePauseWhenOffscreen } from '../../hooks/usePauseWhenOffscreen';

const FooterCityscape: React.FC = () => {
  const { ref, offscreen } = usePauseWhenOffscreen<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative w-full min-h-[100px] overflow-visible bg-gradient-to-b from-transparent to-primary-dark/50 pb-0${offscreen ? ' decorative-offscreen' : ''}`}>
      {/* Sky background with better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-indigo-600/60"></div>

      {/* Stars in the background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Buildings Container */}
      <div
        className="relative bottom-0 left-0 right-0 flex items-end justify-around pb-2"
        style={{ height: '70px' }}
      >
        {/* Building 1 - Tall Apartment */}
        <Building height={48} width={35} color="orange" floors={5} windows={2} />

        {/* Building 2 - Medium House with Roof */}
        <HouseWithRoof height={32} width={32} color="blue" roofColor="red" />

        {/* Building 3 - Tall Modern Apartment */}
        <Building height={52} width={42} color="teal" floors={6} windows={3} />

        {/* Building 4 - Small House */}
        <HouseWithRoof height={28} width={30} color="purple" roofColor="orange" />

        {/* Building 5 - Medium Apartment */}
        <Building height={39} width={38} color="pink" floors={4} windows={2} />

        {/* Building 6 - Short House */}
        <HouseWithRoof height={25} width={28} color="green" roofColor="slate" />
      </div>

      {/* Ground/Street */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-300 opacity-50" />
      </div>
    </div>
  );
};

// Building component for apartments
const Building: React.FC<{
  height: number;
  width: number;
  color: string;
  floors: number;
  windows: number;
}> = ({ height, width, color, floors, windows }) => {
  const colorClasses: Record<string, string> = {
    orange: 'from-orange-400 to-orange-600',
    teal: 'from-teal-400 to-teal-700',
    pink: 'from-pink-400 to-pink-600',
  };

  return (
    <div className="relative" style={{ height: `${height}px`, width: `${width}px` }}>
      <div
        className={`absolute bottom-0 w-full h-full bg-gradient-to-b ${colorClasses[color] || 'from-gray-400 to-gray-600'} rounded-t-lg shadow-2xl`}
      >
        {[...Array(floors)].map((_, floor) => (
          <div key={`floor-${floor}`} className="flex justify-around px-2 py-1">
            {[...Array(windows)].map((_, window) => (
              <div
                key={`window-${floor}-${window}`}
                className="w-2.5 h-3 bg-yellow-200"
                style={{
                  opacity: Math.random() > 0.3 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="absolute -top-1 left-0 right-0 h-1 bg-gray-700" />
    </div>
  );
};

// House with roof component
const HouseWithRoof: React.FC<{
  height: number;
  width: number;
  color: string;
  roofColor: string;
}> = ({ height, width, color, roofColor }) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    green: 'from-green-400 to-green-600',
  };

  const roofClasses: Record<string, string> = {
    red: 'border-b-red-600',
    orange: 'border-b-orange-700',
    slate: 'border-b-slate-700',
  };

  return (
    <div className="relative" style={{ height: `${height}px`, width: `${width}px` }}>
      <div
        className={`absolute bottom-0 w-full h-full bg-gradient-to-b ${colorClasses[color] || 'from-gray-400 to-gray-600'} rounded-t-lg shadow-2xl`}
      >
        {/* Roof */}
        <div
          className={`absolute -top-5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[${width}px] border-r-[${width}px] border-b-[20px] border-l-transparent border-r-transparent ${roofClasses[roofColor] || 'border-b-gray-700'}`}
        />
        {/* Windows */}
        <div className="flex justify-around px-2 py-2">
          {[...Array(2)].map((_, window) => (
            <div
              key={`window-${window}`}
              className="w-3 h-3 bg-yellow-200"
              style={{ opacity: Math.random() > 0.3 ? 1 : 0.3 }}
            />
          ))}
        </div>
        {/* Door */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-5 bg-amber-900 rounded-t-sm" />
      </div>
    </div>
  );
};

export default FooterCityscape;
