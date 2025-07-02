'use client';

import { QueryClient, QueryClientProvider, HydrationBoundary } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React, { useState } from 'react';

/**
 * Proveedor global de TanStack Query que aporta caché de datos y rehidratación.
 * Se coloca en el root layout para que toda la aplicación (client components)
 * pueda beneficiarse de React Query sin sacrificar RSC.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  // Crear un único QueryClient por sesión de navegador
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary>{children}</HydrationBoundary>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
} 