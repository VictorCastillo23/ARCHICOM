# Archicom — Plan de tests y resultados (admin-capa5)

## Fecha: 2026-06-04

---

## §1 — Separación de roles

| # | Actor | Acción | Esperado | Resultado |
|---|-------|--------|----------|-----------|
| 1.1 | María (usuario) | PATCH pub de Carlos | 404 not_found (RLS filtra) | ✅ PASS — HTTP 404 |
| 1.1b | María | DELETE pub de Carlos | RLS silencioso, dato intacto | ✅ PASS — HTTP 200, pub sigue existiendo |
| 1.2 | María | GET /admin | Redirect a / (proxy.ts) | ✅ PASS — verificado en código (proxy.ts) |
| 1.3 | María | POST /api/revistas | 403 forbidden | ✅ PASS — HTTP 403 |
| 1.4 | María | POST /api/tags | 403 forbidden | ✅ PASS — HTTP 403 |
| 1.5 | María | POST /api/solicitudes/[id]/aceptar | 403 forbidden | ✅ PASS — HTTP 403 |
| 1.6 | María | PATCH su PROPIA pub | 200 | ✅ PASS — HTTP 200 |
| 1.7a | Laura (admin) | GET /api/revistas | 200 | ✅ PASS — HTTP 200 |
| 1.7b | Laura | POST /api/revistas | 201 | ✅ PASS — HTTP 201 |

### Bug encontrado y corregido
**Bug:** PATCH a pub ajena devolvía HTTP 500 en vez de 404.
**Causa raíz:** `.single()` convertía 0 filas (RLS filtra la fila) en error PGRST116, no mapeado en `handleError` → 500.
**Fix:** Reemplazar `.single()` por `.maybeSingle()` + retorno explícito 404.
**Commit:** `6d403a6`

---

## §2 — Validación de archivos (servidor)

| # | Prueba | Esperado | Resultado |
|---|--------|----------|-----------|
| 2.1 | Upload .exe (application/x-msdownload) | 400 validation_error | ✅ PASS |
| 2.2 | Upload .zip (application/zip) | 400 validation_error | ✅ PASS |
| 2.3 | Upload >10 MB | 400 validation_error | ✅ PASS — verificado en código (MAX_SIZE = 10 MB) |

**Validación en servidor:** `app/api/storage/upload/route.ts` — MIME check + size check antes de subir a Supabase Storage.

---

## §3 — Mapeos handleError

| Código | Trigger | HTTP esperado | HTTP obtenido | code obtenido |
|--------|---------|---------------|---------------|---------------|
| `23505` | Like duplicado | 409 | ✅ 409 | `"23505"` |
| RLS (0 filas) | PATCH pub ajena | 404 (post-fix) | ✅ 404 | `"not_found"` |
| `P0001` | Aceptar solicitud ya resuelta | 400 | ✅ 400 | `"P0001"` `"La solicitud ya fue resuelta"` |
| Sin sesión | POST /api/publicaciones | 401 | ✅ 401 | `"unauthorized"` |

---

## §4 — Endurecimiento Supabase §7

### Permisos de funciones (aplicado)

| Función | anon | authenticated |
|---------|------|---------------|
| `handle_new_user()` | ❌ revocado | ❌ revocado |
| `aceptar_solicitud(uuid, text)` | ❌ revocado | ✅ (intencionado — tiene authz interna) |
| `rechazar_solicitud(uuid, text)` | ❌ revocado | ✅ (intencionado — tiene authz interna) |

### Advisors restantes (aceptables)
- **WARN** `aceptar/rechazar` accesibles por `authenticated` via REST — intencionado; las RPCs validan el rol editor internamente.
- **WARN** HaveIBeenPwned desactivado — activar manualmente en Supabase Dashboard → Authentication → Password Settings → **Enable Leaked Password Protection**.

### Re-test tras hardening
- Laura acepta solicitud pendiente → ✅ HTTP 200 (RPC funciona como `authenticated`)

---

## §5 — Suite de regresión (testsprite)

### Flows críticos cubiertos

| Flow | Endpoints | Casos |
|------|-----------|-------|
| Auth | POST /api/auth/login, /logout, /me | login OK, logout limpia cookie, /me sin sesión → 401 |
| Signup | POST /api/auth/signup | crea usuario, confirmación email |
| Publicar + upload | POST /api/storage/upload, POST /api/publicaciones | PDF válido → 201, .exe → 400, >10MB → 400 |
| Feed | GET /api/publicaciones | sin filtro, ?tipo=libro, ?area=Biología (!inner join) |
| Like + comentario | POST/DELETE /api/likes, POST /api/comentarios | like crea, doble like → 409, comentario crea |
| Ciclo revista | POST /api/revistas, POST /revistas/[id]/articulos, PATCH ?estado=publicada | crear → curar → publicar |
| Separación roles | Todos los endpoints admin | usuario → 403, sin sesión → 401 |
| Perfil | PATCH /api/perfil | actualiza institución/carrera |
| Solicitudes | POST /api/solicitudes, /aceptar, /rechazar | crear, aceptar pendiente OK, aceptar ya-resuelta → P0001 |

### Comando de ejecución
```bash
# Via testsprite MCP (no hay test runner local)
# mcp__testsprite__generate_code_and_execute — contra localhost:3000 o URL de producción
```

---

## §6 — Criterios §14 (Definition of Done)

| Criterio | Estado |
|----------|--------|
| Autenticación funcional (registro / login / logout) | ✅ |
| Publicación end-to-end (sube obra con archivo → aparece en feed) | ✅ |
| Filtrado del feed (por tipo Y por área) | ✅ (inner join confirmado) |
| Interacciones (likes y comentarios) | ✅ |
| Ciclo de revista (admin crea → cura → publica) | ✅ |
| Separación de roles (usuario no accede a admin) | ✅ |
| Despliegue (URL pública Vercel) | ⏳ pendiente |

---

## Bugs encontrados en esta sesión

| Bug | Causa | Fix | Commit |
|-----|-------|-----|--------|
| Login falla para usuarios sembrados | `auth.users` tenía campos token con `NULL` → GoTrue scan error | `UPDATE auth.users SET confirmation_token='', email_change='', ...` | data fix via MCP SQL |
| PATCH pub ajena → HTTP 500 | `.single()` convierte 0 filas en PGRST116, no mapeado en handleError | `.maybeSingle()` + retorno 404 explícito | `6d403a6` |

---

## Deuda técnica conocida

- HaveIBeenPwned desactivado — activar manualmente en dashboard.
- DELETE sobre recurso ajeno devuelve HTTP 200 (RLS silencioso, 0 filas afectadas). Dato protegido, pero la respuesta es semánticamente imprecisa.
- `publicaciones/[id]/tags` no tiene check de propiedad en capa de aplicación (depende solo de RLS).
