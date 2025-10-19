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

### Migración Actual
- **ID**: `4093d4173dee`
- **Descripción**: Initial multi-tenant schema
- **Estado**: Aplicada ✅

---

## 📁 Estructura del Proyecto

```
uniformes-system-v2/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # Endpoints REST (mostly empty)
│   │   ├── core/            # Configuración
│   │   ├── db/              # ✅ Database session
│   │   ├── models/          # ✅ SQLAlchemy models (complete)
│   │   ├── schemas/         # ❌ Pydantic schemas (TODO)
│   │   ├── services/        # ❌ Business logic (TODO)
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # ✅ Migrations
│   ├── tests/               # ❌ Tests (TODO)
│   ├── requirements.txt     # Dependencies
│   └── venv/                # Virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── components/      # ❌ React components (TODO)
│   │   ├── pages/           # ❌ Views (TODO)
│   │   ├── stores/          # ❌ Zustand stores (TODO)
│   │   ├── App.tsx          # ✅ Basic welcome page
│   │   └── main.tsx
│   ├── src-tauri/           # Tauri configuration
│   └── package.json
│
├── docker/
│   └── docker-compose.dev.yml  # PostgreSQL + Redis
│
├── docs/
│   ├── SETUP.md             # Installation guide
│   ├── DATABASE.md          # DB architecture
│   ├── GIT_WORKFLOW.md      # Git workflow
│   └── claude/              # Claude-specific docs
│
└── .claude/
    ├── settings.local.json
    └── CLAUDE.md            # This file
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
   - Modelos SQLAlchemy completos (14 archivos)
   - Arquitectura multi-tenant diseñada e implementada
   - Alembic configurado
   - Migración inicial aplicada
   - 12 tablas creadas en PostgreSQL

3. **Documentación**
   - README.md completo
   - SETUP.md (guía de instalación)
   - DATABASE.md (arquitectura de BD)
   - GIT_WORKFLOW.md (workflow Git)
   - LICENSE (MIT)

4. **Testing**
   - Backend inicia correctamente
   - Frontend Tauri funciona
   - Base de datos verificada

### ❌ Pendiente (TODO)

1. **Backend**
   - [ ] Schemas Pydantic para validación
   - [ ] CRUD services para cada entidad
   - [ ] Endpoints REST implementados
   - [ ] Sistema de autenticación JWT
   - [ ] Middleware de multi-tenancy
   - [ ] Tests unitarios

2. **Frontend**
   - [ ] Componentes React (layout, forms, tables)
   - [ ] Páginas/vistas (dashboard, products, sales, etc.)
   - [ ] Stores Zustand para estado
   - [ ] Integración con API
   - [ ] Autenticación UI
   - [ ] Manejo de errores

3. **Features**
   - [ ] Seed data (datos de ejemplo)
   - [ ] Triggers de base de datos (auto-códigos, inventario)
   - [ ] Sistema de reportes
   - [ ] Exportación a Excel/PDF
   - [ ] CI/CD pipeline

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

### Prioridades de Desarrollo

**Próximos pasos sugeridos:**
1. Schemas Pydantic (validación de entrada/salida)
2. CRUD endpoints básicos (products, sales)
3. Autenticación JWT
4. Seed data para testing
5. Frontend básico (listados, forms)

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
