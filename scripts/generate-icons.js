const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create icon as PNG
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#06b6d4');
  gradient.addColorStop(1, '#3b82f6');
  
  // Rounded rect background
  const radius = size * 0.15;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // M letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.47}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size * 0.5, size * 0.58);
  
  // $ symbol
  ctx.font = `bold ${size * 0.18}px Arial, sans-serif`;
  ctx.fillText('$', size * 0.75, size * 0.32);
  
  return canvas.toBuffer('image/png');
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

// Generate 192x192
const icon192 = generateIcon(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
console.log('Generated icon-192.png');

// Generate 512x512
const icon512 = generateIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
console.log('Generated icon-512.png');

// Generate 180x180 for Apple touch icon
const icon180 = generateIcon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);
console.log('Generated apple-touch-icon.png');

// Generate 32x32 favicon
const icon32 = generateIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.png'), icon32);
console.log('Generated favicon.png');

console.log('All icons generated successfully!');
