import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  // single instance per app
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본적으로 1분간 신선한 데이터로 간주
            staleTime: 1 * 60 * 1000,
            // 기본적으로 5분간 메모리에 보관
            gcTime: 5 * 60 * 1000,
            // 재시도 설정
            retry: 1,
            // 에러 발생 시 재시도 전 대기 시간
            retryDelay: 1000,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
} 