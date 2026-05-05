/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['cubejs'],
    rolldownOptions: {
      plugins: [
        {
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
        },
      ],
    },
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
