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
 * - breakpoint: 768 CSS px
 * - mobile (<768px): 82% width
 * - desktop (>=768px): 50% width
 * - maximum width: 850 CSS px
 * - height strictly follows original viewBox 1920x787
 * - centered horizontally and vertically
 */
export function computeLogoLayout(
  containerWidthCss: number,
  containerHeightCss: number,
  dpr: number = 1
): LogoLayout {
  const isMobile = containerWidthCss < 768;
  const targetWidthCss = isMobile ? containerWidthCss * 0.82 : containerWidthCss * 0.50;
  const widthCss = Math.min(850, Math.max(10, targetWidthCss));
  const heightCss = widthCss / ORIGINAL_VIEWBOX.aspectRatio;

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
