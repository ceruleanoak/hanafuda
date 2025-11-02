import fs from 'fs';
import { PNG } from 'pngjs';

// Simple median cut color quantization
function medianCut(pixels, depth, maxDepth) {
    if (depth === maxDepth || pixels.length === 0) {
        // Return average color of this bucket
        let r = 0, g = 0, b = 0;
        for (const pixel of pixels) {
            r += pixel.r;
            g += pixel.g;
            b += pixel.b;
        }
        const count = pixels.length;
        return [{
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
            count
        }];
    }

    // Find the color channel with the greatest range
    let rMin = 255, rMax = 0;
    let gMin = 255, gMax = 0;
    let bMin = 255, bMax = 0;

    for (const pixel of pixels) {
        if (pixel.r < rMin) rMin = pixel.r;
        if (pixel.r > rMax) rMax = pixel.r;
        if (pixel.g < gMin) gMin = pixel.g;
        if (pixel.g > gMax) gMax = pixel.g;
        if (pixel.b < bMin) bMin = pixel.b;
        if (pixel.b > bMax) bMax = pixel.b;
    }

    const rRange = rMax - rMin;
    const gRange = gMax - gMin;
    const bRange = bMax - bMin;

    // Sort by channel with greatest range
    if (rRange >= gRange && rRange >= bRange) {
        pixels.sort((a, b) => a.r - b.r);
    } else if (gRange >= rRange && gRange >= bRange) {
        pixels.sort((a, b) => a.g - b.g);
    } else {
        pixels.sort((a, b) => a.b - b.b);
    }

    // Split in half
    const mid = Math.floor(pixels.length / 2);
    const left = pixels.slice(0, mid);
    const right = pixels.slice(mid);

    // Recurse on both halves
    return [
        ...medianCut(left, depth + 1, maxDepth),
        ...medianCut(right, depth + 1, maxDepth)
    ];
}

function quantizeImage(inputPath, outputPath, numColors) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(inputPath)
            .pipe(new PNG())
            .on('parsed', function() {
                const width = this.width;
                const height = this.height;
                const data = this.data;

                console.log(`  Building color palette...`);

                // Collect all pixels
                const pixels = [];
                for (let i = 0; i < data.length; i += 4) {
                    pixels.push({
                        r: data[i],
                        g: data[i + 1],
                        b: data[i + 2],
                        a: data[i + 3]
                    });
                }

                // Calculate depth needed for desired colors
                const depth = Math.ceil(Math.log2(numColors));

                // Build palette using median cut
                const palette = medianCut(pixels, 0, depth);

                console.log(`  Generated palette with ${palette.length} colors`);
                console.log(`  Top 10 palette colors:`);
                for (let i = 0; i < Math.min(10, palette.length); i++) {
                    const color = palette[i];
                    console.log(`    ${i}: RGB(${color.r}, ${color.g}, ${color.b}) - ${color.count} pixels`);
                }

                // Apply palette to image
                console.log(`  Applying palette to image...`);
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Find closest palette color
                    let minDist = Infinity;
                    let closest = palette[0];

                    for (const color of palette) {
                        const dist = Math.sqrt(
                            Math.pow(r - color.r, 2) +
                            Math.pow(g - color.g, 2) +
                            Math.pow(b - color.b, 2)
                        );
                        if (dist < minDist) {
                            minDist = dist;
                            closest = color;
                        }
                    }

                    data[i] = closest.r;
                    data[i + 1] = closest.g;
                    data[i + 2] = closest.b;
                }

                // Save output
                const png = new PNG({ width, height });
                png.data = data;

                png.pack()
                    .pipe(fs.createWriteStream(outputPath))
                    .on('finish', () => {
                        const originalSize = fs.statSync(inputPath).size;
                        const outputSize = fs.statSync(outputPath).size;
                        console.log(`  Saved to ${outputPath}`);
                        console.log(`  Original: ${originalSize} bytes -> Quantized: ${outputSize} bytes`);
                        const savings = ((1 - outputSize / originalSize) * 100).toFixed(1);
                        console.log(`  Size change: ${savings}% ${savings > 0 ? 'reduction' : 'increase'}`);
                        resolve({ palette, outputSize });
                    })
                    .on('error', reject);
            })
            .on('error', reject);
    });
}

async function main() {
    const inputFile = 'assets/cards/Jan-bright.png';
    const outputDir = 'assets/test-palettized';

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Testing color quantization with Median Cut algorithm\n');
    console.log('Input: Jan-bright.png (3,753 colors)\n');

    const colorCounts = [32, 64, 128, 256];

    for (const numColors of colorCounts) {
        console.log(`\nQuantizing to ${numColors} colors:`);
        const outputPath = `${outputDir}/Jan-bright-${numColors}c.png`;

        try {
            await quantizeImage(inputFile, outputPath, numColors);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Done! Check assets/test-palettized/ to view results.');
    console.log('\nNote: These files are still RGB PNGs, not true indexed PNGs.');
    console.log('For true palettized PNGs, use tools like pngquant or convert');
    console.log('the format using specialized libraries.');
}

main().catch(console.error);
