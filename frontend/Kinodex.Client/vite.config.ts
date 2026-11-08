import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/..." is src/ (shadcn/ui components import each other this way)
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // The first download (React, the router, Clerk, Radix, the data layer) is ~540 kB; pages,
    // Stats' charts, the barcode scanner and the Add window are separate downloads (App.tsx,
    // components/lazyComponents.tsx). Warn if any one file grows past this.
    chunkSizeWarningLimit: 600,
  },
})
