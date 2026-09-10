# Maestro de clientes

Generado con la skill `axiom-app`. Sigue las convenciones de la casa.

```bash
npm install
npm run dev
```

## Estructura

- `src/app/` — arranque, providers, rutas y layout
- `src/features/<dominio>/` — una carpeta por dominio: `api`, `pages`, `components`, `types`
- `src/shared/` — lo transversal: cliente HTTP, store, permisos, i18n, tema, UI

## Reglas

- Permisos con catálogo cerrado en `shared/auth/permissions.ts`, verificados con `useCan()`.
- El manejo de 401 y 5xx vive solo en `shared/api/client.ts`.
- Textos por `useT()`, nunca cadenas sueltas en el JSX.
- Si un componente lo usan dos features, sube a `shared/ui`.
