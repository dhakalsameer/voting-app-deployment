import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts")) return "vendor-recharts";
          if (id.includes("node_modules/jspdf")) return "vendor-pdf";
          if (id.includes("node_modules/html2canvas")) return "vendor-pdf";
        },
      },
    },
  },
  define: {
    // Some libs (merkletreejs, etc.) reference the Node `global` variable.
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Provide browser-friendly implementations for Node built-ins so
      // merkletreejs / keccak256 / readable-stream don't get externalized.
      buffer: 'buffer',
      events: 'events',
      util: 'util',
    },
  },
  optimizeDeps: {
    // Pre-bundle these so the dev server doesn't complain about externalized modules.
    include: ['buffer', 'events', 'util', 'merkletreejs', 'keccak256'],
  },
})
