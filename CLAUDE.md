# Claude AI - Contexto del Proyecto

Este archivo contiene informacion importante para que Claude Code pueda asistir efectivamente en el desarrollo del proyecto **Uniformes System v2.0**.

---

## Informacion del Proyecto

### Descripcion General
Sistema de gestion de uniformes profesional con arquitectura **multi-tenant** (multiples colegios), disenado para manejar inventario, ventas, encargos personalizados y **contabilidad global del negocio**.

### Caracteristicas Principales
- **Multi-Colegio**: Un solo sistema gestiona multiples instituciones
- **Contabilidad Global**: Un negocio, una caja, un banco - los colegios son fuentes de ingreso
- **Aplicacion Nativa**: Desktop app multiplataforma (Windows, macOS, Linux) usando Tauri
- **Portal Web**: Sistema de pedidos online para padres de familia
- **API REST**: Backend robusto con FastAPI y PostgreSQL
- **Cloud Deployment**: Servidor VPS en produccion

---

## Arquitectura Contable (IMPORTANTE)

### Concepto Clave: Contabilidad del NEGOCIO, no por Colegio

El negocio "Uniformes Consuelo Rios" tiene:
- **UNA SOLA Caja** (efectivo fisico en la tienda)
- **UNA SOLA cuenta bancaria**
- **UN SOLO balance general**
- **Gastos compartidos** (luz, agua, salarios, proveedores)

Los colegios son **fuentes de ingreso** - categorias para saber de donde viene el dinero, pero todo va a la misma caja/banco.

### school_id en Contabilidad

| Modelo | school_id | Razon |
|--------|-----------|-------|
| `BalanceAccount` | NULL (global) | Caja y Banco son del negocio |
| `BalanceEntry` | NULL (global) | Entradas de auditoria globales |
| `Expense` | OPCIONAL | Mayoría globales, algunos por colegio |
| `AccountsPayable` | OPCIONAL | Proveedores del negocio |
| `AccountsReceivable` | OPCIONAL | CxC pueden filtrar por origen |
| `Transaction` | OPCIONAL | Para saber origen de ingreso |
| `DailyCashRegister` | NULL (global) | Una caja diaria para todo |

### Endpoints Globales (sin school_id)

```
GET  /global/accounting/cash-balances     # Saldos Caja y Banco
GET  /global/accounting/expenses          # Gastos del negocio
POST /global/accounting/expenses          # Crear gasto
GET  /global/accounting/receivables-payables  # CxC y CxP
POST /global/accounting/receivables       # Crear CxC
POST /global/accounting/payables          # Crear CxP
GET  /global/accounting/balance-accounts  # Cuentas contables
POST /global/accounting/balance-accounts  # Crear cuenta
```

### AccountType Enum (valores en minuscula)

```python
class AccountType(str, Enum):
    asset_current = "asset_current"      # Activo Corriente (Caja, Banco)
    asset_fixed = "asset_fixed"          # Activo Fijo (Equipos, Maquinaria)
    liability_current = "liability_current"  # Pasivo Corriente
    liability_long = "liability_long"    # Pasivo Largo Plazo
    equity = "equity"                    # Patrimonio
    income = "income"                    # Ingresos
    expense = "expense"                  # Gastos
```

---

## Stack Tecnologico

**Backend:**
- Python 3.10+
- FastAPI 0.104.1
- SQLAlchemy 2.0.23 (async)
- PostgreSQL 15
- Alembic (migraciones)
- Pydantic v2

**Frontend (Tauri Desktop):**
- Tauri (Rust + WebView)
- React 18 + TypeScript
- Tailwind CSS
- Zustand (estado)
- Axios

**Portal Web (Next.js):**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

**Infraestructura:**
- VPS: 104.156.247.226 (Vultr)
- Dominio: uniformesconsuelo.com
- SSL: Certbot/Let's Encrypt
- Nginx: Reverse proxy
- Systemd: Servicios backend

---

## Estructura del Proyecto

```
uniformes-system-v2/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── accounting.py         # Contabilidad por colegio
│   │   │   ├── global_accounting.py  # Contabilidad GLOBAL
│   │   │   ├── sales.py
│   │   │   ├── orders.py
│   │   │   ├── products.py
│   │   │   └── ...
│   │   ├── models/
│   │   │   ├── accounting.py  # BalanceAccount, Expense, CxC, CxP
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── accounting.py
│   │   │   ├── balance_integration.py
│   │   │   └── ...
│   │   └── schemas/
│   │       └── accounting.py  # Pydantic schemas
│   └── alembic/               # Migraciones
│
├── frontend/                  # App Tauri (desktop)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Accounting.tsx     # Vista contabilidad GLOBAL
│   │   │   ├── Sales.tsx
│   │   │   ├── Products.tsx
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── globalAccountingService.ts  # API global
│   │   │   ├── accountingService.ts        # API por colegio
│   │   │   └── ...
│   │   └── stores/
│   │       └── authStore.ts
│   └── src-tauri/
│
├── web-portal/               # Portal padres (Next.js)
│   ├── app/
│   │   └── [school_slug]/    # Rutas por colegio
│   └── lib/
│
└── docs/
```

---

## Estado Actual del Desarrollo

### Completado

**Infraestructura Cloud:**
- VPS configurado y operativo
- SSL/HTTPS funcionando
- Nginx como reverse proxy
- Backend como servicio systemd
- Dominio uniformesconsuelo.com

**Backend API:**
- Autenticacion JWT
- Multi-tenancy (school_id)
- Sistema de ventas completo
- Sistema de cambios/devoluciones
- Contabilidad global (endpoints /global/*)
- Balance de cuentas CRUD
- Activos fijos y pasivos
- CxC y CxP globales
- Gastos del negocio
- Integracion automatica ventas → contabilidad

**Frontend Desktop (Tauri):**
- Login funcional
- Dashboard
- Gestion de productos
- Sistema de ventas completo
- Cambios y devoluciones
- Contabilidad GLOBAL (independiente del selector de colegio)
- Balance de cuentas (Activos, Pasivos, Patrimonio)
- Gastos del negocio
- CxC y CxP
- Impresion de recibos

**Portal Web:**
- Catalogo de productos por colegio
- Carrito de compras
- Sistema de pedidos web
- Verificacion telefonica

### Pendiente (TODO)

**Alta Prioridad:**
- [ ] Pagina de Reportes con filtros por colegio
- [ ] Dashboard con estadisticas reales
- [ ] Conectar paginas Clients y Orders con API

**Media Prioridad:**
- [ ] Sistema de encargos personalizados UI
- [ ] Exportacion a Excel/PDF
- [ ] Tests unitarios
- [ ] Notificaciones

---

## Base de Datos

### Tablas Principales

**Sistema:**
- `users`, `user_school_roles`

**Tenants:**
- `schools`

**Catalogos (por colegio):**
- `garment_types`, `products`, `inventory`

**Operaciones (por colegio):**
- `clients`, `sales`, `sale_items`, `sale_changes`
- `orders`, `order_items`
- `web_orders`, `web_order_items`

**Contabilidad (GLOBAL - school_id nullable):**
- `balance_accounts` - Cuentas contables
- `balance_entries` - Movimientos/Auditoria
- `expenses` - Gastos del negocio
- `accounts_receivable` - Cuentas por cobrar
- `accounts_payable` - Cuentas por pagar
- `transactions` - Transacciones
- `daily_cash_registers` - Caja diaria

### Migraciones Aplicadas

1. `4093d4173dee` - Initial multi-tenant schema
2. `d868decca943` - Add sale_changes table
3. `xxx_global_accounting` - school_id nullable en contabilidad
4. Multiples migraciones de ajustes contables

---

## Servicios Frontend

### globalAccountingService.ts (USAR PARA CONTABILIDAD)

```typescript
// Saldos de caja y banco
getCashBalances(): Promise<CashBalancesResponse>

// Gastos
getExpenses(params): Promise<PaginatedResponse<Expense>>
createExpense(data): Promise<Expense>

// CxC y CxP
getReceivablesPayables(): Promise<ReceivablesPayablesResponse>
createReceivable(data): Promise<AccountsReceivable>
createPayable(data): Promise<AccountsPayable>

// Cuentas de balance
getBalanceAccounts(params): Promise<BalanceAccount[]>
createBalanceAccount(data): Promise<BalanceAccount>
updateBalanceAccount(id, data): Promise<BalanceAccount>
deleteBalanceAccount(id): Promise<void>
```

### accountingService.ts (por colegio - para reportes)

```typescript
// Para reportes especificos de un colegio
getSchoolTransactions(schoolId, params)
getSchoolReceivables(schoolId)
```

---

## Comandos Utiles

### Desarrollo Local

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend Tauri
cd frontend && npm run tauri:dev

# Portal Web
cd web-portal && npm run dev
```

### Servidor (VPS)

```bash
# Deploy
ssh root@104.156.247.226 "cd /var/www/uniformes-system-v2 && git pull origin develop && systemctl restart uniformes-api"

# Ver logs
ssh root@104.156.247.226 "tail -100 /var/log/uniformes/backend.log"

# Restart servicios
ssh root@104.156.247.226 "systemctl restart uniformes-api"
```

### Git

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre
# ... cambios ...
git add . && git commit -m "feat: descripcion"
git push -u origin feature/nombre
```

---

## Notas para Claude

### Al Asistir en Contabilidad

1. **NUNCA** hacer contabilidad dependiente del selector de colegio del header
2. Usar `globalAccountingService` para operaciones contables
3. Los endpoints son `/global/accounting/*` (sin school_id en URL)
4. `school_id` es OPCIONAL en gastos, CxC, CxP - para filtrar/reportes
5. AccountType enum usa valores **minuscula**: `asset_fixed`, no `ASSET_FIXED`

### Convenciones de Codigo

**Python:**
- Async/await obligatorio
- Type hints en todo
- SQLAlchemy 2.0 style

**TypeScript:**
- Functional components + hooks
- Zustand para estado global
- Types estrictos

### Metodos de Pago

```typescript
type PaymentMethod = 'cash' | 'nequi' | 'transfer' | 'card' | 'credit';
```

---

## Informacion del Desarrollador

- **Nombre**: Angel Samuel Suesca Rios
- **GitHub**: https://github.com/Samsuesca
- **Servidor**: 104.156.247.226
- **Dominio**: uniformesconsuelo.com

---

**Ultima actualizacion**: 2025-12-16
**Version del proyecto**: v2.0.0
**Estado**: **EN PRODUCCION** - Cloud deployment activo
