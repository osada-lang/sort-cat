
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function checkImage(filePath) {
    try {
        const image = await loadImage(filePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const data = imageData.data;

        let minX = image.width;
        let maxX = 0;

        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const alpha = data[(y * image.width + x) * 4 + 3];
                if (alpha > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
        }

        console.log(`File: ${filePath}`);
        console.log(`Image Width: ${image.width}`);
        console.log(`Content Bounds: X=${minX} to X=${maxX}`);
        const contentWidth = maxX - minX;
        const contentCenter = (minX + maxX) / 2;
        const imageCenter = image.width / 2;
        const offset = contentCenter - imageCenter;

        console.log(`Content Width: ${contentWidth}`);
        console.log(`Content Center: ${contentCenter}`);
        console.log(`Image Center: ${imageCenter}`);
        console.log(`Offset (Content Center - Image Center): ${offset.toFixed(2)}px`);
        
        if (Math.abs(offset) > 1) {
            console.log(`WARNING: The tower is shifted ${offset > 0 ? 'RIGHT' : 'LEFT'} within the image file by ${Math.abs(offset).toFixed(2)}px.`);
        } else {
            console.log(`SUCCESS: The tower is horizontally centered within the image file.`);
        }
    } catch (err) {
        console.error(err);
    }
}

checkImage('c:/Users/user/dev/sort_cat/www/assets/images/cat_tower_v5.png');
checkImage('c:/Users/user/dev/sort_cat/www/assets/images/cat_white.png');
