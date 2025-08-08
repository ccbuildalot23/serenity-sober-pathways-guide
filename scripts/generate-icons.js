import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temporary PNG icons for Capacitor asset generation
async function generateIcons() {
  const iconSvg = fs.readFileSync(path.join(__dirname, '..', 'resources', 'icon.svg'));
  const splashSvg = fs.readFileSync(path.join(__dirname, '..', 'resources', 'splash.svg'));
  
  // Generate icon.png at 1024x1024
  await sharp(iconSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, '..', 'resources', 'icon.png'));
  
  // Generate splash.png at 2732x2732
  await sharp(splashSvg)
    .resize(2732, 2732)
    .png()
    .toFile(path.join(__dirname, '..', 'resources', 'splash.png'));
  
  console.log('✅ Generated icon.png and splash.png');
}

generateIcons().catch(console.error);