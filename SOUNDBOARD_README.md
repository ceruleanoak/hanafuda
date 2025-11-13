# Hanafuda Soundboard - Debug Tool

## What Was Fixed

### The 404 Error Issue
The lose sound was getting 404 errors because of a filename mismatch:
- **AudioManager expected:** `/assets/audio/hanafuda-lose.mp3` (hyphen)
- **Actual filename was:** `hanafuda lose.mp3` (space)
- **Fixed by:** Renaming the file to `hanafuda-lose.mp3`

## How to Use the Soundboard

### 1. Start the Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000`

### 2. Access the Soundboard

Navigate to: `http://localhost:3000/soundboard.html`

### 3. If You Still See 404 Errors

**Important:** Clear your browser cache and do a hard refresh!

**Chrome/Edge:**
- Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Firefox:**
- Windows/Linux: `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**
- `Cmd + Option + R`

### 4. Restart the Dev Server

If errors persist after clearing cache:

1. Stop the dev server (`Ctrl + C`)
2. Restart with `npm run dev`
3. Navigate to `http://localhost:3000/soundboard.html`
4. Do a hard refresh

## Soundboard Features

### Play Controls
- **Play Win** - Test the victory sound
- **Play Lose** - Test the defeat sound
- **Stop** - Stop all audio playback
- **Reload** - Reload individual audio files

### Status Indicators
- 🟢 **Green** - Audio file loaded successfully
- 🟡 **Yellow** - Loading...
- 🔴 **Red** - Failed to load (404 or other error)

### Path Testing
The soundboard automatically tests multiple path variations to identify 404 errors:
- `/assets/audio/hanafuda-win.mp3` (correct path)
- `/assets/audio/hanafuda win.mp3` (space in name)
- Various other common path mistakes

This helps identify exactly which paths work and which return 404s.

### Volume Control
Adjust the volume slider to test audio at different levels.

## File Locations

### Audio Files (Production)
```
/public/assets/audio/
  ├── hanafuda-win.mp3    (41 KB)
  ├── hanafuda-lose.mp3   (122 KB) [FIXED: was "hanafuda lose.mp3"]
  └── README.md
```

### Backup Audio Files
```
/assets/
  ├── hanafuda-win.mp3
  └── hanafuda-lose.mp3
```

### Soundboard Location
```
/src/soundboard.html
```

### Audio Manager
```
/src/utils/AudioManager.js
```

## Vite Configuration

The project uses Vite with the following relevant settings:

```javascript
{
  root: 'src',                    // Serve from src/ directory
  publicDir: '../public',         // Public assets from /public
  base: '/hanafuda/',            // Base path for GitHub Pages
}
```

### How Paths Work

**Development Server:**
- Files in `/public` are served at root: `/assets/audio/hanafuda-win.mp3`
- HTML files in `/src` are served directly: `/soundboard.html`

**Production Build (GitHub Pages):**
- Base path is `/hanafuda/`
- Audio files: `/hanafuda/assets/audio/hanafuda-win.mp3`
- May need path adjustments for production

## Troubleshooting

### Still Getting 404 Errors?

1. **Check file exists:**
   ```bash
   ls -la public/assets/audio/
   ```
   Should show:
   - `hanafuda-win.mp3` (with hyphen)
   - `hanafuda-lose.mp3` (with hyphen)

2. **Verify Vite config:**
   ```bash
   cat vite.config.js
   ```
   Check that `publicDir: '../public'` is set

3. **Check dev server is running:**
   - Should see "Local: http://localhost:3000/"
   - No errors in terminal

4. **Browser developer console:**
   - Open DevTools (F12)
   - Check Console tab for specific error messages
   - Check Network tab to see exact URLs being requested

5. **Try different browser:**
   - Sometimes browser caching can be persistent
   - Try in incognito/private mode

### Error Messages Explained

- **MEDIA_ERR_SRC_NOT_SUPPORTED (Error 4):** File not found (404) or wrong format
- **MEDIA_ERR_NETWORK (Error 2):** Network error, server not responding
- **MEDIA_ERR_DECODE (Error 3):** File exists but can't be decoded (corrupted)
- **MEDIA_ERR_ABORTED (Error 1):** Loading was cancelled

## Next Steps

Once the soundboard confirms both audio files load successfully:

1. Test the main game at `http://localhost:3000/`
2. Play a game and verify sounds play on win/lose
3. Check browser console for any audio-related warnings
4. Test with audio enabled/disabled in game options

## Support

If issues persist:
1. Check this file location: `/home/user/hanafuda/SOUNDBOARD_README.md`
2. Verify all file paths match expected locations
3. Review browser DevTools Network tab for exact 404 URLs
