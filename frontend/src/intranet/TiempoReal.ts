import { useEffect, useState } from 'react';
import { createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { nombreTipo, PRIORIDADES } from '@/api/etiquetas';
import type { AvisoDenuncia } from '@/api/tipos';
import { useNotificaciones } from '@/componentes/Notificaciones';

/** Conexión SignalR con el hub de novedades: avisa las denuncias nuevas y refresca las vistas abiertas. */
export function useTiempoReal() {
  const [conectado, setConectado] = useState(false);
  const queryClient = useQueryClient();
  const { notificar } = useNotificaciones();
  const navegar = useNavigate();

  useEffect(() => {
    const conexion = new HubConnectionBuilder()
      .withUrl('/hubs/novedades')
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    const refrescar = (id?: number) => {
      void queryClient.invalidateQueries({ queryKey: ['denuncias'] });
      void queryClient.invalidateQueries({ queryKey: ['panel'] });
      void queryClient.invalidateQueries({ queryKey: ['mapa'] });
      if (id) void queryClient.invalidateQueries({ queryKey: ['denuncia', id] });
    };

    conexion.on('denunciaRegistrada', (aviso: AvisoDenuncia) => {
      refrescar();
      const prioridad = PRIORIDADES[aviso.prioridad]?.nombre ?? aviso.prioridad;
      notificar(`Nueva denuncia N° ${aviso.numero}`, {
        duracion: 10_000,
        texto: createElement('span', null,
          `${nombreTipo(aviso.tipo)} · prioridad ${prioridad.toLowerCase()}`,
          createElement('br'),
          `${aviso.dependencia ?? 'Sin jurisdicción'} · ${aviso.origen === 'Web' ? 'Comisaría Virtual' : 'Presencial'} · `,
          createElement('a', {
            href: `/intranet/denuncias/${aviso.id}`,
            onClick: (e: { preventDefault: () => void }) => { e.preventDefault(); navegar(`/intranet/denuncias/${aviso.id}`); },
          }, 'Abrir'),
        ),
      });
    });

    conexion.on('denunciaActualizada', (aviso: AvisoDenuncia) => refrescar(aviso.id));
    conexion.onreconnecting(() => setConectado(false));
    conexion.onreconnected(() => setConectado(true));
    conexion.onclose(() => setConectado(false));

    let activa = true;
    conexion.start().then(() => activa && setConectado(true)).catch(() => setConectado(false));

    return () => {
      activa = false;
      void conexion.stop();
    };
  }, [queryClient, notificar, navegar]);

  return conectado;
}
