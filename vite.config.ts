import { defineConfig, build as viteBuild } from 'vite';
import { resolve } from 'path';
import { copyFileSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';

// ─── Plugin: Post-build cleanup & asset copying ────────────────────────────────
function chromeExtensionPostBuild() {
  return {
    name: 'chrome-extension-post-build',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');

      // Move popup.html from dist/src/popup/ to dist/ (if nested)
      const nestedHTML = resolve(distDir, 'src', 'popup', 'popup.html');
      const targetHTML = resolve(distDir, 'popup.html');
      if (existsSync(nestedHTML)) {
        let html = readFileSync(nestedHTML, 'utf-8');
        html = html.replace(/(?:\.\.\/)+/g, './');
        writeFileSync(targetHTML, html);
        rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
      }

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      );

      // Copy icons
      const iconsSource = resolve(__dirname, 'public', 'icons');
      const iconsDest = resolve(distDir, 'icons');
      if (!existsSync(iconsDest)) {
        mkdirSync(iconsDest, { recursive: true });
      }
      if (existsSync(iconsSource)) {
        for (const file of readdirSync(iconsSource)) {
          copyFileSync(
            resolve(iconsSource, file),
            resolve(iconsDest, file)
          );
        }
      }

      // Clean up empty chunks dir if no chunks remain
      const chunksDir = resolve(distDir, 'chunks');
      if (existsSync(chunksDir)) {
        const files = readdirSync(chunksDir);
        if (files.length === 0) {
          rmSync(chunksDir, { recursive: true, force: true });
        }
      }
    },
  };
}

// ─── Main Config ───────────────────────────────────────────────────────────────
// We use a custom build process:
//  1. Popup: ES module (popup.html can use <script type="module">)
//  2. Background: ES module (service worker with "type": "module" in manifest)
//  3. Content Script: IIFE — must be self-contained, no imports
//
// Vite's single build cannot mix formats, so we build the content script
// separately in the closeBundle hook.

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'popup') return 'popup.js';
          if (chunkInfo.name === 'background') return 'background.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'popup.css';
          return 'assets/[name]-[hash][extname]';
        },
        format: 'es',
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@background': resolve(__dirname, 'src/background'),
    },
  },
  plugins: [
    {
      name: 'build-content-script-iife',
      async closeBundle() {
        // Build content script as a separate IIFE bundle (no ES imports)
        await viteBuild({
          configFile: false,
          build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: false, // Don't wipe the existing build
            minify: 'esbuild',
            lib: {
              entry: resolve(__dirname, 'src/content/content.ts'),
              name: 'ZeroDelayContent',
              formats: ['iife'],
              fileName: () => 'content.js',
            },
            rollupOptions: {
              output: {
                // Ensure everything is inlined
                inlineDynamicImports: true,
              },
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
              '@content': resolve(__dirname, 'src/content'),
            },
          },
        });
      },
    },
    chromeExtensionPostBuild(),
  ],
});
