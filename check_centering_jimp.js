
const Jimp = require('jimp');

async function checkImage(filePath) {
    try {
        const image = await Jimp.read(filePath);
        let minX = image.bitmap.width;
        let maxX = 0;

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        });

        const imageWidth = image.bitmap.width;
        const contentWidth = maxX - minX;
        const contentCenter = (minX + maxX) / 2;
        const imageCenter = imageWidth / 2;
        const offset = contentCenter - imageCenter;

        console.log(`\n--- ${filePath} ---`);
        console.log(`Image Width: ${imageWidth}`);
        console.log(`Content Bounds: X=${minX} to X=${maxX}`);
        console.log(`Content Width: ${contentWidth}`);
        console.log(`Content Center: ${contentCenter}`);
        console.log(`Image Center: ${imageCenter}`);
        console.log(`Offset (Content - Image Center): ${offset.toFixed(2)}px`);
        
        if (Math.abs(offset) > 1) {
            console.log(`WARNING: This asset is shifted ${offset > 0 ? 'RIGHT' : 'LEFT'} by ${Math.abs(offset).toFixed(2)}px.`);
        } else {
            console.log(`SUCCESS: This asset is horizontally centered.`);
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
    }
}

async function run() {
    await checkImage('www/assets/images/cat_tower_v5.png');
    await checkImage('www/assets/images/cat_white.png');
}

run();
