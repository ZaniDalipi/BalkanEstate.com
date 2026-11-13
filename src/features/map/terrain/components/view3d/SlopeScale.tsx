/** The colour scale as one bar, green to red, with the slope each colour stands for marked along it. */
import React from 'react';
import { LEGEND_TICKS, rampGradientCss } from '../../utils/slopeRamp';

const SlopeScale: React.FC = () => (
  <div aria-hidden="true">
    <div className="h-1.5 rounded-full" style={{ background: rampGradientCss() }} />
    <div className="mt-1 flex justify-between text-[10px] font-medium tabular-nums text-gray-500">
      {LEGEND_TICKS.map((pct, i) => (
        <span key={pct}>{i === LEGEND_TICKS.length - 1 ? `${pct}%+` : pct}</span>
      ))}
    </div>
  </div>
);

export default SlopeScale;
