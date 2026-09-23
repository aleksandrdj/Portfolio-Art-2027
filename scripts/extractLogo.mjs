import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const svgPath = path.resolve(rootDir, 'public/logo/Logo_ArtDeejay.svg');
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

const fileContent = `// AUTO-GENERATED from public/logo/Logo_ArtDeejay.svg - DO NOT EDIT MANUALLY
// Single Source of Truth for ArtDeejay vector geometry.

export const LOGO_VIEWBOX = '${viewBox}';

export const ORIGINAL_VIEWBOX = {
  width: ${vbWidth},
  height: ${vbHeight},
  aspectRatio: ${vbWidth} / ${vbHeight},
};

export const LOGO_FILLED_PATH =
  ${JSON.stringify(pathD)};
`;

fs.writeFileSync(outPath, fileContent, 'utf8');
console.log(`Successfully generated ${outPath} from ${svgPath} (${pathD.length} characters)`);

