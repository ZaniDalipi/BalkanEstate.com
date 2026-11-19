import React from 'react';
import { HONEYPOT_FIELD } from '../utils/inquiryHoneypot';

/** Off-screen field only bots fill in. Hidden from screen readers and the tab order. */
const InquiryHoneypot: React.FC = () => (
  <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
    <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
  </div>
);

export default InquiryHoneypot;
