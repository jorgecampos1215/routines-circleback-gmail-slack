import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa para poder servir el build desde cualquier ruta (artifact, Netlify, etc.)
export default defineConfig({ plugins: [react()], base: './' })
