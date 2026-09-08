import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      // 백엔드(localhost:3000)는 CORS가 열려있지 않으므로,
      // dev 서버에서 /api로 들어온 요청을 백엔드로 프록시해 우회한다.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
      },
      // 업로드된 게시글 이미지 등, 백엔드가 ServeStaticModule로 그대로
      // /public/* 경로에 내려주는 정적 파일. prefix가 동일해 rewrite 불필요.
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
