import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본값: 각 hook에서 개별 설정이 우선됨
            staleTime: 30 * 1000, // 기본 30초 (보수적 설정)
            gcTime: 5 * 60 * 1000, // 기본 5분
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
} 