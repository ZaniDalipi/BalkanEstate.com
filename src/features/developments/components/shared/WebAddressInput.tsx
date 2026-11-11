import React from 'react';
import { Input, type InputProps } from '@/src/shared/components/ui/Input';
import { stripScheme } from '../../utils/webAddress';

interface WebAddressInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'leftIcon'> {
  /** The address without its scheme (one with a scheme shows without it). */
  value: string;
  onValueChange: (value: string) => void;
}

/**
 * A web address field with a fixed "https://" in front: owners type only
 * "www.x.com" or "x.com"; a pasted "https://…" loses its scheme as it lands.
 * Save it with `toWebUrl`.
 */
export const WebAddressInput: React.FC<WebAddressInputProps> = ({ value, onValueChange, placeholder = 'www.example.com', ...rest }) => (
  <Input
    {...rest}
    type="text"
    inputMode="url"
    autoCapitalize="none"
    autoCorrect="off"
    spellCheck={false}
    value={stripScheme(value)}
    onChange={(e) => onValueChange(stripScheme(e.target.value))}
    placeholder={placeholder}
    leftIcon={<span className="text-sm font-medium text-slate-500">https://</span>}
    className="pl-[4.25rem]!"
  />
);
