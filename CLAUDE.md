# CLAUDE.md — Maestro de clientes (frontend)

Reglas de este repo. Leerlas antes de cambiar código.

## Idioma

El código va en inglés: componentes, funciones, variables, tipos,
comentarios y nombres de tests.

La copia que ve el usuario va en español.

Las claves JSON que ya devuelve el backend se consumen tal cual
(`razon_social`, `estado_verificacion`, `cliente_codigo`). No se inventan
nombres nuevos en español.

## Alcance

Pantalla del Maestro. Las listas, el riesgo, la bandeja y el informe
verificable son de Prevención y no se construyen aquí.

La consola no pide la URL ni la API key de Blackbox. Esa conexión es del
backend, está en el `.env` y vale para todas las empresas.

Cada pantalla y cada botón consultan un permiso del catálogo. Si el rol no
lo tiene, la acción no se muestra.

## Proceso

- No hay commit ni push salvo pedido explícito.
- El typecheck se corre en este directorio (`npm run typecheck`).
- Si cambia un flujo visible, hay que recorrerlo en el navegador. Si la API
  o Vite están apagadas, decir qué no se pudo abrir.
