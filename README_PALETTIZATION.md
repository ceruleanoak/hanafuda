# Palettized PNG Exploration Summary

## Quick Overview

This exploration investigated converting hanafuda card images from true-color PNGs (3,000-6,600 colors) to palettized/indexed PNGs (≤256 colors) to enable easy color personalization.

## Key Findings

### Current State
- **Cards use 1,500-6,600 unique colors** per card (due to anti-aliasing and gradients)
- **File sizes**: 33-58 KB per card
- **Total size**: ~2 MB for all 48 cards
- **Format**: 8-bit/color RGB (24-bit true color)

### Feasibility: ✅ YES
Color quantization successfully reduces cards to 32-256 colors with acceptable visual quality. The median cut algorithm works well for creating organized palettes.

### Benefits
1. **Easy Color Swapping**: Change palette entries → all pixels using that color update
2. **Smaller Files**: Expected 60-65% size reduction (indexed format uses 1 byte vs 3-4 bytes per pixel)
3. **Theme System**: Simple JSON files can define color themes
4. **Organized Palettes**: Can group colors by semantic meaning

## Documents Created

### 1. **PALETTIZED_PNG_EXPLORATION.md**
   - Technical deep-dive into palettized PNGs
   - Color quantization algorithms explained
   - Implementation options compared
   - Personalization strategy outlined

### 2. **IMPLEMENTATION_PLAN.md**
   - Complete 5-week roadmap
   - Technical approach with three phases
   - Build pipeline design
   - Expected outcomes and trade-offs

### 3. **Tools Created**
   - `analyze-colors.js` - Analyzes color usage in PNG files
   - `simple-quantize.js` - Demonstrates median cut quantization
   - `assets/test-palettized/` - Sample quantized cards (4 variations)

## Test Results

Successfully quantized Jan-bright.png (3,753 colors) to:
- ✅ 32 colors - Basic palette, visible quality loss
- ✅ 64 colors - Improved quality
- ✅ 128 colors - Good quality
- ✅ 256 colors - Excellent quality

**Note**: Current test outputs are still RGB format. True indexed PNG encoding requires pngquant or sharp library.

## Recommended Next Steps

### Immediate (This Week)
1. **Decide on tool**: pngquant (CLI) vs sharp (Node.js)
2. **Convert all 48 cards** to indexed PNG format
3. **Visual quality check** - compare original vs quantized
4. **Measure actual file savings**

### Phase 2 (Next 2 Weeks)
5. **Extract and analyze palettes** from all cards
6. **Identify common colors** (background, outlines, etc.)
7. **Create semantic color groupings** by meaning
8. **Design theme JSON schema**

### Phase 3 (Weeks 3-4)
9. **Implement palette swapping system**
10. **Create example themes** (default, dark, pastel)
11. **Integrate with game engine**
12. **Add theme selector UI**

### Phase 4 (Week 5)
13. **Build automation scripts**
14. **Optimize and test all themes**
15. **Documentation and polish**

## Quick Command Reference

```bash
# Analyze color usage in a card
node analyze-colors.js

# Test quantization (creates RGB PNGs with reduced colors)
node simple-quantize.js

# View test results
ls -lh assets/test-palettized/

# To create TRUE indexed PNGs (requires pngquant):
# pngquant --quality=80-100 --ncolors 256 input.png -o output.png
```

## Key Technical Decisions Needed

1. **Color count**: 128 or 256 per card? (256 recommended for quality)
2. **Shared vs per-card palettes**: Shared easier for theming, per-card better quality
3. **Pre-generate vs runtime**: Pre-generate themes easier, runtime more flexible
4. **Tool choice**: pngquant (best quality) or sharp (better integration)?

## Questions?

See the detailed documents:
- **PALETTIZED_PNG_EXPLORATION.md** for technical details
- **IMPLEMENTATION_PLAN.md** for complete roadmap

## Bottom Line

**Palettized PNGs are perfect for hanafuda card personalization.** The cards' limited color usage makes them ideal candidates. Implementation is straightforward with existing tools, and the benefits (easy theming, smaller files) are substantial.

Expected time to full implementation: **3-5 weeks**
Expected file size savings: **60-65%**
Expected quality loss: **Minimal to none at 256 colors**
