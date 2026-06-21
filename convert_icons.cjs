const sharp = require('sharp');
const fs = require('fs');

async function convert() {
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const svgContent = fs.readFileSync(`public/icons/icon-${size}.svg`);
    await sharp(svgContent)
      .png()
      .toFile(`public/icons/icon-${size}.png`);
    console.log(`Converted icon-${size}.png`);
  }
}

convert().catch(console.error);
