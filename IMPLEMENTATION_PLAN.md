# Palettized PNG Implementation Plan for Hanafuda Cards

## Executive Summary

This document outlines a complete plan to convert hanafuda card images from true-color PNGs (3,000-6,600 colors) to palettized PNGs (≤256 colors) to enable easy color personalization and potentially reduce file sizes.

## Current State

### Image Specifications
- **Format**: PNG, 8-bit/color RGB (24-bit true color)
- **Dimensions**: 147 × 244 pixels
- **Color Usage**:
  - Jan-bright.png: 3,753 unique colors
  - Jan-chaff-1.png: 1,705 unique colors
  - Jan-chaff-2.png: 1,568 unique colors
  - Jan-poetry.png: 6,643 unique colors
- **File Sizes**: 33KB - 58KB per card
- **Total Cards**: 48 cards (12 months × 4 cards)

### Key Insight
The high color count is primarily due to:
1. **Anti-aliasing**: Edge smoothing creates many intermediate colors
2. **Subtle gradients**: Shading effects
3. **Color variations**: Slight RGB differences in "same" colors

## What We've Proven

### Color Quantization Works
Successfully reduced Jan-bright.png from 3,753 colors to:
- **32 colors**: Median cut algorithm generated distinct palette
- **64 colors**: Better color distribution
- **128 colors**: More nuanced colors
- **256 colors**: Maximum palette fidelity

### Current Limitation
The test outputs are still stored as RGB PNGs (32-bit), not true indexed PNGs (8-bit). This means:
- ✅ Color reduction works
- ❌ No file size savings yet
- ❌ Can't easily swap palette colors yet

## Goals

### Primary Goals
1. **Easy Personalization**: Users can customize card colors via simple theme files
2. **Maintain Quality**: Cards look good after quantization
3. **Semantic Colors**: Palette organized by meaning (background, outlines, theme colors)

### Secondary Goals
4. **Smaller Files**: Indexed PNGs should be ~1/3 the size of RGB PNGs
5. **Consistent Palettes**: Similar cards use similar palettes for easier theming
6. **Build Integration**: Automated conversion in build pipeline

## Technical Approach

### Phase 1: Create True Indexed PNGs

**Objective**: Convert quantized RGB PNGs to indexed color format

**Options**:

#### Option A: Use pngquant (Recommended)
```bash
# Best-in-class quantization tool
pngquant --quality=80-100 --speed 1 --ncolors 256 input.png -o output.png

# This creates true indexed PNGs with optimized palettes
```

**Pros**:
- Industry-standard quality
- True indexed PNG output
- Fast processing
- Excellent dithering

**Cons**:
- External dependency
- Requires system installation

#### Option B: Use sharp library
```javascript
import sharp from 'sharp';

await sharp('input.png')
  .png({ palette: true, colors: 256 })
  .toFile('output.png');
```

**Pros**:
- Node.js native
- Well-maintained
- Good performance

**Cons**:
- Requires native dependencies
- More complex setup

#### Option C: Manual PNG encoding with pngjs
```javascript
// Write custom indexed PNG encoder
// PNG color type 3 = indexed color
```

**Pros**:
- Full control
- Pure JavaScript

**Cons**:
- Complex implementation
- More prone to bugs

**Recommendation**: Start with pngquant for prototyping, move to sharp for production build pipeline.

### Phase 2: Palette Analysis & Organization

**Objective**: Understand and organize palette structure for theming

**Steps**:

1. **Extract palettes** from all 48 cards
2. **Identify common colors** across all cards:
   - Background (white/cream)
   - Outlines (black)
   - Text/details (dark colors)
3. **Group by semantic meaning**:
   - Indices 0-15: Structural colors (white, black, grays)
   - Indices 16-47: Primary theme colors
   - Indices 48-79: Secondary theme colors
   - Indices 80-255: Gradients and transitions

4. **Create color map** for each card type:
```json
{
  "Jan-bright": {
    "background": [0, 1, 2],      // Palette indices
    "outline": [16, 17],
    "crane_red": [32, 33, 34, 35],
    "crane_white": [3, 4, 5],
    "accent": [48, 49]
  }
}
```

### Phase 3: Palette Swapping System

**Objective**: Enable dynamic color themes

**Architecture**:

```
Theme File (JSON) → Palette Mapper → Card Renderer
```

**Theme Schema**:
```json
{
  "name": "Dark Mode",
  "version": "1.0",
  "palettes": {
    "Jan-bright": {
      "0": "#1A1A1A",    // Map palette index to new color
      "1": "#1C1C1C",
      "16": "#FFFFFF",
      "32": "#FF4444",   // Remap red
      "33": "#FF5555",
      // ... more mappings
    },
    "Jan-poetry": {
      // Different card palettes
    }
  }
}
```

**Approaches**:

#### Approach A: Pre-generate Themed Cards
- Build script creates multiple versions
- E.g., `Jan-bright-default.png`, `Jan-bright-dark.png`
- Fast runtime, larger bundle

#### Approach B: Runtime Palette Swap
- Load indexed PNG
- Read palette from PNG chunks
- Modify palette based on theme
- Re-encode or use canvas with modified palette

#### Approach C: Hybrid
- Ship default indexed PNGs
- Generate themed versions on-demand
- Cache in browser

**Recommendation**: Approach A for initial implementation (simpler), Approach C for future optimization.

### Phase 4: Build Pipeline

**Objective**: Automate conversion process

**Workflow**:
```
Source RGB PNGs → Quantize → Generate Metadata → Theme Generator → Output Indexed PNGs
```

**Build Script Structure**:
```javascript
// build-cards.js

1. For each source PNG:
   a. Load image
   b. Quantize to N colors
   c. Extract palette
   d. Analyze color semantics
   e. Save as indexed PNG
   f. Generate metadata JSON

2. Compile palette metadata across all cards

3. For each theme:
   a. Load indexed PNGs
   b. Apply theme mappings
   c. Save themed PNGs

4. Generate theme manifest
```

**Configuration**:
```json
{
  "colorCount": 256,
  "quantization": {
    "algorithm": "neuquant",
    "dithering": "floyd-steinberg"
  },
  "themes": ["default", "dark", "pastel", "neon"],
  "output": {
    "dir": "assets/cards",
    "format": "indexed-png",
    "naming": "{card}-{theme}.png"
  }
}
```

## Implementation Roadmap

### Week 1: Proof of Concept
- [ ] Install pngquant or sharp
- [ ] Convert all 48 cards to indexed PNG (256 colors)
- [ ] Visual quality assessment
- [ ] Measure file size savings
- [ ] Decision: 128 or 256 colors?

### Week 2: Palette Analysis
- [ ] Extract palettes from all cards
- [ ] Identify color patterns
- [ ] Create semantic color groupings
- [ ] Document palette structure per card
- [ ] Create color mapping schema

### Week 3: Theme System
- [ ] Define theme JSON format
- [ ] Create 2-3 example themes (default, dark, pastel)
- [ ] Implement palette swapping logic
- [ ] Generate themed card sets
- [ ] Test in game engine

### Week 4: Build Integration
- [ ] Create automated build script
- [ ] Add npm script: `npm run build:cards`
- [ ] Update game to load themed cards
- [ ] Add theme selector UI
- [ ] Documentation

### Week 5: Polish & Optimization
- [ ] Fine-tune color counts per card
- [ ] Optimize file sizes
- [ ] Test all themes
- [ ] User testing
- [ ] Performance profiling

## Expected Outcomes

### File Size Comparison

**Current (RGB PNG)**:
- Per card: 33-58 KB
- Total (48 cards): ~2.0 MB

**Projected (Indexed PNG, 256 colors)**:
- Per card: 12-20 KB
- Total (48 cards): ~750 KB
- **Savings: 60-65%**

**With Multiple Themes (4 themes)**:
- Total: ~3.0 MB (still smaller than unthemed RGB!)

### Quality Trade-offs

**256 colors**: Virtually no visible quality loss
**128 colors**: Minimal loss, excellent for most cards
**64 colors**: Noticeable in detailed cards (Poetry ribbons)
**32 colors**: Acceptable for simple cards (Chaff), poor for complex

**Recommendation**: Use 256 colors for Poetry/Ribbon cards, 128 for others.

## Challenges & Solutions

### Challenge 1: Inconsistent Palettes
**Problem**: Each card generates different palette
**Solution**: Use shared base palette for common colors, per-card palette for unique colors

### Challenge 2: Anti-aliasing Quality
**Problem**: Quantization can make edges look jagged
**Solution**: Use Floyd-Steinberg dithering to preserve edge smoothness

### Challenge 3: Theme Color Matching
**Problem**: Not all cards use same "red"
**Solution**: Define color ranges in palette mapping, not single indices

### Challenge 4: Gradient Banding
**Problem**: Smooth gradients show visible bands with fewer colors
**Solution**: Accept at 256 colors, or use ordered dithering

### Challenge 5: Transparent Backgrounds
**Problem**: Current cards have white backgrounds
**Solution**: Add transparency to palette index 0 if needed

## Alternative: CSS Filters

### Quick Alternative Approach
Instead of palettized PNGs, use CSS filters for theming:

```css
.card-dark-theme {
  filter: invert(1) hue-rotate(180deg);
}

.card-pastel-theme {
  filter: saturate(0.5) brightness(1.2);
}
```

**Pros**:
- No image processing needed
- Real-time switching
- Smaller implementation

**Cons**:
- Limited control
- Can't change specific colors precisely
- May look unnatural

**Verdict**: Good for quick prototyping, but palettized PNGs offer more control.

## Next Steps

### Immediate Actions

1. **Decision**: Choose quantization tool (pngquant vs sharp vs manual)
2. **Experiment**: Convert all 48 cards with different color counts
3. **Evaluate**: Visual quality assessment by stakeholders
4. **Prototype**: Create 2 example themes to validate approach

### Questions to Answer

1. What color counts should we use? (128, 256, or mixed?)
2. How many themes do we want to support?
3. Should themes be pre-generated or runtime?
4. Do we need transparent backgrounds?
5. What's the priority: file size or color flexibility?

## Resources & Tools

### Installed
- ✅ Node.js v22
- ✅ pngjs (pure JS PNG library)
- ✅ image-q (JS color quantization)

### To Install
- [ ] pngquant (CLI tool) OR
- [ ] sharp (Node.js library)

### Reference Materials
- [PNG Specification](http://www.libpng.org/pub/png/spec/1.2/PNG-Contents.html)
- [pngquant Documentation](https://pngquant.org/)
- [Color Quantization Wikipedia](https://en.wikipedia.org/wiki/Color_quantization)
- [Floyd-Steinberg Dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering)

### Test Files Generated
- `analyze-colors.js` - Analyzes color usage in PNGs
- `simple-quantize.js` - Median cut quantization demo
- `assets/test-palettized/` - Sample quantized cards (RGB format)

## Conclusion

Converting hanafuda cards to palettized PNGs is **feasible and beneficial** for your personalization goals. The main technical work involves:

1. Setting up proper indexed PNG encoding (pngquant/sharp)
2. Organizing palettes semantically
3. Creating a theme system
4. Integrating into build pipeline

The approach offers excellent control over colors with manageable implementation complexity. The 256-color indexed format provides virtually no quality loss while enabling easy theme swapping.

**Recommendation**: Proceed with pngquant for initial conversion, then build theme system once palette structure is understood.
