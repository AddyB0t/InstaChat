/**
 * Process screenshots for App Store submission
 * Usage: node scripts/processScreenshots.js <input1.png> <input2.png> ...
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// App Store screenshot dimensions
const DIMENSIONS = {
  // iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
  'iphone-6.7': { width: 1290, height: 2796 },
  // iPhone 6.5" (iPhone 11 Pro Max, XS Max)
  'iphone-6.5': { width: 1242, height: 2688 },
  // iPhone 5.5" (iPhone 8 Plus)
  'iphone-5.5': { width: 1242, height: 2208 },
};

async function processScreenshot(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  const dim = DIMENSIONS['iphone-6.7']; // Use largest dimension

  console.log(`Processing: ${inputPath}`);

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    console.log(`  Original: ${metadata.width}x${metadata.height}`);

    // Resize to fit within target dimensions while maintaining aspect ratio
    // Then extend/pad to exact dimensions with black background
    await image
      .resize(dim.width, dim.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, `${filename}_appstore.png`));

    console.log(`  Output: ${dim.width}x${dim.height} -> ${filename}_appstore.png`);

    // Also create a version that fills the frame (crop if needed)
    await sharp(inputPath)
      .resize(dim.width, dim.height, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toFile(path.join(outputDir, `${filename}_appstore_filled.png`));

    console.log(`  Output (filled): ${dim.width}x${dim.height} -> ${filename}_appstore_filled.png`);

    return true;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node processScreenshots.js <screenshot1.png> [screenshot2.png] ...');
    console.log('');
    console.log('This script will resize screenshots to App Store dimensions (1290x2796)');
    console.log('Output files will be saved in the same directory with _appstore suffix');
    process.exit(1);
  }

  const outputDir = path.dirname(args[0]) || '.';

  console.log('App Store Screenshot Processor');
  console.log('==============================');
  console.log(`Target: iPhone 6.7" (1290x2796)`);
  console.log(`Output directory: ${outputDir}`);
  console.log('');

  for (const inputPath of args) {
    if (!fs.existsSync(inputPath)) {
      console.error(`File not found: ${inputPath}`);
      continue;
    }
    await processScreenshot(inputPath, outputDir);
    console.log('');
  }

  console.log('Done! Use the _appstore.png files for App Store Connect.');
}

main();
