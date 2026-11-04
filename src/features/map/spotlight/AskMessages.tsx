import React, { useEffect, useRef } from 'react';
import type { AskTurn } from './askProperty';

/** The conversation, newest at the bottom, scrolled into view as it grows. */
const AskMessages: React.FC<{ turns: AskTurn[]; pendingQuestion: string | null; thinkingLabel: string }> = ({ turns, pendingQuestion, thinkingLabel }) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns.length, pendingQuestion]);

  const bubble = (turn: AskTurn, key: string) => (
    <div key={key} className={`flex ${turn.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${turn.sender === 'user' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-neutral-100 text-neutral-900'}`}>
        {turn.text}
      </p>
    </div>
  );

  return (
    <div className="space-y-2" aria-live="polite">
      {turns.map((turn, i) => bubble(turn, `${i}`))}
      {pendingQuestion && (
        <>
          {bubble({ sender: 'user', text: pendingQuestion }, 'pending')}
          <div className="flex justify-start">
            <p className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
              <span className="inline-flex gap-0.5" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </span>
              {thinkingLabel}
            </p>
          </div>
        </>
      )}
      <div ref={endRef} />
    </div>
  );
};

export default AskMessages;
