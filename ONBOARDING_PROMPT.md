# 🤖 Prompt de Onboarding para Claude Code

**Versión**: 2.0.0-dev
**Última actualización**: 2025-10-20

---

## 📋 Prompt para Nueva Sesión

```
Hola! Necesito que me ayudes con el proyecto "Uniformes System v2.0".

Este es un sistema de gestión de uniformes escolares con arquitectura multi-tenant (múltiples colegios), construido con FastAPI (backend) y React + Tauri (frontend desktop).

Por favor, lee los siguientes archivos de documentación en este orden para entender el proyecto:

1. **CLAUDE.md** (raíz del proyecto) - Contexto completo del proyecto, arquitectura, convenciones
2. **README.md** - Descripción general y setup inicial
3. **docs/DATABASE.md** - Arquitectura de base de datos y modelo de datos
4. **docs/SALE_CHANGES.md** - Sistema de cambios/devoluciones (backend)
5. **docs/SALE_CHANGES_UI.md** - Sistema de cambios/devoluciones (frontend UI)
6. **docs/SETUP.md** - Guía de instalación y desarrollo
7. **docs/GIT_WORKFLOW.md** - Workflow de Git y convenciones de commits

## Estado Actual del Proyecto:

### ✅ Completado (85%):
- Backend API: 100% funcional con 43+ endpoints REST
- Base de datos: 13 tablas PostgreSQL con arquitectura multi-tenant
- Frontend: 7 páginas funcionales
  - Login y autenticación JWT
  - Dashboard con bienvenida
  - Sistema de productos con stock en tiempo real
  - Sistema de ventas completo (crear, listar, detalle, imprimir)
  - Sistema de cambios/devoluciones completo (solicitar, aprobar, rechazar)
- Tauri: Impresión de recibos funcional

### ⏳ Pendiente:
- Páginas de Clientes, Encargos y Configuración (actualmente placeholders)
- Tests unitarios
- Reportes y analytics
- Dashboard con estadísticas reales

## Información Técnica Clave:

**Backend:**
- Python 3.10+ con FastAPI
- SQLAlchemy 2.0 (async/await)
- PostgreSQL 15 + Redis 7 (Docker)
- Alembic para migraciones
- Pydantic v2 para validación

**Frontend:**
- React 18 + TypeScript
- Tauri (Rust) para app desktop
- Tailwind CSS
- Zustand para estado
- Axios para API calls
- Vite como bundler

**Arquitectura:**
- Multi-tenant: Cada tabla tiene `school_id` para aislar datos
- Async/await en todo el backend
- JWT para autenticación
- Sistema de roles: VIEWER, SELLER, ADMIN, SUPERUSER

**Rutas Importantes:**
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Docs API: http://localhost:8000/docs

**Comandos Útiles:**
```bash
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Frontend (requiere Rust cargado)
cd frontend && source ~/.cargo/env && npm run tauri dev

# Base de datos
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# Migraciones
cd backend && source venv/bin/activate && alembic upgrade head

# Seed data (crea admin/Admin123)
cd backend && source venv/bin/activate && python seed_data.py
```

## Último Commit:
- **Hash**: d38d4bb
- **Fecha**: 2025-10-20
- **Descripción**: feat: Implement complete Sale Changes/Returns UI system
- **Archivos clave agregados**:
  - frontend/src/components/SaleChangeModal.tsx
  - frontend/src/pages/SaleChanges.tsx
  - frontend/src/services/saleChangeService.ts
  - docs/SALE_CHANGES_UI.md

## Convenciones del Proyecto:

**Git Commits:**
- feat: Nueva funcionalidad
- fix: Corrección de bug
- docs: Documentación
- style: Formateo
- refactor: Refactorización
- test: Tests

**Naming:**
- Backend: snake_case para funciones/variables
- Frontend: camelCase para funciones, PascalCase para componentes
- Base de datos: snake_case para tablas/columnas

**IMPORTANTE:**
- SIEMPRE usar async/await en backend
- SIEMPRE filtrar por school_id en queries
- SIEMPRE validar permisos por rol
- Type hints obligatorios en Python
- Props typing obligatorio en TypeScript

Una vez que hayas leído la documentación, por favor:
1. Confirma que entiendes la arquitectura del proyecto
2. Indica qué área necesitas explorar o en qué puedo ayudarte
3. Si hay algo que no quedó claro, pregunta específicamente sobre ese tema

¿Listo para empezar?
```

---

## 📚 Documentos de Referencia Obligatorios

### Orden de Lectura Recomendado:

1. **`CLAUDE.md`** (raíz)
   - **Por qué leerlo primero**: Contexto completo del proyecto
   - **Qué contiene**: Arquitectura, stack tecnológico, estado actual, decisiones de diseño
   - **Tiempo estimado**: 10-15 minutos

2. **`README.md`** (raíz)
   - **Por qué**: Overview rápido del proyecto
   - **Qué contiene**: Descripción, features, instalación básica
   - **Tiempo estimado**: 5 minutos

3. **`docs/DATABASE.md`**
   - **Por qué**: Entender el modelo de datos es crítico
   - **Qué contiene**: ERD, tablas, relaciones, constraints, migraciones
   - **Tiempo estimado**: 15 minutos

4. **`docs/SALE_CHANGES.md`**
   - **Por qué**: Sistema más complejo, recientemente implementado
   - **Qué contiene**: Arquitectura backend de cambios/devoluciones
   - **Tiempo estimado**: 10 minutos

5. **`docs/SALE_CHANGES_UI.md`**
   - **Por qué**: Frontend del sistema de cambios
   - **Qué contiene**: Componentes React, flujos de usuario, validaciones
   - **Tiempo estimado**: 15 minutos

6. **`docs/SETUP.md`**
   - **Por qué**: Si necesitas ejecutar el proyecto
   - **Qué contiene**: Instalación paso a paso, troubleshooting
   - **Tiempo estimado**: 10 minutos

7. **`docs/GIT_WORKFLOW.md`**
   - **Por qué**: Para contribuir correctamente
   - **Qué contiene**: Branching strategy, convenciones de commits
   - **Tiempo estimado**: 5 minutos

---

## 🎯 Casos de Uso del Prompt

### Caso 1: Nueva Sesión - Continuar Desarrollo

```
[Pegar prompt de arriba]

Necesito continuar desarrollando el sistema. Específicamente quiero trabajar en:
- [DESCRIBE TU TAREA AQUÍ]

¿Qué archivos necesito revisar para entender esta área?
```

### Caso 2: Nueva Sesión - Debugging

```
[Pegar prompt de arriba]

Tengo un error en [COMPONENTE/SERVICIO]:
[DESCRIPCIÓN DEL ERROR]

¿Puedes ayudarme a entenderlo basándote en la arquitectura del proyecto?
```

### Caso 3: Nueva Sesión - Agregar Feature

```
[Pegar prompt de arriba]

Quiero agregar una nueva funcionalidad:
[DESCRIPCIÓN DE LA FEATURE]

¿Qué pasos debo seguir según las convenciones del proyecto?
```

### Caso 4: Nueva Sesión - Exploración

```
[Pegar prompt de arriba]

Solo quiero explorar el código y entender cómo funciona [MÓDULO/SISTEMA].

¿Puedes guiarme por los archivos más importantes?
```

---

## 🗺️ Mapa del Proyecto (Quick Reference)

### Backend Key Files:

```
backend/
├── app/
│   ├── main.py                 # ⭐ Entry point de la API
│   ├── api/
│   │   ├── dependencies.py     # ⭐ Auth y permisos
│   │   └── routes/
│   │       ├── sales.py        # Endpoints de ventas
│   │       └── sale_changes.py # ⭐ Endpoints de cambios
│   ├── models/
│   │   ├── sale.py            # Modelo de venta
│   │   └── sale_change.py     # ⭐ Modelo de cambio
│   ├── schemas/
│   │   └── sale_change.py     # ⭐ Schemas de validación
│   └── services/
│       ├── sale.py            # Lógica de ventas
│       └── sale_change.py     # ⭐ Lógica de cambios
├── alembic/versions/          # Migraciones de DB
└── seed_data.py               # ⭐ Script de datos de prueba
```

### Frontend Key Files:

```
frontend/
├── src/
│   ├── App.tsx                        # ⭐ Router principal
│   ├── components/
│   │   ├── Layout.tsx                # ⭐ Layout y sidebar
│   │   └── SaleChangeModal.tsx       # ⭐ Modal de cambios
│   ├── pages/
│   │   ├── Login.tsx                 # Autenticación
│   │   ├── Dashboard.tsx             # Pantalla principal
│   │   ├── Products.tsx              # Gestión de productos
│   │   ├── Sales.tsx                 # Lista de ventas
│   │   ├── SaleDetail.tsx            # ⭐ Detalle con cambios
│   │   └── SaleChanges.tsx           # ⭐ Admin de cambios
│   ├── services/
│   │   ├── saleService.ts            # API de ventas
│   │   └── saleChangeService.ts      # ⭐ API de cambios
│   ├── stores/
│   │   └── authStore.ts              # ⭐ Estado de autenticación
│   └── types/
│       └── api.ts                    # ⭐ TypeScript types
└── src-tauri/
    ├── tauri.conf.json               # Config de Tauri
    └── capabilities/default.json     # ⭐ Permisos (print, fs)
```

### Documentación:

```
docs/
├── SETUP.md              # ⭐ Instalación
├── DATABASE.md           # ⭐ Arquitectura de BD
├── SALE_CHANGES.md       # ⭐ Backend de cambios
├── SALE_CHANGES_UI.md    # ⭐ Frontend de cambios
└── GIT_WORKFLOW.md       # Workflow de desarrollo
```

**Leyenda**: ⭐ = Archivos críticos para entender el sistema

---

## 🔍 Preguntas Frecuentes del Nuevo Chat

**P: ¿Cómo inicio el proyecto?**
R: Lee `docs/SETUP.md` completo. Resumen: Docker para DB, backend con uvicorn, frontend con tauri dev.

**P: ¿Dónde están las credenciales?**
R: `admin` / `Admin123` (creadas por seed_data.py). DB: ver `.env.example`.

**P: ¿Cómo funciona multi-tenancy?**
R: Todas las tablas tienen `school_id`. Services filtran automáticamente. Ver `CLAUDE.md` sección "Multi-Tenancy".

**P: ¿Qué es lo último implementado?**
R: Sistema de cambios/devoluciones UI completo (commit d38d4bb, 2025-10-20). Ver `SALE_CHANGES_UI.md`.

**P: ¿Cómo se estructuran los commits?**
R: `tipo: descripción`. Ver `docs/GIT_WORKFLOW.md`. Siempre agregar footer con Claude Code.

**P: ¿Qué está pendiente?**
R: Ver `CLAUDE.md` sección "Pendiente (TODO)". Principales: páginas de Clientes, Encargos, tests.

**P: ¿Cómo pruebo el sistema de cambios?**
R: Ver `docs/SALE_CHANGES_UI.md` sección "Flujo de Usuario" para guía paso a paso.

---

## 🚀 Comandos de Inicio Rápido

```bash
# 1. Clonar (si es nuevo entorno)
git clone https://github.com/Samsuesca/uniformes-system-v2.git
cd uniformes-system-v2

# 2. Checkout a develop
git checkout develop

# 3. Iniciar Docker (PostgreSQL + Redis)
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# 4. Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python seed_data.py

# 5. Backend run
uvicorn app.main:app --reload

# 6. Frontend setup (nueva terminal)
cd ../frontend
npm install

# 7. Frontend run (requiere Rust)
source ~/.cargo/env
npm run tauri dev

# 8. Verificar
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:5173
# Login: admin / Admin123
```

---

## 📊 Estado del Proyecto (Snapshot)

**Última actualización**: 2025-10-20

| Módulo | Backend | Frontend | Docs | Status |
|--------|---------|----------|------|--------|
| Autenticación | ✅ 100% | ✅ 100% | ✅ | Completo |
| Productos | ✅ 100% | ✅ 100% | ✅ | Completo |
| Ventas | ✅ 100% | ✅ 100% | ✅ | Completo |
| Cambios/Devoluciones | ✅ 100% | ✅ 100% | ✅ | **Recién completado** |
| Clientes | ✅ 100% | ⚠️ 30% | ✅ | Backend listo |
| Encargos | ✅ 100% | ⚠️ 20% | ✅ | Backend listo |
| Inventario | ✅ 100% | ✅ 80% | ✅ | Parcial |
| Configuración | ✅ 100% | ⚠️ 10% | ⚠️ | Placeholder |
| Tests | ❌ 0% | ❌ 0% | ❌ | Pendiente |
| Reportes | ❌ 0% | ❌ 0% | ❌ | Pendiente |

**Leyenda**: ✅ Completo | ⚠️ Parcial | ❌ No iniciado

---

## 💡 Tips para el Nuevo Chat

1. **Siempre lee `CLAUDE.md` primero** - Tiene el contexto completo
2. **Respeta las convenciones** - El proyecto tiene estándares bien definidos
3. **Usa async/await** - Todo el backend es asíncrono
4. **Valida permisos** - Sistema de roles estricto
5. **Filtra por school_id** - Multi-tenancy es crítico
6. **Type safety** - Python con hints, TypeScript en frontend
7. **Commits descriptivos** - Sigue el formato convencional
8. **Tests (TODO)** - Aún no hay, pero agrégalos si implementas algo crítico

---

## 🔗 Enlaces Útiles

- **GitHub**: https://github.com/Samsuesca/uniformes-system-v2
- **Branches**: main (producción), develop (desarrollo activo)
- **Issues**: https://github.com/Samsuesca/uniformes-system-v2/issues
- **Último commit**: https://github.com/Samsuesca/uniformes-system-v2/commit/d38d4bb

---

**Creado por**: Claude Code & Angel Samuel Suesca
**Para**: Facilitar onboarding de nuevas sesiones de Claude Code
**Versión del prompt**: 1.0.0
