import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    root: resolve(__dirname, '../src/renderer'),
    build: {
        outDir: resolve(__dirname, '../dist-renderer')
    },
    server: {
        port: 5174
    }
})