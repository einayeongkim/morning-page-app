import React from 'react';
import ReactDOM from 'react-dom/client';
// PO님의 '진짜' 앱 코드를 불러옵니다.
import App from './App.tsx'; 
// (Vite가 Tailwind CSS를 처리할 수 있도록 package.json에 관련 도구가 있습니다)

// index.html의 'root' div에 App 컴포넌트를 렌더링합니다.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
