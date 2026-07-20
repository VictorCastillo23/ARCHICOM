# Contribuir a Vitrina

## Flujo de staging: Vercel Preview Deployments

Este proyecto **no tiene una rama ni un entorno de staging separado**. Vercel genera automáticamente un **preview deployment** por cada PR/rama al hacer push; esa URL de preview es el paso de staging de facto del proyecto — ahí se hace la validación manual (QA) antes de mergear a `main`.

No crees una rama `staging` ni un entorno adicional para esto: usa el preview de la PR.

## Git hooks locales

El repo usa `husky` + `lint-staged` para feedback rápido antes de llegar a CI:

- **pre-commit**: corre `lint-staged` (ESLint `--fix`) solo sobre los archivos `*.{ts,tsx}` en stage.
- **pre-push**: corre `tsc --noEmit && pnpm test` (typecheck + Vitest) antes de permitir el push.

Se instalan solos al correr `pnpm install` (script `prepare`). CI (`lint`/`typecheck`/`test`/`build`) sigue siendo la fuente de verdad — los hooks son un pre-flight local, no un reemplazo, incluso si alguien usa `--no-verify`.
