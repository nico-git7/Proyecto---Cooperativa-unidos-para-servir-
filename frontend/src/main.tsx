import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/encode-sans/600.css';
import '@fontsource/encode-sans/700.css';
import '@fontsource/encode-sans/800.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto-mono/500.css';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/publico.css';
import './estilos/intranet.css';
import './estilos/impresion.css';
import { ErrorApi } from './api/cliente';
import { App } from './App';
import { ProveedorNotificaciones } from './componentes/Notificaciones';
import { ProveedorSesion } from './intranet/sesion/ContextoSesion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (intentos, error) => !(error instanceof ErrorApi && error.status > 0 && error.status < 500) && intentos < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProveedorNotificaciones>
        <ProveedorSesion>
          <App />
        </ProveedorSesion>
      </ProveedorNotificaciones>
    </QueryClientProvider>
  </StrictMode>,
);
