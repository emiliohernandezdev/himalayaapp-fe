import { defineConfig, type Plugin } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const privateMuiPrefix = 'x9'

function hardenProductionBundle(): Plugin {
  return {
    name: 'harden-production-bundle',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'chunk') {
          asset.code = asset.code.replace(/\bMui(?=[A-Z-])/g, privateMuiPrefix)
          continue
        }

        if (
          typeof asset.source === 'string' &&
          /\.(css|js)$/.test(asset.fileName)
        ) {
          asset.source = asset.source.replace(/\bMui(?=[A-Z-])/g, privateMuiPrefix)
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    hardenProductionBundle(),
  ],
  build: {
    minify: 'oxc',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
})
