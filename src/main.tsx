import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from '@/app/App';
import { queryClient } from '@/app/query-client';
import { AuthProvider } from '@/features/auth/AuthContext';
import '@/styles/app.css';
import '@/styles/figma-refresh.css';

const showQueryDevtools = import.meta.env.DEV && import.meta.env.VITE_SHOW_QUERY_DEVTOOLS === 'true';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
      {showQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  </React.StrictMode>,
);
