# 🤖 Claude AI - Contexto del Proyecto

Este archivo contiene información importante para que Claude Code pueda asistir efectivamente en el desarrollo del proyecto **Uniformes System v2.0**.

---

## 📋 Información del Proyecto

### Descripción General
Sistema de gestión de uniformes profesional con arquitectura **multi-tenant** (múltiples colegios), diseñado para manejar inventario, ventas, encargos personalizados y contabilidad integrada.

### Características Principales
- **Multi-Colegio**: Un solo sistema gestiona múltiples instituciones con datos completamente aislados
- **Aplicación Nativa**: Desktop app multiplataforma (Windows, macOS, Linux) usando Tauri
- **API REST**: Backend robusto con FastAPI y PostgreSQL
- **Inventario Inteligente**: Control de stock por colegio, tallas, tipos de prenda
- **Ventas y Encargos**: POS completo con pedidos personalizados y medidas
- **Cambios y Devoluciones**: Sistema completo de gestión de cambios con ajuste automático de inventario
- **Contabilidad**: Movimientos automáticos, gastos, cuentas por pagar

---

## 🏗️ Arquitectura

### Stack Tecnológico

**Backend:**
- Python 3.10+
- FastAPI 0.104.1
- SQLAlchemy 2.0.23 (async)
- PostgreSQL 15
- Redis 7
- Alembic (migraciones)
- Pydantic v2

**Frontend:**
- Tauri (Rust + WebView)
- React 18 + TypeScript
- Tailwind CSS
- Zustand (estado)
- Axios + React Query
- Vite

**DevOps:**
- Docker + Docker Compose
- PostgreSQL y Redis containerizados

---

## 🗄️ Base de Datos (Multi-Tenant)

### Arquitectura Multi-Tenant
Cada tabla tiene `school_id` que aísla los datos por colegio.

### Tablas Principales

**Nivel 1: Sistema**
- `users` - Usuarios del sistema
- `user_school_roles` - Roles por colegio (many-to-many)

**Nivel 2: Tenants**
- `schools` - Instituciones educativas (tenants)

**Nivel 3: Catálogos (por colegio)**
- `garment_types` - Tipos de prendas
- `products` - Productos/SKUs individuales
- `inventory` - Stock disponible

**Nivel 4: Operaciones (por colegio)**
- `clients` - Base de clientes
- `sales` + `sale_items` - Ventas
- `sale_changes` - Cambios y devoluciones de ventas
- `orders` + `order_items` - Encargos personalizados

**Características de la BD:**
- UUIDs como primary keys
- Índices en foreign keys y campos frecuentes
- Constraints únicos por colegio (`school_id + code`)
- Check constraints (validación de precios, cantidades)
- JSONB para datos flexibles (settings, custom_measurements)
- Timestamps automáticos (created_at, updated_at)
- Soft deletes (is_active)
- Cascade delete para aislamiento de datos

### Migraciones
1. **ID**: `4093d4173dee`
   - **Descripción**: Initial multi-tenant schema
   - **Estado**: Aplicada ✅

2. **ID**: `d868decca943`
   - **Descripción**: Add sale_changes table
   - **Estado**: Aplicada ✅
   - **Tablas**: `sale_changes` (sistema de cambios/devoluciones)
   - **Enums**: `change_type_enum`, `change_status_enum`

---

## 📁 Estructura del Proyecto

```
uniformes-system-v2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies.py  # ✅ Auth & permissions
│   │   │   └── routes/          # ✅ REST endpoints (8 routers)
│   │   ├── core/                # ✅ Configuration
│   │   ├── db/                  # ✅ Database session
│   │   ├── models/              # ✅ SQLAlchemy models (complete)
│   │   ├── schemas/             # ✅ Pydantic schemas (complete)
│   │   ├── services/            # ✅ Business logic (8 services)
│   │   └── main.py              # ✅ FastAPI app
│   ├── alembic/                 # ✅ Migrations (2 applied)
│   ├── tests/                   # ❌ Tests (TODO)
│   ├── requirements.txt         # Dependencies
│   ├── seed_data.py             # ✅ Seed script
│   └── venv/                    # Virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── components/          # ✅ Layout component
│   │   ├── pages/               # ✅ 6 pages (Dashboard, Products, etc.)
│   │   ├── stores/              # ✅ authStore (Zustand)
│   │   ├── types/               # ✅ TypeScript interfaces
│   │   ├── utils/               # ✅ API client (Axios)
│   │   ├── App.tsx              # ✅ Router + protected routes
│   │   └── main.tsx             # ✅ Entry point
│   ├── src-tauri/               # Tauri configuration
│   └── package.json
│
├── docker/
│   └── docker-compose.dev.yml   # PostgreSQL + Redis
│
├── docs/
│   ├── SETUP.md                 # Installation guide
│   ├── DATABASE.md              # DB architecture
│   ├── GIT_WORKFLOW.md          # Git workflow
│   ├── SALE_CHANGES.md          # ✅ Sale changes system docs
│   └── claude/                  # Claude-specific docs
│
└── .claude/
    ├── settings.local.json
    └── CLAUDE.md                # This file
```

---

## 🎯 Estado Actual del Desarrollo

### ✅ Completado

1. **Configuración Inicial**
   - Proyecto estructurado
   - Docker configurado (PostgreSQL + Redis)
   - Git/GitHub configurado
   - Branches: main, develop, feature/*

2. **Base de Datos**
   - Modelos SQLAlchemy completos (15 modelos)
   - Arquitectura multi-tenant diseñada e implementada
   - Alembic configurado
   - 2 migraciones aplicadas
   - 13 tablas creadas en PostgreSQL (incluye `sale_changes`)

3. **Backend API (95% completo)**
   - ✅ Schemas Pydantic (107 schemas con validación)
   - ✅ CRUD services (8 servicios, ~95 métodos)
   - ✅ Endpoints REST (43+ endpoints)
   - ✅ Autenticación JWT (login, roles, permisos)
   - ✅ Sistema multi-tenancy (filtrado automático por school_id)
   - ✅ Sistema de cambios/devoluciones completo
   - ✅ Gestión de inventario con reservas
   - ✅ Auto-códigos (VNT-YYYY-NNNN, ENC-YYYY-NNNN, etc.)

4. **Frontend (70% completo)**
   - ✅ Login funcional con JWT
   - ✅ Dashboard con bienvenida personalizada
   - ✅ 6 páginas de navegación (Dashboard, Products, Clients, Sales, Orders, Settings)
   - ✅ Layout con sidebar colapsable
   - ✅ Routing protegido
   - ✅ API client con interceptores
   - ✅ authStore (Zustand) con persistencia
   - ⚠️ Páginas son placeholders (no cargan datos reales aún)

5. **Documentación**
   - README.md actualizado
   - SETUP.md (guía de instalación)
   - DATABASE.md (arquitectura de BD)
   - GIT_WORKFLOW.md (workflow Git)
   - SALE_CHANGES.md (sistema de cambios completo)
   - LICENSE (MIT)

6. **Seed Data**
   - Script seed_data.py funcional
   - Crea superuser: admin/Admin123
   - Crea colegio demo con configuración

### ❌ Pendiente (TODO)

1. **Backend (5%)**
   - [ ] Tests unitarios
   - [ ] Reportes y analytics
   - [ ] Exportación a Excel/PDF
   - [ ] Webhooks y notificaciones

2. **Frontend (30%)**
   - [ ] Tablas con datos reales de la API
   - [ ] Formularios CRUD funcionales
   - [ ] Gestión de cambios/devoluciones UI
   - [ ] Reportes y gráficos
   - [ ] Manejo completo de errores
   - [ ] Loading states

3. **Features**
   - [ ] Sistema de reportes avanzados
   - [ ] Dashboard con stats reales
   - [ ] Notificaciones en tiempo real
   - [ ] Exportación masiva
   - [ ] CI/CD pipeline

---

## 🔄 Sistema de Cambios y Devoluciones

### Arquitectura

El sistema de cambios permite gestionar devoluciones y cambios de productos ya vendidos con las siguientes características:

**Tipos de Cambios:**
- `size_change`: Cambio de talla (ej: T14 → T16)
- `product_change`: Cambio a producto diferente
- `return`: Devolución sin reemplazo (reembolso)
- `defect`: Cambio por producto defectuoso

**Estados:**
- `PENDING`: Creado, pendiente de aprobación
- `APPROVED`: Aprobado, inventario ajustado
- `REJECTED`: Rechazado, sin cambios

**Flujo de Trabajo:**
1. **SELLER** crea solicitud → Sistema valida stock y calcula precio
2. Estado → `PENDING`
3. **ADMIN** aprueba o rechaza
4. Si aprobado → Ajuste automático de inventario (+1 devuelto, -1 nuevo)
5. Estado → `APPROVED` o `REJECTED`

**Endpoints:**
```
POST   /schools/{id}/sales/{id}/changes           # Crear cambio (SELLER+)
GET    /schools/{id}/sales/{id}/changes           # Listar cambios (VIEWER+)
PATCH  /schools/{id}/sales/{id}/changes/{id}/approve  # Aprobar (ADMIN+)
PATCH  /schools/{id}/sales/{id}/changes/{id}/reject   # Rechazar (ADMIN+)
```

**Lógica de Negocio Clave:**
```python
# Cálculo automático de ajuste de precio
price_adjustment = (new_price * new_qty) - (original_price * returned_qty)

# Para returns (devoluciones)
price_adjustment = -(original_price * returned_qty)  # Reembolso

# Ajuste de inventario al aprobar
inventory.adjust_stock(original_product, +returned_qty, "Devolución")
inventory.adjust_stock(new_product, -new_qty, "Entrega")
```

**Modelo de Datos:**
- Tabla: `sale_changes`
- Enums: `change_type_enum`, `change_status_enum`
- Relaciones: `sale_id`, `original_item_id`, `new_product_id`, `user_id`
- Auditoría: Completa con created_at, updated_at, user_id

Ver [docs/SALE_CHANGES.md](../docs/SALE_CHANGES.md) para documentación completa.

---

## 🔑 Convenciones del Proyecto

### Git Workflow

**Branches:**
- `main` - Producción (protegida)
- `develop` - Desarrollo activo
- `feature/*` - Nuevas funcionalidades
- `bugfix/*` - Corrección de bugs
- `hotfix/*` - Parches urgentes

**Commits:**
```
feat:     Nueva funcionalidad
fix:      Corrección de bug
docs:     Documentación
style:    Formateo
refactor: Refactorización
test:     Tests
chore:    Mantenimiento
```

### Código

**Python (Backend):**
- PEP 8 style guide
- Type hints obligatorios
- Docstrings en funciones públicas
- Async/await para operaciones I/O
- SQLAlchemy 2.0 style (Mapped, mapped_column)

**TypeScript (Frontend):**
- ESLint + Prettier
- Functional components + hooks
- Props typing
- Naming: PascalCase para componentes, camelCase para funciones

### Base de Datos

**Naming:**
- Tablas: plural, snake_case (`users`, `sale_items`)
- Columnas: snake_case (`created_at`, `school_id`)
- Constraints: prefijo + descripción (`uq_school_product_code`, `chk_price_positive`)

**Migraciones:**
- Descriptivas: `"Add user authentication tables"`
- Siempre revisar antes de aplicar
- NUNCA editar migraciones aplicadas

---

## 🚀 Comandos Útiles

### Desarrollo Diario

```bash
# Terminal 1: Docker services
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# Terminal 2: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 3: Frontend
cd frontend
npm run tauri:dev
```

### Base de Datos

```bash
# Ver tablas
docker exec docker-postgres-1 psql -U uniformes_user -d uniformes_db -c "\dt"

# Crear migración
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description"

# Aplicar migración
alembic upgrade head

# Revertir migración
alembic downgrade -1
```

### Git

```bash
# Nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# Commit y push
git add .
git commit -m "feat: descripción"
git push -u origin feature/nombre-descriptivo

# Merge a develop
git checkout develop
git merge --no-ff feature/nombre-descriptivo
git push origin develop
```

---

## 🔒 Archivos Sensibles

### NUNCA commitear:
- `.env` (passwords reales)
- `venv/`, `node_modules/`
- `__pycache__/`, `*.pyc`
- `.DS_Store`
- Certificados, keys, credentials

### SÍ commitear:
- `.env.example` (plantilla sin secretos)
- `requirements.txt`, `package.json`
- `alembic/versions/*.py` (migraciones)
- Documentación

---

## 📚 Referencias Importantes

### Documentación
- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- Alembic: https://alembic.sqlalchemy.org
- Tauri: https://tauri.app
- React: https://react.dev

### Proyecto
- **GitHub**: https://github.com/Samsuesca/uniformes-system-v2
- **Issues**: https://github.com/Samsuesca/uniformes-system-v2/issues
- **Branches**: https://github.com/Samsuesca/uniformes-system-v2/branches

---

## 💡 Notas para Claude

### Al Asistir en el Proyecto

1. **Siempre considerar multi-tenancy**: Cada query debe filtrar por `school_id`
2. **Usar async/await**: Todo el backend es asíncrono
3. **Type safety**: Python con type hints, TypeScript en frontend
4. **Seguir convenciones**: Git commits, naming, estructura de archivos
5. **Probar antes de commitear**: Verificar que funcione localmente

### Contexto del Sistema Antiguo

El usuario tenía un sistema anterior con PostgreSQL (script SQL disponible en GitHub). Este v2.0 es una reescritura completa con arquitectura moderna y multi-tenant.

**Diferencias clave vs sistema antiguo:**
- Antiguo: Un solo colegio implícito
- Nuevo: Multi-colegio explícito con `school_id`
- Antiguo: IDs seriales (integers)
- Nuevo: UUIDs
- Antiguo: Sync queries
- Nuevo: Async/await

### Decisiones de Diseño Importantes

**Sistema de Cambios/Devoluciones:**
- **Razón**: En la versión anterior usaba triggers PostgreSQL. En v2.0 usamos lógica en servicios Python para mejor control, testing y mantenimiento.
- **Enfoque**: Workflow con aprobación (PENDING → APPROVED/REJECTED) en vez de automático
- **Validación**: Stock se valida al crear Y al aprobar (por si cambió entre medio)
- **Transacciones**: Todos los ajustes de inventario son atómicos

**Multi-Tenancy:**
- `school_id` en TODAS las tablas de negocio
- Services base (`SchoolIsolatedService`) fuerzan filtrado automático
- Endpoints requieren `school_id` en URL
- Dependency injection valida acceso del usuario al colegio

**Códigos Auto-generados:**
- Formato: `PREFIX-YYYY-NNNN` (ej: VNT-2025-0001)
- Secuencial por año y por colegio
- Generados en servicios, no triggers

### Próximos pasos sugeridos

**Alta prioridad:**
1. ✅ ~~Schemas Pydantic~~ (completado)
2. ✅ ~~CRUD services~~ (completado)
3. ✅ ~~Autenticación JWT~~ (completado)
4. ✅ ~~Frontend básico~~ (login + navegación)
5. Conectar frontend con API real (tablas, forms)
6. Tests unitarios para servicios críticos

**Media prioridad:**
7. Dashboard con stats reales
8. UI para gestión de cambios/devoluciones
9. Reportes y exportación
10. Notificaciones

---

## 🐛 Troubleshooting Común

**Backend no inicia:**
- Verificar PostgreSQL: `docker ps`
- Ver logs: `docker logs docker-postgres-1`
- Reiniciar: `docker-compose -f docker/docker-compose.dev.yml restart`

**Frontend no compila:**
- Verificar Rust: `rustc --version`
- Cargar Rust: `source ~/.cargo/env`
- Reinstalar deps: `rm -rf node_modules && npm install`

**Migración falla:**
- Verificar conexión a BD
- Revisar modelos por errores de sintaxis
- Verificar que imports estén en `models/__init__.py`

---

## 📞 Información del Desarrollador

- **Nombre**: Angel Samuel Suesca Rios
- **GitHub**: https://github.com/Samsuesca
- **Email**: suescapsam@gmail.com

---

**Última actualización**: 2025-10-19
**Versión del proyecto**: v2.0.0-dev
**Estado**: En desarrollo activo

**Cambios recientes:**
- ✅ Sistema de cambios/devoluciones implementado (modelo, servicios, endpoints, docs)
- ✅ Frontend básico funcional (login, navegación, 6 páginas placeholder)
- ✅ 43+ endpoints REST con autenticación JWT
- ✅ 8 servicios de negocio completos
- ✅ 107 schemas Pydantic con validación
- ✅ Migración sale_changes aplicada
