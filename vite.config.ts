/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const fixCubejsThis = {
  name: 'fix-cubejs-this',
  transform(code: string, id: string) {
    if (/cubejs[/\\]lib[/\\]solve\.js/.test(id)) {
      return {
        code: code.replace(
          "Cube = this.Cube || require('./cube')",
          "Cube = require('./cube')",
        ),
      }
    }
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), fixCubejsThis],
  optimizeDeps: {
    include: ['cubejs'],
    rolldownOptions: {
      plugins: [fixCubejsThis],
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
