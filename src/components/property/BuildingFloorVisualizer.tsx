// BuildingFloorVisualizer Component
// Renders an isometric 3D building that highlights the property's floor

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface BuildingFloorVisualizerProps {
  floorNumber: number;
  totalFloors: number;
  hasElevator?: boolean;
}

/**
 * BuildingFloorVisualizer
 *
 * Renders an isometric 3D building with floors stacked vertically.
 * The property's floor is highlighted in the primary color.
 * Shows floor numbers and optional elevator indicator.
 *
 * Only renders for apartments with valid floorNumber and totalFloors.
 */
export const BuildingFloorVisualizer: React.FC<BuildingFloorVisualizerProps> = ({
  floorNumber,
  totalFloors,
  hasElevator,
}) => {
  const { t } = useTranslation(['property']);

  // Clamp totalFloors to a reasonable range for display
  const displayFloors = Math.min(Math.max(totalFloors, 1), 30);
  const highlightFloor = Math.min(Math.max(floorNumber, 0), displayFloors);

  // Dimensions
  const floorHeight = 28;
  const buildingWidth = 120;
  const isoAngle = 0.5; // tan(~26.5°) for isometric
  const sideWidth = 40;
  const roofHeight = 16;
  const groundHeight = 12;
  const padding = { top: 24, bottom: 16, left: 50, right: 16 };

  const totalBuildingHeight = displayFloors * floorHeight;
  const svgWidth = padding.left + buildingWidth + sideWidth + padding.right;
  const svgHeight = padding.top + roofHeight + totalBuildingHeight + groundHeight + padding.bottom;

  // Base positions
  const baseX = padding.left;
  const baseY = padding.top + roofHeight + totalBuildingHeight;

  const floors = useMemo(() => {
    const result = [];
    for (let i = 0; i < displayFloors; i++) {
      const floorNum = i + 1; // 1-indexed
      const isHighlighted = floorNum === highlightFloor;
      const y = baseY - (i + 1) * floorHeight;

      result.push({
        floorNum,
        isHighlighted,
        y,
      });
    }
    return result;
  }, [displayFloors, highlightFloor, baseY, floorHeight]);

  // Colors
  const frontFaceDefault = '#e8ecf1';
  const frontFaceHighlight = '#3b82f6';
  const sideFaceDefault = '#cdd5e0';
  const sideFaceHighlight = '#2563eb';
  const windowColor = '#a8c4e0';
  const windowHighlight = '#93c5fd';
  const roofColor = '#64748b';
  const roofSideColor = '#475569';
  const groundColor = '#94a3b8';

  return (
    <div className="relative bg-white/70 backdrop-blur-xl p-5 sm:p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
      {/* Glass effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      <div className="relative flex items-center gap-3 mb-4">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-blue-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
            {t('details.floorPosition', 'Floor Position')}
          </h3>
          <p className="text-xs text-neutral-400">
            {t('details.floorPositionSubtitle', 'Floor {{floor}} of {{total}}', {
              floor: highlightFloor,
              total: displayFloors,
            })}
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[280px] h-auto"
          role="img"
          aria-label={t('details.floorPositionAria', 'Building showing floor {{floor}} of {{total}} highlighted', {
            floor: highlightFloor,
            total: displayFloors,
          })}
        >
          {/* Ground / foundation */}
          <rect
            x={baseX - 4}
            y={baseY}
            width={buildingWidth + 8}
            height={groundHeight}
            rx={3}
            fill={groundColor}
            opacity={0.3}
          />
          {/* Ground side face */}
          <polygon
            points={`
              ${baseX + buildingWidth + 4},${baseY}
              ${baseX + buildingWidth + 4 + sideWidth * 0.6},${baseY - sideWidth * isoAngle * 0.6}
              ${baseX + buildingWidth + 4 + sideWidth * 0.6},${baseY - sideWidth * isoAngle * 0.6 + groundHeight}
              ${baseX + buildingWidth + 4},${baseY + groundHeight}
            `}
            fill={groundColor}
            opacity={0.2}
          />

          {/* Building floors */}
          {floors.map(({ floorNum, isHighlighted, y }) => {
            const frontFill = isHighlighted ? frontFaceHighlight : frontFaceDefault;
            const sideFill = isHighlighted ? sideFaceHighlight : sideFaceDefault;
            const winFill = isHighlighted ? windowHighlight : windowColor;
            const textColor = isHighlighted ? '#1e40af' : '#94a3b8';

            // Number of windows per floor
            const windowCount = 4;
            const windowWidth = 14;
            const windowHeight = floorHeight * 0.55;
            const windowGap = (buildingWidth - windowCount * windowWidth) / (windowCount + 1);
            const windowY = y + (floorHeight - windowHeight) / 2;

            return (
              <g key={floorNum}>
                {/* Front face */}
                <rect
                  x={baseX}
                  y={y}
                  width={buildingWidth}
                  height={floorHeight}
                  fill={frontFill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  rx={1}
                  className={isHighlighted ? 'drop-shadow-md' : ''}
                />

                {/* Side face (isometric) */}
                <polygon
                  points={`
                    ${baseX + buildingWidth},${y}
                    ${baseX + buildingWidth + sideWidth},${y - sideWidth * isoAngle}
                    ${baseX + buildingWidth + sideWidth},${y - sideWidth * isoAngle + floorHeight}
                    ${baseX + buildingWidth},${y + floorHeight}
                  `}
                  fill={sideFill}
                  stroke="#fff"
                  strokeWidth={0.5}
                />

                {/* Windows on front face */}
                {Array.from({ length: windowCount }).map((_, wi) => (
                  <rect
                    key={wi}
                    x={baseX + windowGap + wi * (windowWidth + windowGap)}
                    y={windowY}
                    width={windowWidth}
                    height={windowHeight}
                    rx={1.5}
                    fill={winFill}
                    opacity={isHighlighted ? 0.7 : 0.5}
                  />
                ))}

                {/* Side face windows (1 column, perspective-skewed) */}
                <polygon
                  points={`
                    ${baseX + buildingWidth + 8},${y + (floorHeight - windowHeight) / 2}
                    ${baseX + buildingWidth + 8 + 10},${y + (floorHeight - windowHeight) / 2 - 10 * isoAngle}
                    ${baseX + buildingWidth + 8 + 10},${y + (floorHeight - windowHeight) / 2 - 10 * isoAngle + windowHeight}
                    ${baseX + buildingWidth + 8},${y + (floorHeight - windowHeight) / 2 + windowHeight}
                  `}
                  fill={winFill}
                  opacity={isHighlighted ? 0.5 : 0.3}
                />

                {/* Floor number label */}
                <text
                  x={baseX - 8}
                  y={y + floorHeight / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={isHighlighted ? 11 : 9}
                  fontWeight={isHighlighted ? 700 : 400}
                  fill={textColor}
                  fontFamily="system-ui, sans-serif"
                >
                  {floorNum}
                </text>

                {/* Highlight arrow indicator */}
                {isHighlighted && (
                  <g>
                    {/* Arrow pointing to the highlighted floor */}
                    <polygon
                      points={`
                        ${baseX - 14},${y + floorHeight / 2 - 4}
                        ${baseX - 6},${y + floorHeight / 2}
                        ${baseX - 14},${y + floorHeight / 2 + 4}
                      `}
                      fill={frontFaceHighlight}
                    />
                    {/* Glow effect behind highlighted floor */}
                    <rect
                      x={baseX - 2}
                      y={y - 1}
                      width={buildingWidth + 4}
                      height={floorHeight + 2}
                      rx={2}
                      fill="none"
                      stroke={frontFaceHighlight}
                      strokeWidth={1.5}
                      opacity={0.6}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Roof - top face (isometric) */}
          <polygon
            points={`
              ${baseX},${baseY - totalBuildingHeight}
              ${baseX + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle}
              ${baseX + buildingWidth + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle}
              ${baseX + buildingWidth},${baseY - totalBuildingHeight}
            `}
            fill={roofColor}
            stroke="#fff"
            strokeWidth={0.5}
          />
          {/* Roof ridge */}
          <polygon
            points={`
              ${baseX},${baseY - totalBuildingHeight}
              ${baseX + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle}
              ${baseX + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle - roofHeight}
              ${baseX},${baseY - totalBuildingHeight - roofHeight}
            `}
            fill={roofSideColor}
            stroke="#fff"
            strokeWidth={0.3}
          />
          <polygon
            points={`
              ${baseX},${baseY - totalBuildingHeight - roofHeight}
              ${baseX + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle - roofHeight}
              ${baseX + buildingWidth + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle - roofHeight}
              ${baseX + buildingWidth},${baseY - totalBuildingHeight - roofHeight}
            `}
            fill={roofColor}
            opacity={0.8}
            stroke="#fff"
            strokeWidth={0.3}
          />
          {/* Roof right side extension */}
          <polygon
            points={`
              ${baseX + buildingWidth},${baseY - totalBuildingHeight}
              ${baseX + buildingWidth + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle}
              ${baseX + buildingWidth + sideWidth},${baseY - totalBuildingHeight - sideWidth * isoAngle - roofHeight}
              ${baseX + buildingWidth},${baseY - totalBuildingHeight - roofHeight}
            `}
            fill={roofSideColor}
            opacity={0.7}
            stroke="#fff"
            strokeWidth={0.3}
          />

          {/* Elevator shaft indicator */}
          {hasElevator && (
            <g>
              <rect
                x={baseX + buildingWidth - 18}
                y={baseY - totalBuildingHeight + 2}
                width={12}
                height={totalBuildingHeight - 4}
                rx={1}
                fill="#475569"
                opacity={0.15}
              />
              {/* Small elevator icon at the highlighted floor */}
              <rect
                x={baseX + buildingWidth - 16}
                y={baseY - highlightFloor * floorHeight + (floorHeight - 12) / 2}
                width={8}
                height={12}
                rx={1}
                fill={frontFaceHighlight}
                opacity={0.5}
              />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-0 right-2 flex flex-col items-end gap-1.5 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: frontFaceHighlight }} />
            <span className="text-neutral-600 font-medium">
              {t('details.yourFloor', 'Your floor')}
            </span>
          </div>
          {hasElevator && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-neutral-500">
                {t('details.elevatorAvailable', 'Elevator')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
