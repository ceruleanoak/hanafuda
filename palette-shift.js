import fs from 'fs';
import { PNG } from 'pngjs';
import crc32 from 'crc-32';

// RGB to HSL conversion
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

// HSL to RGB conversion
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

// Extract palette from indexed PNG
function extractPalette(buffer) {
    let offset = 8; // Skip PNG signature
    const paletteColors = [];
    const alphaValues = [];

    while (offset < buffer.length - 12) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const data = buffer.slice(offset + 8, offset + 8 + length);

        if (type === 'PLTE') {
            for (let i = 0; i < length; i += 3) {
                paletteColors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2],
                    a: 255
                });
            }
        } else if (type === 'tRNS') {
            for (let i = 0; i < length; i++) {
                alphaValues.push(data[i]);
            }
        } else if (type === 'IEND') {
            break;
        }

        offset += 12 + length;
    }

    // Apply alpha values
    for (let i = 0; i < alphaValues.length && i < paletteColors.length; i++) {
        paletteColors[i].a = alphaValues[i];
    }

    return paletteColors;
}

// Apply palette shifts
function shiftPalette(palette, options = {}) {
    const {
        hueShift = 0,          // Degrees to shift hue (-180 to 180)
        saturationMultiplier = 1.0,  // Multiply saturation (0 to 2+)
        lightnessMultiplier = 1.0,   // Multiply lightness (0 to 2+)
        invertLightness = false,     // Invert light/dark
        invertHue = false            // Flip hue 180 degrees
    } = options;

    return palette.map(color => {
        // Convert to HSL
        let hsl = rgbToHsl(color.r, color.g, color.b);

        // Apply hue shift
        if (invertHue) {
            hsl.h = (hsl.h + 180) % 360;
        }
        hsl.h = (hsl.h + hueShift + 360) % 360;

        // Apply saturation multiplier
        hsl.s = Math.max(0, Math.min(100, hsl.s * saturationMultiplier));

        // Apply lightness modifications
        if (invertLightness) {
            hsl.l = 100 - hsl.l;
        }
        hsl.l = Math.max(0, Math.min(100, hsl.l * lightnessMultiplier));

        // Convert back to RGB
        const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);

        return {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: color.a
        };
    });
}

// Write new PNG with modified palette
async function writePngWithPalette(inputPath, outputPath, newPalette) {
    return new Promise((resolve, reject) => {
        const inputBuffer = fs.readFileSync(inputPath);
        let offset = 8;

        const chunks = [];
        let plteChunkIndex = -1;
        let trnsChunkIndex = -1;

        // Parse chunks
        while (offset < inputBuffer.length - 12) {
            const length = inputBuffer.readUInt32BE(offset);
            const type = inputBuffer.toString('ascii', offset + 4, offset + 8);
            const chunkData = inputBuffer.slice(offset, offset + 12 + length);

            if (type === 'PLTE') {
                plteChunkIndex = chunks.length;
                // We'll replace this
            } else if (type === 'tRNS') {
                trnsChunkIndex = chunks.length;
                // We'll replace this too
            }

            chunks.push({ type, data: chunkData });

            if (type === 'IEND') {
                break;
            }

            offset += 12 + length;
        }

        // Create new PLTE chunk
        const plteData = Buffer.alloc(newPalette.length * 3);
        for (let i = 0; i < newPalette.length; i++) {
            plteData[i * 3] = newPalette[i].r;
            plteData[i * 3 + 1] = newPalette[i].g;
            plteData[i * 3 + 2] = newPalette[i].b;
        }

        const plteChunk = Buffer.alloc(12 + plteData.length);
        plteChunk.writeUInt32BE(plteData.length, 0);
        plteChunk.write('PLTE', 4, 4, 'ascii');
        plteData.copy(plteChunk, 8);

        // Calculate CRC
        const crcValue = crc32.buf(plteChunk.slice(4, 8 + plteData.length)) >>> 0;
        plteChunk.writeUInt32BE(crcValue, 8 + plteData.length);

        // Create new tRNS chunk if needed
        const hasAlpha = newPalette.some(c => c.a < 255);
        let trnsChunk = null;
        if (hasAlpha) {
            const trnsData = Buffer.alloc(newPalette.length);
            for (let i = 0; i < newPalette.length; i++) {
                trnsData[i] = newPalette[i].a;
            }

            trnsChunk = Buffer.alloc(12 + trnsData.length);
            trnsChunk.writeUInt32BE(trnsData.length, 0);
            trnsChunk.write('tRNS', 4, 4, 'ascii');
            trnsData.copy(trnsChunk, 8);

            const trnsCrc = crc32.buf(trnsChunk.slice(4, 8 + trnsData.length)) >>> 0;
            trnsChunk.writeUInt32BE(trnsCrc, 8 + trnsData.length);
        }

        // Replace chunks
        if (plteChunkIndex >= 0) {
            chunks[plteChunkIndex] = { type: 'PLTE', data: plteChunk };
        }

        if (hasAlpha && trnsChunkIndex >= 0) {
            chunks[trnsChunkIndex] = { type: 'tRNS', data: trnsChunk };
        } else if (hasAlpha && trnsChunkIndex < 0) {
            // Insert tRNS after PLTE
            chunks.splice(plteChunkIndex + 1, 0, { type: 'tRNS', data: trnsChunk });
        }

        // Write output
        const outputBuffer = Buffer.concat([
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
            ...chunks.map(c => c.data)
        ]);

        fs.writeFileSync(outputPath, outputBuffer);
        resolve();
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node palette-shift.js <preset> [input.png] [output.png]');
        console.log('');
        console.log('Presets:');
        console.log('  dark      - Dark mode (invert lightness)');
        console.log('  blue      - Hue shift to blue tones');
        console.log('  green     - Hue shift to green tones');
        console.log('  purple    - Hue shift to purple tones');
        console.log('  sepia     - Desaturated warm tones');
        console.log('  neon      - Hyper-saturated colors');
        console.log('  pastel    - Lighter, desaturated colors');
        console.log('');
        console.log('Or specify custom options:');
        console.log('  --hue-shift=<degrees>           Shift hue (-180 to 180)');
        console.log('  --saturation=<multiplier>       Multiply saturation (0 to 2+)');
        console.log('  --lightness=<multiplier>        Multiply lightness (0 to 2+)');
        console.log('  --invert-lightness              Invert dark/light');
        console.log('  --invert-hue                    Flip hue 180 degrees');
        process.exit(1);
    }

    const preset = args[0];
    const inputFile = args[1] || 'public/assets/cards-palettized/Jan-bright-256c.png';
    const outputFile = args[2] || `public/assets/cards-palettized/Jan-bright-${preset}.png`;

    // Define presets
    const presets = {
        'dark': { invertLightness: true },
        'blue': { hueShift: 180 },
        'green': { hueShift: 60 },
        'purple': { hueShift: -60 },
        'sepia': { hueShift: 20, saturationMultiplier: 0.4, lightnessMultiplier: 1.1 },
        'neon': { saturationMultiplier: 2.0, lightnessMultiplier: 1.2 },
        'pastel': { saturationMultiplier: 0.5, lightnessMultiplier: 1.3 }
    };

    const options = presets[preset] || {};

    console.log(`Processing: ${inputFile}`);
    console.log(`Preset: ${preset}`);
    console.log(`Options:`, options);

    // Read and modify
    const buffer = fs.readFileSync(inputFile);
    const palette = extractPalette(buffer);

    console.log(`Original palette: ${palette.length} colors`);

    const newPalette = shiftPalette(palette, options);

    // Show some example shifts
    console.log('\nExample color shifts:');
    for (let i = 0; i < Math.min(5, palette.length); i++) {
        const orig = palette[i];
        const shifted = newPalette[i];
        console.log(`  ${i}: RGB(${orig.r},${orig.g},${orig.b}) → RGB(${shifted.r},${shifted.g},${shifted.b})`);
    }

    await writePngWithPalette(inputFile, outputFile, newPalette);

    console.log(`\n✓ Saved to: ${outputFile}`);
}

main().catch(console.error);
