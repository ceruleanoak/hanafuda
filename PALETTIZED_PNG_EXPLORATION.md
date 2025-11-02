# Palettized PNG Exploration for Hanafuda Cards

## Current State Analysis

### Image Specifications
- **Dimensions**: 147 x 244 pixels (35,868 pixels per card)
- **Current Format**: 8-bit/color RGB (24-bit true color)
- **Color Usage**:
  - Jan-bright.png: **3,753 unique colors**
  - Jan-chaff-1.png: **1,705 unique colors**
  - Jan-chaff-2.png: **1,568 unique colors**
  - Jan-poetry.png: **6,643 unique colors**

### Key Findings
1. Cards use significantly more colors than the 256-color limit for palettized PNGs
2. Main colors are white (~30-40%), black (~8-11%), and various themed colors (reds, greens, etc.)
3. High color count is due to:
   - Anti-aliasing around edges
   - Gradients and shading
   - Subtle color variations

## What are Palettized PNGs?

### Definition
Palettized (indexed color) PNGs store images using a **color palette** (lookup table) instead of storing RGB values for each pixel. Each pixel stores an index (0-255) pointing to a color in the palette.

### Format Details
- **Color Mode**: PNG type 3 (Indexed-color)
- **Max Colors**: 256 colors (8-bit palette)
- **Palette**: Array of RGB(A) values, up to 256 entries
- **Pixel Data**: Each pixel stores a palette index (1 byte)

### Advantages
1. **Smaller File Size**: 1 byte per pixel vs 3-4 bytes for RGB(A)
2. **Easy Color Swapping**: Change palette entry → all pixels using that color change
3. **Perfect for Limited Color Sets**: Ideal for graphics with <256 colors
4. **Transparent Color**: Can designate one palette entry as transparent

### Disadvantages
1. **Color Limitation**: Maximum 256 colors
2. **Lossy Conversion**: Requires color quantization from true color
3. **Quality Loss**: Anti-aliasing and gradients may suffer
4. **Limited Flexibility**: Can't mix unlimited colors

## Color Quantization Needed

To convert current cards (1,500-6,600 colors) to palettized format (256 colors), we need **color quantization**:

### Popular Algorithms
1. **Median Cut**: Divides color space into boxes, finds median repeatedly
2. **Octree**: Tree structure dividing RGB cube into octants
3. **K-means Clustering**: Statistical approach grouping similar colors
4. **Neuquant**: Neural network approach for high-quality quantization

### Quality Considerations
- **256 colors**: Good quality, minimal visible loss
- **128 colors**: Slight quality reduction, still acceptable
- **64 colors**: Noticeable but acceptable for simple designs
- **32 colors**: May show banding in gradients

## Implementation Options

### Option 1: Node.js Build Process (Recommended)
**Libraries:**
- `pngjs` - Pure JS PNG encoder/decoder
- `quantize` or `image-q` - Color quantization algorithms
- `sharp` - High-performance image processing (requires native deps)

**Workflow:**
```
Original PNG → Load → Quantize Colors → Build Palette → Encode Indexed PNG
```

**Pros:**
- Full control over palette generation
- Can optimize palette across all cards
- Can include palette editing tools
- Works in build pipeline

**Cons:**
- Requires Node.js tooling
- More complex implementation

### Option 2: CLI Tools (ImageMagick/pngquant)
**Tools:**
- `pngquant` - Best-in-class PNG quantization
- `ImageMagick` - General image processing
- `optipng` - PNG optimization

**Example:**
```bash
pngquant --quality=80-100 --speed 1 --ncolors 256 input.png
```

**Pros:**
- Simple, proven tools
- Excellent quality
- Fast processing

**Cons:**
- Less control over palette
- Harder to customize colors
- External dependency

### Option 3: Browser-Based Quantization
**Libraries:**
- `image-q` - JS color quantization (works in browser)
- Canvas API for pixel manipulation

**Pros:**
- No server/build step needed
- User can personalize in real-time

**Cons:**
- Slower performance
- Limited by browser capabilities
- Larger JS bundle

## Personalization Strategy

### Color Mapping Approach
1. **Define Semantic Colors**:
   - Background (white)
   - Outlines (black)
   - Primary theme color (red for Jan-bright)
   - Secondary colors (various greens, yellows)

2. **Create Color Groups**:
   - Group similar colors in palette
   - Assign semantic meaning to palette ranges
   - E.g., indices 0-15 = reds, 16-31 = greens, etc.

3. **Palette Swapping**:
   - User selects theme colors
   - Remap palette indices to new colors
   - Maintain luminance relationships

### Configuration Format
```json
{
  "themes": {
    "default": {
      "background": "#FFFFFF",
      "outline": "#000000",
      "primary": "#ED3D25",
      "accent": "#2E5C1E"
    },
    "dark": {
      "background": "#1A1A1A",
      "outline": "#FFFFFF",
      "primary": "#FF4444",
      "accent": "#44FF44"
    }
  }
}
```

## Recommended Implementation Plan

### Phase 1: Analysis & Testing
1. ✅ Analyze current color usage (DONE)
2. Test quantization with different color counts (64, 128, 256)
3. Evaluate visual quality at each level
4. Identify optimal color count per card type

### Phase 2: Build Quantization Pipeline
1. Choose quantization library (`image-q` or `pngquant`)
2. Create build script to convert all cards
3. Generate palette metadata for each card
4. Preserve palette consistency across similar cards

### Phase 3: Palette Optimization
1. Analyze palettes across all cards
2. Identify common colors (black, white, etc.)
3. Create semantic color mapping
4. Document palette structure

### Phase 4: Personalization System
1. Define color theme schema
2. Create palette remapping logic
3. Build theme configuration file
4. Add real-time preview (optional)

### Phase 5: Export/Integration
1. Update card loading to handle indexed PNGs
2. Add theme selection UI
3. Implement dynamic palette swapping
4. Test across all cards

## Technical Challenges

### 1. Anti-Aliasing Quality
- **Problem**: AA creates many intermediate colors
- **Solution**: Use dithering or error diffusion to preserve edges
- **Trade-off**: May introduce patterns/noise

### 2. Gradient Preservation
- **Problem**: Smooth gradients need many colors
- **Solution**: Accept banding or use higher color count (256)
- **Trade-off**: Fewer "theme" colors available

### 3. Consistent Palettes
- **Problem**: Each card has different colors
- **Solution**:
  - Use per-card palettes (more colors per card)
  - OR shared palette (easier theming, may lose quality)

### 4. Transparent Backgrounds
- **Problem**: Currently white, may want transparent
- **Solution**: Add alpha channel during quantization
- **Impact**: Requires PNG type 6 (truecolor + alpha) OR palette + tRNS chunk

## Next Steps

1. **Experiment**: Create test script to quantize one card at different color counts
2. **Compare**: Visual side-by-side comparison of quality
3. **Decide**: Choose optimal color count and quantization method
4. **Prototype**: Build basic palette swapping proof-of-concept
5. **Validate**: Ensure approach works for personalization goals

## Tools to Install

For experimentation:
```bash
# Pure JavaScript approach
npm install image-q pngjs

# Or CLI tools (if available)
apt-get install pngquant imagemagick
```

## Resources

- [PNG Specification](http://www.libpng.org/pub/png/spec/1.2/PNG-Contents.html)
- [pngquant Documentation](https://pngquant.org/)
- [image-q Library](https://github.com/ibezkrovnyi/image-quantization)
- [Color Quantization Algorithms](https://en.wikipedia.org/wiki/Color_quantization)
