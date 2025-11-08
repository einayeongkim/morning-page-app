import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // [CPO 최종 수정 1]
  // 빌드 타겟을 'esnext' (최신)로 설정하여 'es2015' 경고를 해결합니다.
  build: {
    target: 'esnext' 
  },

  // [CPO 최종 수정 2]
  // Vercel의 환경 변수(process.env.VITE_...)를
  // __SUPABASE_URL__ 라는 새로운 '전역 변수'로 코드에 주입합니다.
  define: {
    '__SUPABASE_URL__': `"${process.env.VITE_SUPABASE_URL}"`,
    '__SUPABASE_KEY__': `"${process.env.VITE_SUPABASE_KEY}"`,
  },
});
