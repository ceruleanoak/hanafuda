import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get version from git commit hash, fallback to timestamp if not in git repo
function getVersion() {
  try {
    // Get short git commit hash (7 characters)
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    // Fallback to timestamp if git is not available
    return Date.now().toString();
  }
}

const version = getVersion();

export default defineConfig({
  base: '/hanafuda/', // GitHub Pages base path
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  },
  define: {
    // Inject version as a global constant
    '__APP_VERSION__': JSON.stringify(version)
  }
});
