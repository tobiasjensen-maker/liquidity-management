import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/liquidity-management/',
  plugins: [react()],
  css: {
    transformer: 'postcss',
  },
  build: {
    cssMinify: false,
  },
})
