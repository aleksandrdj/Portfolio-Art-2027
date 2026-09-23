/**
 * Unified Layout Calculations for ArtDeejay Logo
 * Shared between DOM SVG Intro and WebGL2 Final Pass
 */

export const ORIGINAL_VIEWBOX = {
  width: 1920,
  height: 787,
  aspectRatio: 1920 / 787,
  viewBoxStr: '0 0 1920 787',
};

export interface LogoLayout {
  widthCss: number;
  heightCss: number;
  leftCss: number;
  topCss: number;
  widthPx: number;
  heightPx: number;
  leftPx: number;
  topPx: number;
}

/**
 * Computes exact logo placement according to specification:
 * - width strictly 60vw (0.60 * containerWidthCss) on all screen sizes
 * - extreme low viewport protection: if height exceeds 85% of viewport, scale down proportionally
 * - height strictly follows original viewBox 1920x787 (aspect ratio ~2.4396)
 * - centered horizontally and vertically
 * - DPR influences only physical pixel coordinates, not CSS visible layout
 */
export function computeLogoLayout(
  containerWidthCss: number,
  containerHeightCss: number,
  dpr: number = 1
): LogoLayout {
  const targetWidthCss = containerWidthCss * 0.60;
  let widthCss = targetWidthCss;
  let heightCss = widthCss / ORIGINAL_VIEWBOX.aspectRatio;

  // Preserve full silhouette vertically in extreme low viewport scenarios
  const maxHeightCss = containerHeightCss * 0.85;
  if (heightCss > maxHeightCss) {
    heightCss = maxHeightCss;
    widthCss = heightCss * ORIGINAL_VIEWBOX.aspectRatio;
  }

  const leftCss = (containerWidthCss - widthCss) / 2;
  const topCss = (containerHeightCss - heightCss) / 2;

  return {
    widthCss,
    heightCss,
    leftCss,
    topCss,
    widthPx: widthCss * dpr,
    heightPx: heightCss * dpr,
    leftPx: leftCss * dpr,
    topPx: topCss * dpr,
  };
}
