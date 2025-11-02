# Palettized PNG Results - Hanafuda Cards

## Executive Summary

✅ **Success!** Converted hanafuda cards from true-color RGB to indexed/palettized PNGs using pngquant.

**Key Results:**
- **File Size Reduction**: 52-62% smaller
- **Format**: True 8-bit colormap (indexed color)
- **Quality**: Excellent with 256 colors, very good with 128 colors
- **Ready for**: Easy theme/palette swapping

## File Size Comparison

### Individual Cards (Sample of 4)

| Card | Original | 256 Colors | Savings | 128 Colors | Savings |
|------|----------|------------|---------|------------|---------|
| Jan-bright | 45.0 KB | 19.6 KB | **56.5%** | 16.7 KB | **62.8%** |
| Jan-chaff-1 | 34.4 KB | 17.9 KB | **48.1%** | 15.8 KB | **54.1%** |
| Jan-chaff-2 | 32.7 KB | 16.3 KB | **50.2%** | 14.2 KB | **56.6%** |
| Jan-poetry | 57.3 KB | 26.7 KB | **53.4%** | 22.1 KB | **61.5%** |
| **Total (4 cards)** | **169.5 KB** | **80.4 KB** | **52.5%** | **68.8 KB** | **59.4%** |

### Projected for All 48 Cards

| Format | Total Size | Savings |
|--------|------------|---------|
| Original RGB | 1.99 MB | - |
| 256-color indexed | **0.94 MB** | **52.5% smaller** |
| 128-color indexed | **0.81 MB** | **59.4% smaller** |

## Format Verification

All converted files are **true indexed PNGs**:

```
Jan-bright-256c.png: PNG image data, 147 x 244, 8-bit colormap, non-interlaced
Jan-poetry-256c.png: PNG image data, 147 x 244, 8-bit colormap, non-interlaced
Jan-chaff-1-256c.png: PNG image data, 147 x 244, 8-bit colormap, non-interlaced
```

✅ **8-bit colormap** = True palettized/indexed PNG (not RGB)

## Palette Analysis

### Jan-bright Card (256 colors)

**Color Distribution by Luminance:**
- Blacks (< 20): 27 colors (10.5%)
- Darks (20-79): 63 colors (24.6%)
- Mids (80-179): 89 colors (34.8%)
- Lights (180-239): 38 colors (14.8%)
- Whites (≥ 240): 39 colors (15.2%)

**Chromatic Breakdown:**
- Red-ish colors: **100** (dominant theme color)
- Green-ish colors: 12
- Blue-ish colors: 3

**Key Colors:**
- Index 1: #000000 (black outline)
- Indices 2-26: Very dark colors (shadows, details)
- Indices 27-89: Dark to mid-tones (gradients)
- Indices 180-255: Light colors and whites (background, highlights)

### Jan-poetry Card (256 colors)

**Color Distribution:**
- Blacks: 35 colors (13.7%)
- Darks: 65 colors (25.4%)
- Mids: 94 colors (36.7%)
- Lights: 26 colors (10.2%)
- Whites: 36 colors (14.1%)

**Chromatic Breakdown:**
- Red-ish colors: **131** (very dominant)
- Green-ish colors: 16
- Blue-ish colors: 4

### Jan-chaff-1 Card (256 colors)

**Color Distribution:**
- Blacks: 67 colors (26.2%) - more shadows
- Darks: 87 colors (34.0%)
- Mids: 37 colors (14.5%)
- Lights: 31 colors (12.1%)
- Whites: 34 colors (13.3%)

**Chromatic Breakdown:**
- Red-ish colors: 60
- Green-ish colors: **35** (more botanical colors)
- Blue-ish colors: 7

## Key Insights

### 1. Palette Organization
- **Low indices (0-30)**: Blacks, very dark colors (outlines, shadows)
- **Mid indices (30-180)**: Theme colors and gradients (reds, greens, golds)
- **High indices (180-255)**: Light colors and whites (backgrounds, highlights)

### 2. Theme Colors Are Spread Throughout
- **Challenge**: Theme colors (reds, greens) are distributed across many palette indices
- **Reason**: Each shade/gradient of a theme color gets its own palette entry
- **Implication**: Simple single-color swap won't work; need range-based remapping

### 3. All 256 Colors Are Used
- pngquant optimally uses the full 256-color palette
- No wasted palette entries
- Gradients are smooth due to sufficient color steps

### 4. Card-Specific Palettes
- Each card has a different palette optimized for its specific imagery
- Jan-bright: Heavy red (crane), moderate whites
- Jan-poetry: Very heavy red (ribbon), complex gradients
- Jan-chaff: More greens (botanical), darker overall

## Personalization Strategies

Based on palette analysis, here are the recommended approaches:

### Strategy 1: Luminance-Based Remapping (Recommended)
**Concept**: Remap colors based on brightness ranges, preserving relative lightness

**Implementation**:
```json
{
  "theme": "dark",
  "remapping": {
    "blacks": {
      "luminance_range": [0, 20],
      "new_color": "#FFFFFF",  // Invert blacks to whites
      "preserve_variation": true
    },
    "theme_darks": {
      "luminance_range": [20, 80],
      "hue_shift": 180,  // Shift reds to cyans
      "saturation_multiply": 1.2
    },
    "whites": {
      "luminance_range": [240, 255],
      "new_color": "#1A1A1A"  // Invert whites to blacks
    }
  }
}
```

**Pros**:
- Preserves gradients and shading
- Works across different cards
- Natural-looking results

**Cons**:
- More complex implementation
- May need per-card tuning

### Strategy 2: Hue Rotation
**Concept**: Rotate all colors around the color wheel

**Implementation**:
```javascript
// For each palette color
const hsl = rgbToHSL(color);
hsl.h = (hsl.h + hueShift) % 360;
const newRGB = hslToRGB(hsl);
```

**Pros**:
- Simple algorithm
- Preserves gradients perfectly
- Works on any card

**Cons**:
- Limited control (can't independently change reds vs greens)
- May produce unnatural colors

### Strategy 3: Dominant Color Replacement
**Concept**: Identify dominant colors (reds, greens) and replace them

**Implementation**:
1. Analyze palette to find red-ish colors
2. Sort by saturation/prominence
3. Replace top N red colors with theme color
4. Interpolate surrounding colors

**Pros**:
- Precise control over specific colors
- Can target exact elements (e.g., "only change the red ribbon")

**Cons**:
- Requires color detection logic
- May miss gradient edges
- Different approach per card type

### Strategy 4: Full Palette Templates
**Concept**: Create complete 256-color palette templates for each theme

**Implementation**:
```json
{
  "Jan-bright-dark": {
    "palette": [
      "#FFFFFF",  // Index 0 (was black)
      "#FEFEFE",  // Index 1
      // ... 254 more colors
    ]
  }
}
```

**Pros**:
- Perfect control
- Can hand-tune each palette
- Consistent results

**Cons**:
- 48 cards × N themes = lots of palettes to maintain
- No programmatic generation
- Large storage

## Recommended Implementation Path

### Phase 1: Proof of Concept (This Week)
✅ **COMPLETED**:
- Converted 4 sample cards with pngquant
- Verified indexed PNG format
- Analyzed palettes
- Measured file savings

### Phase 2: Full Conversion (Next)
- [ ] Convert all 48 cards to indexed PNG (256 colors)
- [ ] Replace current assets with indexed versions
- [ ] Test in game engine
- [ ] Verify visual quality across all cards

### Phase 3: Theme System (After Conversion)
- [ ] Implement luminance-based remapping (Strategy 1)
- [ ] Create 2-3 example themes:
  - Default (current colors)
  - Dark mode (inverted)
  - Pastel (desaturated + lighter)
- [ ] Build palette swap tool/script
- [ ] Generate themed card sets

### Phase 4: Integration (Final)
- [ ] Add theme selector to UI
- [ ] Implement dynamic palette loading
- [ ] Optimize loading (single default set + palette diffs)
- [ ] Documentation

## Technical Details

### Conversion Command Used
```bash
pngquant --quality=80-100 --speed 1 256 input.png -o output.png
```

**Parameters**:
- `--quality=80-100`: Only save if quality is 80% or better
- `--speed 1`: Slowest/highest quality
- `256`: Target 256 colors
- Floyd-Steinberg dithering: Enabled by default

### Tools Created
1. **compare-sizes.js**: Analyzes file size savings
2. **extract-palettes.js**: Extracts and analyzes color palettes
3. **analyze-colors.js**: Counts unique colors in original PNGs
4. **simple-quantize.js**: Custom median-cut quantization demo

### Output Files
- `public/assets/cards-palettized/Jan-bright-256c.png`
- `public/assets/cards-palettized/Jan-bright-128c.png`
- `public/assets/cards-palettized/Jan-chaff-1-256c.png`
- `public/assets/cards-palettized/Jan-chaff-1-128c.png`
- `public/assets/cards-palettized/Jan-chaff-2-256c.png`
- `public/assets/cards-palettized/Jan-chaff-2-128c.png`
- `public/assets/cards-palettized/Jan-poetry-256c.png`
- `public/assets/cards-palettized/Jan-poetry-128c.png`

## Recommendations

### Color Count Decision
**Use 256 colors for all cards**

**Reasoning**:
- Only 7% larger than 128-color versions (0.94 MB vs 0.81 MB)
- Significantly better gradient quality
- More flexibility for theme variations
- All cards fit comfortably in 256 colors

### Quality Assessment
**256 colors**: ⭐⭐⭐⭐⭐ Excellent - virtually no visible difference from original
**128 colors**: ⭐⭐⭐⭐☆ Very good - slight banding in complex gradients

### Next Action
**Convert all 48 cards to 256-color indexed PNGs using pngquant**

This will:
- Reduce total asset size from ~2.0 MB to ~0.94 MB
- Enable easy palette swapping for themes
- Maintain excellent visual quality
- Set foundation for personalization system

## Conclusion

✅ **Palettization is a success!** The hanafuda cards convert beautifully to indexed PNGs with pngquant.

**Benefits Achieved**:
- 52% file size reduction
- True indexed format for palette swapping
- Excellent visual quality maintained
- Clear palette structure for theming

**Ready for Next Phase**: Convert remaining 44 cards and begin implementing theme system.

---

Generated: 2025-11-02
Tool: pngquant v3.0.3
Sample size: 4 cards (Jan-bright, Jan-poetry, Jan-chaff-1, Jan-chaff-2)
