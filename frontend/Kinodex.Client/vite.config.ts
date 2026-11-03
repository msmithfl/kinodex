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
})
