import fs from 'fs';
import { PNG } from 'pngjs';
import * as iq from 'image-q';

async function quantizeImage(inputPath, outputPath, numColors) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(inputPath)
            .pipe(new PNG())
            .on('parsed', async function() {
                const width = this.width;
                const height = this.height;
                const data = this.data;

                console.log(`  Quantizing to ${numColors} colors...`);

                try {
                    // Create point container from image data
                    const pointContainer = iq.utils.PointContainer.fromUint8Array(
                        data,
                        width,
                        height
                    );

                    // Configure quantization
                    const palette = await iq.buildPalette([pointContainer], {
                        colors: numColors,
                        colorDistanceFormula: 'euclidean',
                        paletteQuantization: 'neuquant'
                    });

                    // Apply palette to image
                    const outPointContainer = await iq.applyPalette(pointContainer, palette, {
                        colorDistanceFormula: 'euclidean',
                        imageQuantization: 'floyd-steinberg' // Dithering
                    });

                    // Convert back to buffer manually
                    const outBuffer = Buffer.alloc(width * height * 4);

                    // Access the internal array
                    const uint32array = outPointContainer._pointArray;

                    for (let i = 0; i < width * height; i++) {
                        const color = uint32array[i];
                        // Extract RGBA from uint32
                        outBuffer[i * 4] = (color >> 24) & 0xFF; // R
                        outBuffer[i * 4 + 1] = (color >> 16) & 0xFF; // G
                        outBuffer[i * 4 + 2] = (color >> 8) & 0xFF; // B
                        outBuffer[i * 4 + 3] = color & 0xFF; // A
                    }

                    // Get palette colors
                    const paletteArr = palette._pointArray;

                    console.log(`  Generated palette with ${paletteArr.length} colors`);
                    console.log(`  Top 5 palette colors:`);
                    for (let i = 0; i < Math.min(5, paletteArr.length); i++) {
                        const color = paletteArr[i];
                        const r = (color >> 24) & 0xFF;
                        const g = (color >> 16) & 0xFF;
                        const b = (color >> 8) & 0xFF;
                        console.log(`    ${i}: RGB(${r}, ${g}, ${b})`);
                    }

                    // Create output PNG
                    const png = new PNG({ width, height });
                    png.data = outBuffer;

                    png.pack()
                        .pipe(fs.createWriteStream(outputPath))
                        .on('finish', () => {
                            const originalSize = fs.statSync(inputPath).size;
                            const outputSize = fs.statSync(outputPath).size;
                            console.log(`  Saved to ${outputPath}`);
                            console.log(`  Original file size: ${originalSize} bytes`);
                            console.log(`  Quantized file size: ${outputSize} bytes`);
                            resolve({ paletteArr, outputSize });
                        })
                        .on('error', reject);
                } catch (error) {
                    reject(error);
                }
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

    console.log('Testing color quantization on Jan-bright.png\n');
    console.log('Original: 3,753 colors\n');

    const colorCounts = [32, 64, 128, 256];

    for (const numColors of colorCounts) {
        console.log(`Testing ${numColors} colors:`);
        const outputPath = `${outputDir}/Jan-bright-${numColors}c.png`;

        try {
            await quantizeImage(inputFile, outputPath, numColors);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
        console.log('');
    }

    console.log('Done! Check the assets/test-palettized/ directory to compare results.');
    console.log('\nNext steps:');
    console.log('1. Visually compare the output files to assess quality');
    console.log('2. Choose optimal color count based on quality vs flexibility trade-off');
    console.log('3. Decide on palette organization strategy for personalization');
}

main().catch(console.error);
