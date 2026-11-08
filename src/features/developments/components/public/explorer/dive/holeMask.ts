const r = (n: number) => Math.round(n * 10) / 10;

/**
 * A CSS mask (an inline SVG image) that keeps everything in a W × H picture
 * except one polygon, which is cut out: laid over the rendering, a layer with
 * this mask covers the building but leaves that apartment untouched.
 */
export function holeMask(width: number, height: number, points: ReadonlyArray<readonly [number, number]>): string {
  const hole = points.map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)} ${r(y)}`).join('') + 'Z';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='none'><path fill-rule='evenodd' d='M0 0H${width}V${height}H0Z${hole}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
