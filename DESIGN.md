# DESIGN.md — Campus Inteligente

## Propósito

Campus Inteligente es el portal digital de la comunidad de la Universidad
Nacional de Rafaela (UNRaf). La interfaz debe sentirse institucional, actual,
clara y cercana. Debe ayudar a estudiantes, docentes y personal administrativo
a resolver tareas cotidianas sin distraerlos con elementos decorativos.

La identidad visual toma como referencia el carácter contemporáneo de una
universidad pública y la identidad existente del proyecto. No presentar los
colores de esta aplicación como una paleta oficial de UNRaf si no fueron
validados por la universidad.

La web de [PIVOT DevStudio](https://pivotweb.com.ar/) sirve como referencia de
jerarquía tipográfica, contraste y presentación visual cuidada. Adaptar esos
recursos a tareas universitarias: priorizar orientación, horarios, materias y
acciones claras; reservar el movimiento para dar contexto o respuesta. Evitar
efectos 3D pesados en pantallas de uso frecuente o móvil, y no reutilizar sus
marca, textos ni recursos gráficos.

## Principios

- Priorizar legibilidad y orientación: cada pantalla debe indicar dónde está el
  usuario, qué información importa y cuál es el siguiente paso.
- Mantener patrones comunes entre el espacio estudiantil, docente y de
  administración.
- Usar color para jerarquía y estados, no como decoración indiscriminada.
- Diseñar primero para celular, donde se consultan horarios, QR y mapa.
- Usar lenguaje directo, inclusivo y natural para la comunidad universitaria.

## Colores

La implementación base está definida en `frontend/src/index.css` mediante el
tema de Tailwind. Reutilizar estas variables en vez de introducir colores
aislados.

| Token | Valor | Uso |
| --- | --- | --- |
| `ink` | `#30383a` | Texto principal, títulos y superficies oscuras |
| `paper` | `#f4f7f6` | Fondo general y superficies secundarias |
| `cobalt` | `#48aeb0` | Acción principal, enlaces activos y acento turquesa |
| `cobalt-strong` | `#256b6d` | Texto y botones turquesa que requieren contraste AA sobre blanco |
| `cobalt-soft` | `#e0f2f1` | Selección, fondos de iconos y estados suaves |
| `signal` | `#1f9d55` | Confirmaciones y estados positivos |
| `signal-soft` | `#e3f5ea` | Fondo de confirmaciones |
| `amber` | `#d4a92f` | Atención y acento secundario |
| `amber-soft` | `#fbf5df` | Fondo de avisos |
| `brick` | `#c0392b` | Errores y acciones destructivas |
| `brick-soft` | `#fbe8e5` | Fondo de errores |

Usar el tono fuerte accesible para texto y botones con etiqueta blanca; reservar
`cobalt` para acentos gráficos y `cobalt-soft` con texto oscuro para fondos suaves.
No comunicar éxito, error o estado pendiente
solo mediante color: acompañar el color con una etiqueta, icono o texto.

## Tipografía

- **Manrope** (`font-display`): encabezados, cifras destacadas y nombres de
  secciones.
- **DM Sans** (`font-sans`): texto general, controles, tablas y ayudas.
- Mantener títulos breves y jerarquías claras. Reservar mayúsculas y tracking
  amplio para etiquetas pequeñas, no para párrafos.
- Evitar texto de bajo contraste y tamaños menores a 12 px en información
  esencial.

## Estructura y espaciado

- Usar un contenedor centrado, normalmente `max-w-7xl`, con padding horizontal
  adaptable (`px-4`, `sm:px-6`, `lg:px-8`).
- Separar secciones con espacio consistente; agrupar contenido relacionado en
  tarjetas blancas sobre el fondo `paper`.
- Tarjetas con borde sutil, esquinas amplias (`rounded-2xl` o `rounded-3xl`) y
  sombra discreta. Evitar acumular bordes, sombras y fondos de color en una misma
  superficie.
- Mantener una acción principal visible por bloque. Las acciones secundarias
  deben tener menor peso visual.

## Componentes

Los componentes comunes viven en `frontend/src/components/ui.tsx`: `Button`,
`Card`, `Tabs`, `Drawer`, `Skeleton`, `EmptyState` y `Stat`. Los avisos globales
se muestran mediante `ToastProvider`; `useToast` se importa desde
`frontend/src/components/toast.ts`.

### Navegación

- Reutilizar `AppHeader` en las pantallas autenticadas.
- Mantener el nombre Campus y la referencia a UNRaf visibles.
- Marcar claramente la sección actual y permitir desplazamiento horizontal de
  la navegación en pantallas pequeñas.

### Botones y enlaces

- Usar botones redondeados, con etiquetas que describan el resultado de la
  acción (por ejemplo, “Descargar agenda”).
- Estados hover, foco, deshabilitado y carga deben ser perceptibles.
- Reservar `ink` para acciones neutras destacadas y `cobalt` para la acción
  primaria de contexto.

### Formularios

- Cada campo tiene etiqueta persistente; el placeholder no reemplaza la
  etiqueta.
- Mostrar validación y errores junto al campo correspondiente.
- Mantener controles cómodos para tocar y un foco visible al navegar con
  teclado.

### Información y estados

- En horarios, asistencia, comunicados y solicitudes, ordenar primero el dato
  que responde la pregunta principal del usuario.
- Diseñar estados de carga, error, vacío y éxito; usar mensajes concretos y una
  acción de recuperación cuando sea posible.
- Presentar fechas y horas con formato local argentino cuando corresponda.

## Reglas por sección

- **Inicio y paneles:** destacar la próxima clase, avisos y accesos frecuentes;
  no competir con varios bloques hero.
- **Asistencia:** mostrar porcentaje o estado con su contexto y evitar depender
  únicamente de gráficos.
- **QR:** mantener el código despejado, con buen contraste y espacio alrededor;
  dejar clara su vigencia y el resultado del escaneo.
- **Mapa:** distinguir edificios y destinos con etiquetas legibles; los
  recorridos deben conservar contraste y no ocultar controles del mapa.
- **Administración:** priorizar tablas y formularios claros, filtros visibles,
  confirmación de acciones y estados comprensibles.
- **Oferta académica:** permitir encontrar carreras y materias con rapidez,
  vincular los planes con su fuente oficial y distinguir los datos de referencia
  de las comisiones y horarios que administra el campus.

## Responsive y accesibilidad

- Verificar anchos móviles, tablet y escritorio; evitar scroll horizontal de
  página.
- Mantener objetivos táctiles de al menos 44 × 44 px cuando sea posible.
- Usar HTML semántico, etiquetas accesibles, `aria-label` solo cuando haga
  falta y foco de teclado visible.
- Mantener contraste legible y no usar solo color para transmitir información.
- Respetar `prefers-reduced-motion`; las transiciones deben ser breves y
  funcionales.

## Evitar

- Introducir una segunda paleta o tipografía sin una necesidad de producto.
- Repetir tarjetas para todo cuando una lista o una tabla sea más clara.
- Usar gradientes, animaciones, sombras fuertes o emojis como sustituto de una
  jerarquía visual clara.
- Cambiar el comportamiento de negocio al realizar un ajuste puramente visual.

## Guía para cambios de interfaz

Antes de agregar una pantalla o componente, reutilizar los tokens y patrones
existentes de `frontend/src/index.css` y `frontend/src/components`. Mantener
intacta la lógica de autenticación, permisos, API y navegación salvo que el
cambio solicitado también requiera modificarla.
