import React from 'react';
import { AnimatePresence } from 'framer-motion';
import DrawLoginPrompt from './DrawLoginPrompt';
import type { useDrawLoginGate } from './useDrawLoginGate';

/** Renders the login prompt for a `useDrawLoginGate` result, with its enter/exit animation. */
const DrawLoginGate: React.FC<{ gate: ReturnType<typeof useDrawLoginGate> }> = ({ gate }) => (
  <AnimatePresence>
    {gate.isPromptOpen && (
      <DrawLoginPrompt
        key="draw-login-prompt"
        onLogIn={gate.logIn}
        onDrawWithoutSaving={gate.drawWithoutSaving}
        onCancel={gate.dismiss}
      />
    )}
  </AnimatePresence>
);

export default DrawLoginGate;
