import React from 'react';
import { useAutoHint } from '../hooks/useAutoHint';
import HintToast from './HintToast';
import HintsPanel from './HintsPanel';

/** Mounted once in the app layout: the tip that shows up on its own, and the Tips panel. */
const HintsHost: React.FC = () => {
  useAutoHint();
  return (
    <div data-hints-ui>
      <HintToast />
      <HintsPanel />
    </div>
  );
};

export default HintsHost;
