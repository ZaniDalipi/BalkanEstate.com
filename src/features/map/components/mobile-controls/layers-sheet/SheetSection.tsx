import React from 'react';

/** A titled group in the sheet, like an iOS inset-grouped section. */
const SheetSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-4 first:mt-1">
    <h3 className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
    {children}
  </section>
);

export default SheetSection;
