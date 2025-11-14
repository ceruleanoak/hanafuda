# Animation Fix Summary

**Issue**: Opponent drawn card with no match animated erratically with multiple conflicting movements

**Root Cause**: Animation logic was triggering before the card arrived at the drawnCard zone, causing animation interruption

**Solution**: Restructured `opponentDrawPhase()` to sequence animations properly:

1. **Draw card** → enters drawnCard zone
2. **Wait 850ms** → allows deck→drawnCard animation to complete
3. **Show card briefly** (550ms delay)
4. **Move to field** → drawnCard→field animation

**Key Changes**:
- Wrapped match-checking logic in 850ms setTimeout
- This ensures card is fully visible at drawnCard before processing
- Timing now matches player draw (850ms + 550ms = 1400ms total)

**Result**: Smooth two-stage animation with consistent player/opponent timing

**Files Modified**: `src/game/Sakura.js` - opponentDrawPhase method

**Build Status**: ✅ Passing
