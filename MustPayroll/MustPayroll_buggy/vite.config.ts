import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.PAYROLL_API_PORT ?? '4175'}` },
  },
});
