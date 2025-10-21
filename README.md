# Uniformes System v2.0

Sistema de gestión de uniformes profesional con **arquitectura multi-tenant**, diseñado para gestionar múltiples colegios desde una sola aplicación.

## 🎯 Características Principales

- ✅ **Multi-Colegio (Multi-Tenant)**: Gestiona múltiples instituciones con datos completamente aislados
- ✅ **Inventario Inteligente**: Control de stock por colegio, tallas, tipos de prenda
- ✅ **Ventas y Encargos**: Sistema completo de POS con pedidos personalizados
- ✅ **Cambios y Devoluciones**: Sistema completo de gestión de cambios con ajuste automático de inventario y contabilidad
- ✅ **Contabilidad Integrada**: Movimientos, gastos, cuentas por pagar
- ✅ **Aplicación Nativa**: Desktop app multiplataforma (Windows, macOS, Linux)
- ✅ **API REST**: Backend robusto con documentación automática

## 🚀 Stack Tecnológico

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Base de Datos**: PostgreSQL 15 (async con SQLAlchemy 2.0)
- **Cache**: Redis 7
- **Migraciones**: Alembic
- **Validación**: Pydantic v2

### Frontend
- **Desktop App**: Tauri (Rust + WebView)
- **UI Framework**: React 18 + TypeScript
- **Estilos**: Tailwind CSS
- **Estado**: Zustand
- **HTTP Client**: Axios + React Query
- **Build Tool**: Vite

### DevOps
- **Contenedores**: Docker + Docker Compose
- **CI/CD**: GitHub Actions (próximamente)

## 📋 Requisitos del Sistema

### Obligatorios
- **Docker Desktop**: Para PostgreSQL y Redis
- **Node.js**: v18+ (recomendado v22+)
- **Python**: 3.10+ (recomendado 3.11+)
- **Rust**: Latest stable (para Tauri)
- **Git**: Control de versiones

### Opcionales
- **Postico** o **DBeaver**: Cliente GUI para PostgreSQL
- **VSCode**: Editor recomendado con extensiones Python y TypeScript

## 🛠️ Setup Inicial (Primera Vez)

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd uniformes-system-v2
```

### 2. Instalar Rust (si no lo tienes)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 3. Configurar Backend
```bash
cd backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate    # Windows

# Instalar dependencias
pip install -r requirements.txt
```

### 4. Configurar Frontend
```bash
cd frontend
npm install
```

### 5. Variables de Entorno
El proyecto ya incluye `.env` con configuración de desarrollo. Para producción, crear `.env.production`:

```bash
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://uniformes_user:dev_password@localhost:5432/uniformes_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-change-in-production
ENV=development
DEBUG=true
```

## 🚀 Desarrollo Diario

### Opción 1: Con Docker (Recomendado)

#### Terminal 1: Servicios (PostgreSQL + Redis)
```bash
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# Verificar estado
docker ps
# Debe mostrar postgres y redis con STATUS "healthy"
```

#### Terminal 2: Backend API
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# ✅ API disponible en: http://localhost:8000
# ✅ Docs automáticas: http://localhost:8000/docs
```

#### Terminal 3: Frontend Tauri
```bash
cd frontend
npm run tauri:dev

# ✅ Se abre ventana nativa con la aplicación
```

### Opción 2: Desarrollo Solo Frontend (sin Backend)
```bash
cd frontend
npm run dev

# ✅ Vite dev server: http://localhost:5173
```

## 🗄️ Gestión de Base de Datos

### Ver y Explorar Datos

**Opción A: GUI (Recomendado para desarrollo)**
- Instalar [Postico](https://eggerapps.at/postico2/) (macOS) o [DBeaver](https://dbeaver.io/) (multiplataforma)
- Configuración:
  ```
  Host: localhost
  Port: 5432
  Database: uniformes_db
  User: uniformes_user
  Password: dev_password
  ```

**Opción B: psql desde Docker**
```bash
docker exec -it docker-postgres-1 psql -U uniformes_user -d uniformes_db

# Comandos útiles:
\dt          # Listar tablas
\d tabla     # Estructura de tabla
\q           # Salir
```

### Migraciones (Alembic)

```bash
cd backend
source venv/bin/activate

# Crear migración automática (detecta cambios en modelos)
alembic revision --autogenerate -m "Descripción del cambio"

# Aplicar migraciones pendientes
alembic upgrade head

# Ver historial
alembic history

# Rollback (revertir última migración)
alembic downgrade -1
```

## 📁 Estructura del Proyecto

```
uniformes-system-v2/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/         # Endpoints REST
│   │   ├── core/
│   │   │   └── config.py       # Configuración
│   │   ├── models/             # Modelos SQLAlchemy (TO DO)
│   │   ├── schemas/            # Schemas Pydantic (TO DO)
│   │   ├── services/           # Lógica de negocio (TO DO)
│   │   └── main.py             # App FastAPI
│   ├── alembic/                # Migraciones de BD
│   ├── tests/                  # Tests unitarios
│   ├── requirements.txt        # Dependencias Python
│   └── Dockerfile.dev          # Imagen Docker desarrollo
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes React (TO DO)
│   │   ├── pages/              # Páginas/vistas (TO DO)
│   │   ├── stores/             # Estado Zustand (TO DO)
│   │   ├── hooks/              # Custom hooks
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utilidades
│   │   ├── App.tsx             # Componente raíz
│   │   └── main.tsx            # Entry point
│   ├── src-tauri/              # Configuración Tauri
│   └── package.json
│
├── docker/
│   └── docker-compose.dev.yml  # Servicios desarrollo
│
├── docs/
│   ├── SETUP.md                # Guía de instalación detallada
│   ├── DATABASE.md             # Arquitectura de base de datos
│   ├── API.md                  # Documentación API
│   └── DEPLOYMENT.md           # Guía de despliegue
│
└── shared/                     # Código compartido (futuro)
```

## 🔗 URLs Útiles

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Backend API | http://localhost:8000 | API REST |
| API Docs (Swagger) | http://localhost:8000/docs | Documentación interactiva |
| API Docs (ReDoc) | http://localhost:8000/redoc | Docs alternativas |
| PostgreSQL | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Cache |
| Frontend Dev | App nativa | Tauri window |

## 🏗️ Arquitectura Multi-Tenant

El sistema permite gestionar **múltiples colegios** desde una sola instalación:

- **Aislamiento total de datos**: Cada colegio tiene sus propios productos, clientes, ventas
- **Catálogos independientes**: Precios y tipos de prendas configurables por colegio
- **Usuarios multi-colegio**: Un usuario puede tener diferentes roles en diferentes colegios
- **Reportes separados**: Cada colegio ve solo su información

Ver [docs/DATABASE.md](docs/DATABASE.md) para detalles de la arquitectura.

## 🔄 Sistema de Cambios y Devoluciones

El sistema incluye un módulo completo para gestionar cambios de productos ya vendidos:

### Tipos de Cambios Soportados
- **Cambio de Talla** (`size_change`): Ej. Camisa T14 → T16
- **Cambio de Producto** (`product_change`): Cambiar a un producto completamente diferente
- **Devolución** (`return`): Devolución sin reemplazo (reembolso)
- **Defecto** (`defect`): Cambio por producto defectuoso

### Flujo de Trabajo
1. **Vendedor crea solicitud**: Se valida stock y se calcula ajuste de precio automáticamente
2. **Sistema crea registro PENDING**: Queda pendiente de aprobación
3. **Admin aprueba/rechaza**:
   - **Aprobado**: Se ajusta inventario automáticamente (+1 producto devuelto, -1 producto nuevo)
   - **Rechazado**: No se realizan cambios en inventario

### Características
- ✅ Validación automática de stock antes de aprobar
- ✅ Cálculo automático de diferencia de precio
- ✅ Ajustes de inventario atómicos
- ✅ Auditoría completa de todos los cambios
- ✅ Restricciones por roles (SELLER crea, ADMIN aprueba)

### Ejemplo de Uso
```http
POST /api/v1/schools/{school_id}/sales/{sale_id}/changes
{
  "change_type": "size_change",
  "original_item_id": "uuid-del-item-original",
  "new_product_id": "uuid-del-nuevo-producto",
  "returned_quantity": 1,
  "new_quantity": 1,
  "reason": "Cliente necesita talla más grande"
}
```

Ver documentación completa en [docs/SALE_CHANGES.md](docs/SALE_CHANGES.md)

## 🧪 Testing

```bash
# Backend
cd backend
source venv/bin/activate
pytest

# Frontend
cd frontend
npm test
```

## 📦 Build para Producción

### Backend (Docker)
```bash
docker build -t uniformes-backend -f backend/Dockerfile.prod .
```

### Frontend (Aplicación Nativa)
```bash
cd frontend

# Build para tu sistema actual
npm run tauri:build

# Build para Windows (desde macOS/Linux)
npm run tauri:build-windows

# Los instaladores se generan en:
# frontend/src-tauri/target/release/bundle/
```

## 🛑 Detener Servicios

```bash
# Detener contenedores Docker (datos se mantienen)
docker-compose -f docker/docker-compose.dev.yml down

# Detener y eliminar volúmenes (BORRA DATOS)
docker-compose -f docker/docker-compose.dev.yml down -v
```

## 📚 Documentación Adicional

- [Setup Detallado](docs/SETUP.md) - Guía paso a paso de instalación
- [Arquitectura de BD](docs/DATABASE.md) - Diseño multi-tenant y esquema
- [API Reference](docs/API.md) - Endpoints y ejemplos
- [Deployment](docs/DEPLOYMENT.md) - Guía de despliegue en producción

## 🐛 Troubleshooting

### Backend no conecta a PostgreSQL
```bash
# Verificar que los contenedores estén corriendo
docker ps

# Ver logs de PostgreSQL
docker logs docker-postgres-1

# Reiniciar servicios
docker-compose -f docker/docker-compose.dev.yml restart
```

### Frontend no compila
```bash
# Limpiar cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Verificar Rust
rustc --version
```

### Port 8000 already in use
```bash
# Encontrar proceso usando el puerto
lsof -ti:8000

# Matar el proceso
kill -9 $(lsof -ti:8000)
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/NuevaFuncionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/NuevaFuncionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para preguntas o reportar bugs, abrir un [Issue](../../issues) en GitHub.
