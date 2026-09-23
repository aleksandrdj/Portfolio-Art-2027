import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.resolve(rootDir, 'public/Logo_ArtDeejay.svg');
const outPath = path.resolve(rootDir, 'src/data/logoData.ts');

if (!fs.existsSync(svgPath)) {
  console.error(`SVG file not found at ${svgPath}`);
  process.exit(1);
}

const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract viewBox
const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 1920 787';

// Extract path d
const pathMatch = svgContent.match(/<path[^>]*\bd=["']([^"']+)["'][^>]*>/i);
if (!pathMatch) {
  console.error('Could not find <path d="..."> in SVG file');
  process.exit(1);
}
const pathD = pathMatch[1];

const parts = viewBox.split(/\s+/).map(Number);
const vbWidth = parts[2] || 1920;
const vbHeight = parts[3] || 787;

// Stroke reveal paths tailored to uncover the real ArtDeejay calligraphy
const revealStrokes = [
  {
    id: 'stroke-A-stem-loop',
    label: 'Letter A and initial flourish',
    // Sweeps up from base loop through the peak of A and down the right leg, with crossing bar
    d: 'M 70 540 C 110 590 190 600 220 520 C 250 430 200 180 250 80 C 280 20 330 60 350 200 C 370 330 380 500 400 620 C 410 650 370 660 340 620 C 310 570 280 440 330 400 C 360 380 430 410 460 420',
    strokeWidth: 150,
    durationRatio: 0.16,
  },
  {
    id: 'stroke-r',
    label: 'Letter r',
    // Stem and top arch of r
    d: 'M 450 430 C 470 350 490 280 520 260 C 550 240 580 280 590 340 C 600 400 620 460 630 480',
    strokeWidth: 140,
    durationRatio: 0.08,
  },
  {
    id: 'stroke-t',
    label: 'Letter t ascender, crossbar and link',
    // Tall ascender reaching top (Y~2) down through the base, crossbar and lead to D
    d: 'M 730 10 C 720 120 710 320 700 480 C 690 580 730 630 770 590 C 800 550 780 430 750 330 C 640 330 610 350 600 350 C 640 340 760 310 820 310 C 830 360 830 480 840 520',
    strokeWidth: 150,
    durationRatio: 0.14,
  },
  {
    id: 'stroke-D',
    label: 'Capital Letter D',
    // Descending stem down to base, and wide expansive outer curve of D
    d: 'M 830 140 C 820 260 810 440 820 580 C 830 630 870 640 920 620 C 1020 570 1080 440 1080 320 C 1080 200 1010 130 910 130 C 840 130 820 200 820 260 C 820 380 910 520 1040 550 C 1090 560 1120 520 1140 480',
    strokeWidth: 160,
    durationRatio: 0.18,
  },
  {
    id: 'stroke-ee',
    label: 'Double letter e',
    // Looping e1 then looping e2
    d: 'M 1130 460 C 1150 400 1180 340 1220 340 C 1260 340 1260 410 1230 460 C 1200 500 1240 520 1280 480 C 1310 430 1340 340 1380 340 C 1420 340 1420 420 1390 470 C 1370 500 1400 530 1430 490',
    strokeWidth: 140,
    durationRatio: 0.12,
  },
  {
    id: 'stroke-j',
    label: 'Letter j dot and descending loop',
    // Dot at top and descending long tail
    d: 'M 1440 110 C 1450 140 1460 190 1450 220 M 1430 320 C 1430 440 1420 570 1410 660 C 1400 710 1430 730 1460 700 C 1490 660 1510 560 1530 470',
    strokeWidth: 145,
    durationRatio: 0.10,
  },
  {
    id: 'stroke-a',
    label: 'Letter a',
    // Circular body of a and right downward stem
    d: 'M 1530 460 C 1540 390 1570 330 1620 330 C 1660 330 1670 380 1660 450 C 1650 510 1600 520 1560 490 C 1540 470 1550 410 1600 370 C 1650 350 1690 390 1690 470',
    strokeWidth: 140,
    durationRatio: 0.08,
  },
  {
    id: 'stroke-y-and-underline',
    label: 'Letter y and grand sweep flourish',
    // Descending y loop through right edge (X~1910) and sweeping under the signature back to left
    d: 'M 1690 370 C 1720 420 1740 480 1780 460 C 1820 430 1850 360 1870 330 M 1860 340 C 1860 450 1860 570 1850 670 C 1840 760 1800 790 1740 770 C 1660 730 1560 690 1420 680 C 1220 670 1000 640 760 640 C 580 640 380 670 200 660 C 120 660 80 620 140 580',
    strokeWidth: 160,
    durationRatio: 0.14,
  },
];

const fileContent = `// AUTO-GENERATED from public/Logo_ArtDeejay.svg - DO NOT EDIT MANUALLY
// Single Source of Truth for ArtDeejay vector geometry.

export const LOGO_VIEWBOX = '${viewBox}';

export const ORIGINAL_VIEWBOX = {
  width: ${vbWidth},
  height: ${vbHeight},
  aspectRatio: ${vbWidth} / ${vbHeight},
};

export interface RevealStroke {
  id: string;
  label: string;
  d: string;
  strokeWidth: number;
  durationRatio: number;
}

export const REVEAL_STROKE_PATHS: RevealStroke[] = ${JSON.stringify(revealStrokes, null, 2)};

export const LOGO_FILLED_PATH =
  ${JSON.stringify(pathD)};
`;

fs.writeFileSync(outPath, fileContent, 'utf8');
console.log(`Successfully generated ${outPath} from ${svgPath} (${pathD.length} characters)`);
