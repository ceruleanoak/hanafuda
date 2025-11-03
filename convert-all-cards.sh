#!/bin/bash

PNGQUANT=/opt/node22/lib/node_modules/pngquant-bin/vendor/pngquant

echo "Converting all 48 cards to 256-color indexed PNGs..."
echo ""

count=0
for card in assets/cards/*.png; do
    basename=$(basename "$card" .png)
    echo "Processing $basename..."
    $PNGQUANT --quality=80-100 --speed 1 256 "$card" -o "assets/cards-palettized/${basename}-256c.png" --force
    count=$((count + 1))
done

echo ""
echo "✓ Conversion complete!"
echo "$count indexed PNG files created"
ls assets/cards-palettized/*-256c.png | wc -l
