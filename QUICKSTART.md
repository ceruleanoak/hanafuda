# Palettized PNG Quick Start

## What We Accomplished

✅ Converted hanafuda cards to indexed/palettized PNGs using **pngquant**
✅ Achieved **52-62% file size reduction** 
✅ Verified true 8-bit colormap format
✅ Extracted and analyzed color palettes

## Results Summary

### File Sizes
- **Original (4 cards)**: 169.5 KB
- **256-color indexed**: 80.4 KB (52.5% smaller)
- **128-color indexed**: 68.8 KB (59.4% smaller)

**Projected for all 48 cards**: 2.0 MB → 0.94 MB (256-color)

### Sample Files
Check `public/assets/cards-palettized/` for:
- Jan-bright-256c.png / Jan-bright-128c.png
- Jan-poetry-256c.png / Jan-poetry-128c.png  
- Jan-chaff-1-256c.png / Jan-chaff-1-128c.png
- Jan-chaff-2-256c.png / Jan-chaff-2-128c.png

## Key Documentation

1. **PALETTIZATION_RESULTS.md** - Complete analysis and findings
2. **IMPLEMENTATION_PLAN.md** - Full roadmap for theme system
3. **README_PALETTIZATION.md** - Executive summary

## Quick Commands

```bash
# View file sizes
node compare-sizes.js

# Analyze palettes
node extract-palettes.js

# Analyze original colors
node analyze-colors.js

# Convert more cards (example)
/opt/node22/lib/node_modules/pngquant-bin/vendor/pngquant \
  --quality=80-100 --speed 1 256 \
  public/assets/cards/CardName.png \
  -o public/assets/cards-palettized/CardName-256c.png
```

## Next Steps

### Immediate
1. **Convert all 48 cards** to 256-color indexed PNGs
2. **Replace current assets** with indexed versions
3. **Test in game** to verify everything loads correctly

### After Conversion
4. **Implement palette remapping** for themes
5. **Create example themes** (default, dark, pastel)
6. **Add theme selector** to UI

## Recommendation

**Use 256 colors for all cards** - best quality/flexibility balance.

The palettes are organized by luminance (dark→light) with theme colors
distributed throughout. For personalization, use luminance-based remapping
to preserve gradients while changing colors.

---

All tools and sample outputs are in this repository.
pngquant binary: `/opt/node22/lib/node_modules/pngquant-bin/vendor/pngquant`
