# Baseline estable — v1-stable-ui

**Fecha:** 19 de julio de 2026
**Commit:** `13cce5a` (main)
**Deploy en producción:** https://fa-training-platform-avcharian.vercel.app

## Por qué este punto

La app llegó a un estado estable: funcionalidad principal, permisos (RLS)
y estructura general funcionan, y el rediseño visual (Fase 1 + Fase 2
completas) mejoró significativamente respecto de la versión administrativa
original. Antes de tocar performance o seguir puliendo diseño, se congela
este estado como punto de retorno seguro.

## Qué incluye

- **Producto completo**: Resumen, Calendario, Registros, Rendimiento
  (comparar + ranking World Athletics), Salud (ciclo con rueda circular),
  Competencias (timeline), Evaluaciones, Videos, Reportes (Excel de marcas
  y de entrenamientos), Planificación (Lista como hoja de ruta + Anual
  tipo Gantt editable), modo claro/oscuro.
- **Puntaje World Athletics automático real**: coeficientes reales
  (fuente MIT github.com/jchen1/iaaf-scoring-tables), 24 pruebas
  cubiertas, se calcula solo al cargar cualquier marca, visible en todas
  las pantallas donde se muestra un resultado.
- **Rediseño UI/UX**: paleta deportiva (azul primario, naranja
  competencias), tipografía Geist, sidebar tipo Linear, Dashboard con
  KPIs, Perfil del Atleta como dashboard premium, Competencias como
  timeline, Planificación como hoja de ruta visual, formularios y tablas
  con más aire y jerarquía.

## Verificado antes de sellar este punto

- [x] Build local completo desde cero (`rm -rf .next && npm run build`) sin errores.
- [x] RLS habilitado con políticas activas en las tablas clave (plans,
      objectives, events, observations, memberships, people,
      session_feedback, wa_score_coefficients).
- [x] Datos reales presentes detrás de las 6 pantallas pedidas: cuenta de
      login del coach existe, 5 atletas activos, 14 planes cargados, 14
      competencias cargadas, 186 marcas disponibles para Reportes.
- [x] Deploy en producción coincide con este commit.

## Cómo volver a este punto si algo se rompe

```bash
git checkout release/v1-stable-ui
# o, para descartar todo lo posterior en main:
git reset --hard v1-stable-ui
git push --force origin main   # ¡ojo! reescribe el historial remoto
```

El tag `v1-stable-ui` y la rama `release/v1-stable-ui` apuntan los dos al
mismo commit (`13cce5a`) — cualquiera de los dos sirve para volver acá.

## Pendiente, no incluido en este baseline

- Performance (Prioridad 1 de la próxima tanda): auditoría de
  re-renders, queries duplicadas, fetches repetidos, memoización, cache,
  lazy loading.
- Dashboard como centro de control (Prioridad 2).
- Login con identidad deportiva más fuerte (Prioridad 3).
