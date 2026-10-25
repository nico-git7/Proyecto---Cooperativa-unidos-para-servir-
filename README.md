# Estacionamiento Solidario · San Miguel de Tucumán

App y software de gestión del **Estacionamiento Medido Solidario**, la propuesta de las Cooperativas de Trabajo **APARKAR LTDA** y **UNIDOS PARA SERVIR** para modernizar el estacionamiento medido de la ciudad, integrando la tecnología con la inclusión socio-laboral de sus trabajadores/as.

Es un **prototipo funcional**: se puede usar de punta a punta con datos de demostración, y sirve como base para la validación técnica con el Clúster Tecnológico Tucumán.

## Qué hace

La misma app (web, instalable en el celular) tiene tres perfiles:

| Perfil | Funciones |
|---|---|
| **Conductor/a** | Registro, vehículos (patentes), saldo y cargas, estacionar indicando el código de cuadra, cronómetro y costo en vivo, finalizar y pagar, historial. Ve qué trabajador/a cuida su cuadra. |
| **Trabajador/a cooperativista** | Inicio y fin de jornada (registro de horario), consulta de patente (¿pagó o no?), cobro en efectivo a quien no usa la app, cierre y cobro según el tiempo real, actas de infracción, resumen del día y efectivo a rendir. |
| **Administración** | Panel con recaudación (hoy, mes, últimos 7 días por medio de pago), ocupación por zona, vehículos en vivo, trabajadores/as (altas, bajas, horas, recaudación, rendición de efectivo), cuadras y asignaciones, tarifas por zona, validación de actas, configuración de reglas de cobro y de la distribución de lo recaudado, exportación CSV. |
| **Público** | Portal de transparencia: cuánto se recaudó en el mes y cómo se distribuye (trabajadores/as, municipio, fondo solidario, tecnología). |

### Reglas de cobro

- Tarifa por hora según la zona (Microcentro, Barrio Norte, Centro Sur).
- Mínimo de 30 minutos y luego por fracción de 15 minutos (configurable).
- Se paga al finalizar: por app se descuenta del saldo; en efectivo lo cobra el trabajador/a y queda como “efectivo a rendir”.
- Una patente no puede tener dos estacionamientos en curso a la vez.
- Las mismas reglas corren en el servidor y en el navegador (`server/reglas.js`).

## Cómo correrla

Requisitos: **Node.js 22.5 o superior** (usa la base SQLite que viene incluida en Node; no hay que instalar una base de datos).

```bash
npm install
npm start
```

Abrir <http://localhost:3000>. La primera vez se crea la base `data/estacionamiento.db` con datos de demostración.

### Usuarios de demostración

Contraseña de todos: `demo1234` (en la pantalla de inicio hay botones para entrar directo).

| Email | Perfil |
|---|---|
| `conductor@demo.com` | Conductora con saldo y dos vehículos |
| `trabajador@demo.com` | Ramón Díaz, APARKAR LTDA, cuadras San Martín 500 y 600 |
| `admin@demo.com` | Administración de las cooperativas |

Otros comandos:

```bash
npm run seed   # borra la base y regenera los datos de demostración
npm test       # tests de reglas de cobro y de la API
npm run dev    # reinicia el servidor al guardar cambios
```

Variables de entorno: `PORT` (por defecto 3000), `DB_PATH` (ruta de la base), `DEMO=0` (oculta los accesos de demostración).

## Estructura

```
server/
  index.js        servidor Express y armado de la API
  db.js           esquema SQLite y parámetros
  reglas.js       reglas de negocio puras (cobro, patentes, distribución) — compartidas con el navegador
  servicios.js    operaciones: iniciar/finalizar estacionamiento, consultar patente
  auth.js         contraseñas (scrypt) y sesiones por token
  seed.js         datos de demostración (calles reales, nombres y patentes ficticios)
  routes/         publico.js · conductor.js · trabajador.js · admin.js
public/           app web (HTML/CSS/JS sin compilación), instalable como PWA
test/             tests con node:test
prototipos/       prototipos visuales para presentar el proyecto
```

## Próximos pasos (a validar con el Clúster)

- Integrar una pasarela de pago real para la carga de saldo (hoy está **simulada**).
- Cartel con código QR en cada cuadra para estacionar escaneando.
- Envío de actas validadas al sistema municipal de tránsito.
- Mapa de cuadras con disponibilidad en tiempo real.
- Notificaciones al conductor/a (tiempo transcurrido, saldo bajo).
- Recibo digital y facturación.
- Despliegue en un servidor con HTTPS, copias de seguridad y monitoreo.
- Programa de capacitación digital para los asociados/as.

---

Tarifas, porcentajes de distribución, nombres y patentes de la demo son **valores de ejemplo**.
