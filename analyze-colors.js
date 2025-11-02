import fs from 'fs';
import { PNG } from 'pngjs';

function analyzeImage(imagePath) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(imagePath)
            .pipe(new PNG())
            .on('parsed', function() {
                const data = this.data;
                const colorMap = new Map();

                // Count unique colors
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    // Skip fully transparent pixels
                    if (a === 0) continue;

                    const colorKey = `${r},${g},${b}`;
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                }

                const totalPixels = this.width * this.height;
                const colors = Array.from(colorMap.entries())
                    .map(([color, count]) => ({ color, count }))
                    .sort((a, b) => b.count - a.count);

                resolve({
                    width: this.width,
                    height: this.height,
                    totalPixels,
                    uniqueColors: colors.length,
                    topColors: colors.slice(0, 15)
                });
            })
            .on('error', reject);
    });
}

async function main() {
    const cardsDir = 'assets/cards';
    const files = fs.readdirSync(cardsDir)
        .filter(f => f.endsWith('.png') && f !== '.gitkeep');

    console.log(`Analyzing ${files.length} card images...\n`);

    for (const file of files.slice(0, 5)) { // Analyze first 5 cards
        const path = `${cardsDir}/${file}`;
        console.log(`\n${file}:`);
        console.log('='.repeat(50));

        const analysis = await analyzeImage(path);
        console.log(`Dimensions: ${analysis.width} x ${analysis.height}`);
        console.log(`Total pixels: ${analysis.totalPixels}`);
        console.log(`Unique colors: ${analysis.uniqueColors}`);
        console.log(`\nTop 15 colors:`);

        for (let i = 0; i < Math.min(15, analysis.topColors.length); i++) {
            const { color, count } = analysis.topColors[i];
            const percentage = (count / analysis.totalPixels * 100).toFixed(2);
            console.log(`  ${i + 1}. RGB(${color.padEnd(15)}) - ${count.toString().padStart(6)} pixels (${percentage.padStart(6)}%)`);
        }
    }
}

main().catch(console.error);
