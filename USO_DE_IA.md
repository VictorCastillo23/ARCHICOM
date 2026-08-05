# Uso de IA y Agentes de Desarrollo

Sección de referencia para incorporar al CV, describiendo el uso profesional de Claude Code y agentes de IA como parte del flujo de trabajo de desarrollo de software.

---

## Texto sugerido para el CV

**IA aplicada al desarrollo de software**

Uso avanzado de agentes de IA (Claude Code) como parte del flujo de desarrollo, más allá de la autocompletación de código:

- **Orquestación de agentes**: delegación de tareas complejas a subagentes especializados (exploración de código, implementación, revisión) para paralelizar trabajo y mantener el contexto principal enfocado.
- **Tool use / function calling**: diseño e integración de herramientas personalizadas que permiten al agente ejecutar acciones concretas (consultas a bases de datos, llamadas a APIs, control de versiones) de forma controlada y auditable.
- **MCP (Model Context Protocol)**: conexión de agentes con sistemas externos —bases de datos, control de versiones, gestión de proyectos, documentación técnica— mediante servidores MCP, evitando integraciones ad-hoc.
- **Desarrollo guiado por especificaciones (SDD)**: uso de agentes para llevar cambios desde la exploración inicial hasta la implementación y verificación, con documentación de decisiones de arquitectura en cada etapa.
- **Memoria persistente**: mantenimiento de contexto de proyecto (convenciones, decisiones técnicas, incidentes) entre sesiones de trabajo, reduciendo el tiempo de onboarding del agente en tareas recurrentes.
- **Revisión de código asistida por IA**: incorporación de agentes de revisión como capa adicional de control de calidad antes de mergear cambios, complementando (no reemplazando) la revisión humana.

**Versión corta (una línea, para bullet de CV):**

> Experiencia en flujos de desarrollo asistidos por agentes de IA (Claude Code): orquestación de subagentes, integración de herramientas vía MCP, y desarrollo guiado por especificaciones.

---

## Ecosistema de orquestación multiagente ("Agent Teams")

Además del uso puntual de agentes, diseño y opero un **ecosistema de orquestación multiagente** sobre Claude Code, con reglas explícitas de cuándo delegar, qué revisar y cómo preservar contexto entre sesiones. No es "usar el agente para todo": es un conjunto de políticas que definen la división de trabajo entre coordinador y ejecutores.

- **Patrón orquestador-ejecutor**: el agente principal se mantiene como coordinador liviano —no ejecuta el trabajo pesado él mismo— y delega exploración, implementación y revisión a subagentes especializados, cada uno con un alcance acotado y un tipo de herramientas específico.
- **Umbrales de delegación obligatoria**: reglas objetivas (no discrecionales) que disparan delegación automática: exploración que requiere leer 4 o más archivos, escrituras que tocan 2 o más archivos con lógica nueva, sesiones largas sin delegar, o incidentes operativos (directorio de trabajo incorrecto, mutación accidental de un repositorio). El objetivo es evitar que el hilo de contexto principal se sature con trabajo que debería estar aislado.
- **Revisión por "lentes" (patrón 4R)**: en lugar de una revisión de código genérica, selecciono el tipo de revisión según el perfil de riesgo del cambio —legibilidad/mantenibilidad, confiabilidad (tests, determinismo, regresiones), resiliencia (fallos parciales, degradación de dependencias) y riesgo (seguridad, exposición de datos, permisos). Cambios grandes o en rutas críticas (autenticación, pagos, seguridad) disparan las cuatro dimensiones en paralelo; cambios menores usan solo la lente relevante.
- **Revisión adversarial ciega ("Judgment Day")**: para decisiones de diseño o implementaciones críticas, ejecuto un protocolo de doble revisión ciega —dos agentes evaluadores independientes, sin visibilidad entre sí, seguido de una etapa de corrección quirúrgica que aplica únicamente los hallazgos en los que ambos coinciden. Reduce falsos positivos frente a una revisión de un solo agente.
- **Desarrollo guiado por especificaciones (SDD) end-to-end**: ciclo formal explorar → proponer → especificar → diseñar → desglosar en tareas → implementar → verificar → archivar, con cada fase delegada a un subagente con contrato de entrada/salida propio, evitando que la implementación arranque sin una especificación validada.
- **Memoria persistente entre sesiones**: las decisiones de arquitectura, convenciones de equipo y hallazgos no evidentes en el código se registran con claves de tema estables y se recuperan automáticamente al iniciar una sesión nueva, con un ciclo de vida propio (vigente / a revisar) para no tratar contexto desactualizado como si fuera verdad actual.
- **Gestión de costo/contexto**: decisión explícita de cuándo delegar vs. resolver en línea (lecturas de 1-3 archivos, ediciones mecánicas de un solo archivo) para no inflar el contexto ni el costo con delegación innecesaria.

**Versión corta alternativa (para bullet de CV, enfocada en el ecosistema):**

> Diseño y operación de un sistema de orquestación multiagente sobre Claude Code: reglas de delegación por umbral, revisión de código adversarial de doble ciego, y memoria persistente de contexto de proyecto entre sesiones.

---

## Notas para adaptar

- Ajustar el nivel de detalle según el rol al que se aplique (más técnico para roles de ingeniería, más orientado a productividad/impacto para roles de liderazgo).
- Si se pide evidencia concreta en una entrevista, tener a mano 1-2 ejemplos reales de un flujo con MCP o subagentes usados en este u otro proyecto.
- Evitar afirmar dominio de "prompt engineering" como skill aislado: el valor real está en el diseño del flujo de trabajo (qué se delega, qué se verifica, qué queda bajo control humano).
