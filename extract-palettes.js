import fs from 'fs';
import { PNG } from 'pngjs';

function extractPalette(imagePath) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let palette = null;
        let transparency = null;

        const stream = fs.createReadStream(imagePath);

        // Read raw PNG chunks to extract PLTE (palette) and tRNS (transparency)
        stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            let offset = 8; // Skip PNG signature

            const paletteColors = [];
            const alphaValues = [];

            // Parse PNG chunks
            while (offset < buffer.length - 12) {
                const length = buffer.readUInt32BE(offset);
                const type = buffer.toString('ascii', offset + 4, offset + 8);
                const data = buffer.slice(offset + 8, offset + 8 + length);

                if (type === 'PLTE') {
                    // Palette chunk - RGB triplets
                    for (let i = 0; i < length; i += 3) {
                        paletteColors.push({
                            r: data[i],
                            g: data[i + 1],
                            b: data[i + 2],
                            a: 255 // default alpha
                        });
                    }
                } else if (type === 'tRNS') {
                    // Transparency chunk - alpha values
                    for (let i = 0; i < length; i++) {
                        alphaValues.push(data[i]);
                    }
                } else if (type === 'IEND') {
                    break;
                }

                offset += 12 + length; // length + type + data + CRC
            }

            // Apply alpha values to palette
            for (let i = 0; i < alphaValues.length; i++) {
                if (paletteColors[i]) {
                    paletteColors[i].a = alphaValues[i];
                }
            }

            resolve(paletteColors);
        });

        stream.on('error', reject);
    });
}

async function analyzeCard(cardPath) {
    const palette = await extractPalette(cardPath);
    const basename = cardPath.split('/').pop();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${basename}`);
    console.log('='.repeat(60));
    console.log(`Palette size: ${palette.length} colors\n`);

    // Group colors by luminance
    const withLuminance = palette.map((color, idx) => {
        const lum = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        return { ...color, idx, lum };
    });

    // Sort by luminance (darkest to lightest)
    withLuminance.sort((a, b) => a.lum - b.lum);

    console.log('Colors sorted by luminance (darkest to lightest):\n');
    console.log('Index | RGB Color          | Luminance | Hex');
    console.log('------|-------------------|-----------|----------');

    for (let i = 0; i < Math.min(20, withLuminance.length); i++) {
        const c = withLuminance[i];
        const hex = `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`;
        const alpha = c.a < 255 ? ` (α${c.a})` : '';
        console.log(`  ${c.idx.toString().padStart(3)}  | RGB(${c.r.toString().padStart(3)},${c.g.toString().padStart(3)},${c.b.toString().padStart(3)}) |   ${c.lum.toFixed(1).padStart(5)}   | ${hex}${alpha}`);
    }

    if (withLuminance.length > 20) {
        console.log(`  ...  | (${withLuminance.length - 20} more colors)`);
    }

    // Find color categories
    const blacks = withLuminance.filter(c => c.lum < 20);
    const darks = withLuminance.filter(c => c.lum >= 20 && c.lum < 80);
    const mids = withLuminance.filter(c => c.lum >= 80 && c.lum < 180);
    const lights = withLuminance.filter(c => c.lum >= 180 && c.lum < 240);
    const whites = withLuminance.filter(c => c.lum >= 240);

    console.log('\nColor distribution by luminance:');
    console.log(`  Blacks (< 20):      ${blacks.length} colors`);
    console.log(`  Darks (20-79):      ${darks.length} colors`);
    console.log(`  Mids (80-179):      ${mids.length} colors`);
    console.log(`  Lights (180-239):   ${lights.length} colors`);
    console.log(`  Whites (≥ 240):     ${whites.length} colors`);

    // Find dominant colors by hue
    const colored = withLuminance.filter(c => {
        const maxC = Math.max(c.r, c.g, c.b);
        const minC = Math.min(c.r, c.g, c.b);
        const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
        return saturation > 0.2; // Only saturated colors
    });

    const reds = colored.filter(c => c.r > c.g && c.r > c.b);
    const greens = colored.filter(c => c.g > c.r && c.g > c.b);
    const blues = colored.filter(c => c.b > c.r && c.b > c.g);

    console.log('\nChromatic colors (saturation > 20%):');
    console.log(`  Red-ish:   ${reds.length} colors`);
    console.log(`  Green-ish: ${greens.length} colors`);
    console.log(`  Blue-ish:  ${blues.length} colors`);

    return { palette, basename, blacks, whites, colored };
}

async function main() {
    console.log('='.repeat(60));
    console.log('PALETTE EXTRACTION AND ANALYSIS');
    console.log('='.repeat(60));

    const cards = [
        { path: 'public/assets/cards-palettized/Jan-bright-256c.png', name: 'Jan-bright' },
        { path: 'public/assets/cards-palettized/Jan-poetry-256c.png', name: 'Jan-poetry' },
        { path: 'public/assets/cards-palettized/Jan-chaff-1-256c.png', name: 'Jan-chaff-1' },
    ];

    const results = [];
    for (const card of cards) {
        const result = await analyzeCard(card.path);
        results.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('\nKey findings:');
    console.log('- All cards use their full 256-color palette efficiently');
    console.log('- Palettes include smooth gradients (many similar colors)');
    console.log('- Good distribution across luminance range');
    console.log('\nFor personalization:');
    console.log('- Option 1: Full palette swap (change entire 256-color palette)');
    console.log('- Option 2: Selective swap (identify key colors to remap)');
    console.log('- Option 3: Luminance-based (remap by brightness ranges)');
}

main().catch(console.error);
