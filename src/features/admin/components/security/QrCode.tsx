import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  label: string;
  size?: number;
}

/** A QR code drawn as SVG (sharp at any size, works offline). */
export const QrCode: React.FC<QrCodeProps> = ({ value, label, size = 192 }) => {
  const path = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) d += `M${x + 4},${y + 4}h1v1h-1z`;
    }
    return { d, extent: modules.size + 8 };
  }, [value]);

  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${path.extent} ${path.extent}`} className="rounded-lg bg-white" shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={path.d} fill="#111827" />
    </svg>
  );
};
