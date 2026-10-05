import React from 'react';

/** Shows an API error: its message, and the list of field problems a 400 returns. */
const MutationError: React.FC<{ error: unknown }> = ({ error }) => {
  if (!error) return null;
  const err = error as { message?: string; details?: { errors?: string[] } };
  const problems = err.details?.errors ?? [];
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">{err.message}</p>
      {problems.length > 0 && (
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MutationError;
