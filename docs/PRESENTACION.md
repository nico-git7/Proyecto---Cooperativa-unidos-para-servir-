# Guion para el stand

## Antes de abrir

- [ ] Sitio en línea y con HTTPS: abrir la URL desde un celular con datos móviles (no del Wi-Fi de la facultad).
- [ ] Probar que llega el correo: hacer una denuncia de prueba con un correo propio.
- [ ] Imprimir el cartel con QR: intranet → **Cartel con QR** → Imprimir. Dejarlo a la vista en el stand.
- [ ] Notebook con dos ventanas: la intranet logueada como **administrador (10001)** en el Panel y la Comisaría Virtual al lado.
- [ ] Una pestaña con la denuncia de ejemplo ya abierta en el detalle, por si falla la conexión.
- [ ] Cargador, zapatilla y hotspot del celular como respaldo de internet.

## Recorrido de 5 minutos

**1. El problema (30 s).** Hoy para denunciar un hurto o el extravío del DNI hay que ir a la comisaría y esperar. Del lado policial, las denuncias quedan en papel o en planillas, sin estadísticas ni seguimiento para quien denunció.

**2. La Comisaría Virtual (1 min).** Mostrar la portada: qué se puede denunciar, el aviso de que las emergencias van al 911. Invitar a la persona a escanear el QR y hacer una denuncia desde su celular:

- elige el tipo de hecho;
- marca el lugar en el mapa: aparece la **jurisdicción estimada**;
- carga sus datos y el correo, acepta la declaración jurada y envía.

**3. El aviso en tiempo real (30 s).** En la notebook, el panel muestra al instante «Nueva denuncia N° …» sin recargar. Abrir el aviso.

**4. La gestión (1 min 30 s).** En el detalle:

- designar instructor (se ve la carga de causas de cada efectivo);
- pasar a «En investigación»;
- escribir una nota y tildar «Informar al denunciante».

Pedirle a la persona que mire su correo: le llegó la constancia y la novedad. En su celular, **Consultar estado** con el código y el DNI muestra los movimientos.

**5. La mirada de gestión (1 min).** Volver al Panel: indicadores, evolución diaria, tipos de hecho, franja horaria. Mostrar el **Mapa del delito** y, si preguntan por seguridad, **Auditoría**: quién hizo qué y desde dónde, y la bandeja de correos.

**6. Cierre (30 s).** Mostrar que entrando como jefe de la Seccional 1ª (20001) solo se ven las denuncias de esa dependencia. Mencionar el stack y el despliegue en un VPS propio con Docker.

## Preguntas frecuentes

**¿Qué tecnologías usa?** C# con ASP.NET Core 8 y Entity Framework para la API, PostgreSQL, React con Vite y TypeScript para la web, SignalR para el tiempo real, un microservicio en Node con Nodemailer para los correos, Docker y Nginx en un VPS.

**¿Cómo sabe a qué comisaría va la denuncia?** Calcula la distancia entre el punto marcado y cada dependencia que recibe denuncias (fórmula de Haversine) y elige la más cercana. Si no se marcó el mapa, usa la localidad. La jefatura puede derivarla si corresponde a otra jurisdicción.

**¿Qué pasa si alguien hace una denuncia falsa?** El formulario es una declaración jurada (art. 245 del Código Penal), queda registrada la IP y la dependencia puede desestimarla con fundamento.

**¿Es seguro?** Sesión con JWT en cookie HttpOnly, contraseñas con PBKDF2, bloqueo por intentos fallidos, permisos por dependencia aplicados en el servidor, validación real de los archivos, límites de uso y auditoría de cada operación.

**¿Y si no llega el correo?** La denuncia se guarda igual. Los correos quedan en una bandeja de salida y se reintentan solos; el estado se ve en Auditoría → Correos.

**¿Cuánto cuesta mantenerlo?** Un VPS de 4 GB (del orden de 10 USD por mes) alcanza para la demo y una prueba piloto. Todo el software usado es libre.

**¿Qué falta para usarlo de verdad?** Integración con el sistema de la Fiscalía y del Ministerio Público, firma digital de las actuaciones, validación de identidad con RENAPER, carga de las dependencias reales y un piloto en una unidad regional.
