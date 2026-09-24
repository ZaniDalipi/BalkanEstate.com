import React from 'react';

/** Horizontal field of view drawn for each camera, in degrees. */
const FOV = 70;
/** Marker box size in screen pixels (the cone fits inside it). */
export const PHOTO_SPOT_SIZE = 76;
const CONE_RADIUS = 34;

const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
};

/** SVG path of a view cone pointing straight up, centred on the origin. */
const CONE_PATH = (() => {
    const a = polar(-FOV / 2, CONE_RADIUS);
    const b = polar(FOV / 2, CONE_RADIUS);
    return `M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${CONE_RADIUS} ${CONE_RADIUS} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
})();

interface PhotoSpotMarkerProps {
    angle: number;
    active?: boolean;
    /** Small number shown in the camera dot (photo position, 1-based). */
    label?: number;
}

/**
 * A camera position on a floor plan: a dot with a view cone showing which way
 * the photo looks. Pure SVG, drawn at a fixed screen size; the caller
 * positions it with its centre on the spot.
 */
const PhotoSpotMarker: React.FC<PhotoSpotMarkerProps> = ({ angle, active = false, label }) => {
    const half = PHOTO_SPOT_SIZE / 2;
    return (
        <svg
            width={PHOTO_SPOT_SIZE}
            height={PHOTO_SPOT_SIZE}
            viewBox={`${-half} ${-half} ${PHOTO_SPOT_SIZE} ${PHOTO_SPOT_SIZE}`}
            className="block overflow-visible pointer-events-none"
            aria-hidden="true"
        >
            <defs>
                <radialGradient id={active ? 'spot-cone-active' : 'spot-cone'} cx="0" cy="0" r={CONE_RADIUS} gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={active ? '#2563eb' : '#0f172a'} stopOpacity={active ? 0.55 : 0.35} />
                    <stop offset="1" stopColor={active ? '#2563eb' : '#0f172a'} stopOpacity={0.04} />
                </radialGradient>
            </defs>
            <path
                d={CONE_PATH}
                transform={`rotate(${angle})`}
                fill={`url(#${active ? 'spot-cone-active' : 'spot-cone'})`}
                stroke={active ? '#2563eb' : 'rgba(15,23,42,0.35)'}
                strokeWidth={active ? 1.5 : 1}
            />
            <circle r={active ? 11 : 9} fill={active ? '#2563eb' : '#ffffff'} stroke={active ? '#ffffff' : '#0f172a'} strokeWidth={2} />
            {label !== undefined ? (
                <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={label > 9 ? 8 : 10}
                    fontWeight={700}
                    fill={active ? '#ffffff' : '#0f172a'}
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                    {label}
                </text>
            ) : (
                <circle r={3} fill={active ? '#ffffff' : '#0f172a'} />
            )}
        </svg>
    );
};

export default PhotoSpotMarker;

interface PhotoSpotSquareProps {
    /** Camera direction; the view cone is drawn only for the active photo. */
    angle: number;
    active?: boolean;
    /** Side of the square in screen pixels. */
    size?: number;
    /** Length of the active photo's view cone in screen pixels. */
    coneLength?: number;
}

/**
 * Zillow-style photo spot: a green square for every photo, and for the photo
 * being viewed a red square with a translucent yellow cone showing what the
 * camera sees. Drawn centred on the spot, at a fixed screen size.
 */
export const PhotoSpotSquare: React.FC<PhotoSpotSquareProps> = ({ angle, active = false, size = 14, coneLength = 64 }) => {
    const box = active ? coneLength * 2 + size : size + 4;
    const half = box / 2;
    const a = polar(-FOV / 2, coneLength);
    const b = polar(FOV / 2, coneLength);
    return (
        <svg
            width={box}
            height={box}
            viewBox={`${-half} ${-half} ${box} ${box}`}
            className="block overflow-visible pointer-events-none"
            style={{ marginLeft: -half, marginTop: -half }}
            aria-hidden="true"
        >
            {active && (
                <path
                    d={`M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${coneLength} ${coneLength} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`}
                    transform={`rotate(${angle})`}
                    fill="rgba(250, 204, 21, 0.55)"
                    stroke="rgba(234, 179, 8, 0.9)"
                    strokeWidth={1}
                />
            )}
            <rect
                x={-size / 2}
                y={-size / 2}
                width={size}
                height={size}
                rx={2}
                fill={active ? '#ef4444' : '#22c55e'}
                stroke="#ffffff"
                strokeWidth={active ? 2 : 1.5}
            />
        </svg>
    );
};
