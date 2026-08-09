import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('liteshade-'),
        },
      },
    }),
  ],
  server: {
    port: 5401,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3401',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@r2wc/react-to-web-component',
      '@jeffgo10/helpers/brand',
      '@jeffgo10/helpers/text',
      '@jeffgo10/helpers/ui',
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/**/*.{spec,test}.ts'],
    },
  },
});
