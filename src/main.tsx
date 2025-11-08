import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // PO님의 '진짜' App.tsx를 불러옵니다.

// index.html의 'root' div에 App 컴포넌트를 렌더링합니다.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
