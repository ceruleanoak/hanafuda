import fs from 'fs';

// Compare file sizes
const originals = [
    'public/assets/cards/Jan-bright.png',
    'public/assets/cards/Jan-chaff-1.png',
    'public/assets/cards/Jan-chaff-2.png',
    'public/assets/cards/Jan-poetry.png'
];

console.log('=== FILE SIZE ANALYSIS ===\n');

for (const orig of originals) {
    const basename = orig.split('/').pop().replace('.png', '');
    const origSize = fs.statSync(orig).size;
    const pal256Path = `public/assets/cards-palettized/${basename}-256c.png`;
    const pal128Path = `public/assets/cards-palettized/${basename}-128c.png`;

    const pal256Size = fs.existsSync(pal256Path) ? fs.statSync(pal256Path).size : 0;
    const pal128Size = fs.existsSync(pal128Path) ? fs.statSync(pal128Path).size : 0;

    const savings256 = ((origSize - pal256Size) / origSize * 100).toFixed(1);
    const savings128 = ((origSize - pal128Size) / origSize * 100).toFixed(1);

    console.log(`${basename}:`);
    console.log(`  Original:     ${(origSize / 1024).toFixed(1)} KB`);
    console.log(`  256 colors:   ${(pal256Size / 1024).toFixed(1)} KB  (${savings256}% smaller)`);
    console.log(`  128 colors:   ${(pal128Size / 1024).toFixed(1)} KB  (${savings128}% smaller)`);
    console.log('');
}

// Calculate totals
const totalOrig = originals.reduce((sum, f) => sum + fs.statSync(f).size, 0);
const total256 = originals.reduce((sum, f) => {
    const basename = f.split('/').pop().replace('.png', '');
    const path = `public/assets/cards-palettized/${basename}-256c.png`;
    return sum + (fs.existsSync(path) ? fs.statSync(path).size : 0);
}, 0);
const total128 = originals.reduce((sum, f) => {
    const basename = f.split('/').pop().replace('.png', '');
    const path = `public/assets/cards-palettized/${basename}-128c.png`;
    return sum + (fs.existsSync(path) ? fs.statSync(path).size : 0);
}, 0);

console.log('TOTALS (4 sample cards):');
console.log(`  Original:     ${(totalOrig / 1024).toFixed(1)} KB`);
console.log(`  256 colors:   ${(total256 / 1024).toFixed(1)} KB  (${((totalOrig - total256) / totalOrig * 100).toFixed(1)}% smaller)`);
console.log(`  128 colors:   ${(total128 / 1024).toFixed(1)} KB  (${((totalOrig - total128) / totalOrig * 100).toFixed(1)}% smaller)`);
console.log('');
console.log('Projected for all 48 cards:');
const avgOrig = totalOrig / originals.length;
const avg256 = total256 / originals.length;
const avg128 = total128 / originals.length;
console.log(`  Original:     ${(avgOrig * 48 / 1024 / 1024).toFixed(2)} MB`);
console.log(`  256 colors:   ${(avg256 * 48 / 1024 / 1024).toFixed(2)} MB`);
console.log(`  128 colors:   ${(avg128 * 48 / 1024 / 1024).toFixed(2)} MB`);
