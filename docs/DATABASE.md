# 🗄️ Arquitectura de Base de Datos - Sistema Multi-Tenant

Este documento describe el diseño de la base de datos para el Sistema de Uniformes v2.0, implementando arquitectura **multi-tenant** (múltiples colegios).

---

## 🎯 Concepto: Multi-Tenant

### ¿Qué es Multi-Tenant?

**Una sola instalación del software sirve a múltiples organizaciones (colegios)**, cada una con sus propios datos completamente aislados.

```
┌─────────────────────────────────────────────────┐
│         UNIFORMES SYSTEM (1 Aplicación)         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────┐  ┌────────────────┐        │
│  │ Colegio A      │  │ Colegio B      │        │
│  ├────────────────┤  ├────────────────┤        │
│  │ • Productos    │  │ • Productos    │        │
│  │ • Clientes     │  │ • Clientes     │        │
│  │ • Ventas       │  │ • Ventas       │        │
│  │ • Inventario   │  │ • Inventario   │        │
│  └────────────────┘  └────────────────┘        │
│         ↓                    ↓                  │
│  DATOS AISLADOS       DATOS AISLADOS           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Ventajas

- ✅ **Escalabilidad**: Agregar nuevos colegios sin modificar código
- ✅ **Seguridad**: Aislamiento total de datos entre colegios
- ✅ **Flexibilidad**: Cada colegio configura sus precios y productos
- ✅ **Mantenimiento**: Una sola aplicación, actualizaciones centralizadas
- ✅ **Costos**: Infraestructura compartida

---

## 📊 Modelo de Datos

### Niveles de Organización

```
NIVEL 0: Sistema
    └── Users (usuarios del sistema)

NIVEL 1: Tenants (Colegios)
    └── Schools
        └── UserSchoolRoles (relación users ↔ schools)

NIVEL 2: Catálogos (por colegio)
    └── GarmentTypes, Products, Inventory

NIVEL 3: Operaciones (por colegio)
    └── Clients, Sales, Orders, Exchanges

NIVEL 4: Finanzas (por colegio)
    └── Transactions, Expenses, AccountsPayable
```

---

## 🗂️ Esquema Detallado

### **1. USUARIOS Y AUTENTICACIÓN**

#### `users`
Usuarios del sistema (vendedores, administradores, etc.)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Campos clave:**
- `is_superuser`: Puede ver/administrar todos los colegios
- `is_active`: Permite deshabilitar usuarios sin borrarlos

---

### **2. COLEGIOS (TENANTS)**

#### `schools`
Instituciones educativas (cada una es un "tenant")

```sql
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,  -- "COL001", "COL002"
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),    -- "#003366"
    secondary_color VARCHAR(7),  -- "#FFD700"

    -- Información de contacto
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Configuración
    settings JSONB DEFAULT '{}',
    /* Ejemplo settings:
    {
        "currency": "COP",
        "tax_rate": 19,
        "commission_per_garment": 5000,
        "allow_credit_sales": true,
        "max_credit_days": 30
    }
    */

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schools_code ON schools(code);
CREATE INDEX idx_schools_is_active ON schools(is_active);
```

#### `user_school_roles`
Relación muchos a muchos: usuarios pueden tener roles en múltiples colegios

```sql
CREATE TABLE user_school_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- "owner", "admin", "seller", "viewer"
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, school_id)
);

CREATE INDEX idx_user_school_roles_user ON user_school_roles(user_id);
CREATE INDEX idx_user_school_roles_school ON user_school_roles(school_id);
```

**Roles:**
- `owner`: Propietario del colegio (todos los permisos)
- `admin`: Administrador (configuración, usuarios)
- `seller`: Vendedor (ventas, encargos, ver inventario)
- `viewer`: Solo lectura (reportes)

---

### **3. CATÁLOGOS DE PRODUCTOS**

#### `garment_types`
Tipos de prendas (cada colegio define los suyos)

```sql
CREATE TABLE garment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,  -- "Camiseta Manga Corta", "Sudadera", "Yomber"
    description TEXT,
    category VARCHAR(50),  -- "uniforme_diario", "uniforme_deportivo", "accesorios"

    -- Configuración
    requires_embroidery BOOLEAN DEFAULT FALSE,
    has_custom_measurements BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, name)
);

CREATE INDEX idx_garment_types_school ON garment_types(school_id);
CREATE INDEX idx_garment_types_category ON garment_types(school_id, category);
```

#### `products`
SKUs individuales (combinación de tipo + talla + color)

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    garment_type_id UUID NOT NULL REFERENCES garment_types(id) ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,  -- "CAM-T8-001" (autogenerado)
    name VARCHAR(255),          -- Nombre completo para mostrar

    -- Atributos
    size VARCHAR(10) NOT NULL,   -- "6", "8", "10", "S", "M", "L", "XL"
    color VARCHAR(50),           -- "Blanco", "Azul", "Gris"
    gender VARCHAR(10),          -- "unisex", "male", "female"

    -- Precios (cada colegio define los suyos)
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2),         -- Costo de producción/compra

    description TEXT,
    image_url VARCHAR(500),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, code)
);

CREATE INDEX idx_products_school ON products(school_id);
CREATE INDEX idx_products_garment_type ON products(garment_type_id);
CREATE INDEX idx_products_size ON products(school_id, size);
CREATE INDEX idx_products_is_active ON products(school_id, is_active);
```

#### `inventory`
Stock disponible por producto

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,  -- Alerta de stock bajo

    last_updated TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, product_id),

    CONSTRAINT chk_quantity_positive CHECK (quantity >= 0)
);

CREATE INDEX idx_inventory_school ON inventory(school_id);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_low_stock ON inventory(school_id, quantity)
    WHERE quantity <= min_stock_alert;
```

---

### **4. CLIENTES**

#### `clients`
Base de clientes por colegio

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    code VARCHAR(20) NOT NULL,  -- "CLI-0001" (autogenerado por colegio)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,

    -- Información del estudiante
    student_name VARCHAR(255),
    student_grade VARCHAR(50),  -- "3ro Primaria", "10mo"

    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, code)
);

CREATE INDEX idx_clients_school ON clients(school_id);
CREATE INDEX idx_clients_name ON clients(school_id, name);
CREATE INDEX idx_clients_phone ON clients(school_id, phone);
```

---

### **5. VENTAS**

#### `sales`
Transacciones de venta

```sql
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    code VARCHAR(30) NOT NULL,  -- "VNT-2024-0001"
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- Quien registró la venta

    sale_date TIMESTAMP DEFAULT NOW(),
    total NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    payment_method VARCHAR(20),  -- "cash", "transfer", "card", "credit"

    status VARCHAR(20) DEFAULT 'completed',  -- "pending", "completed", "cancelled"
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, code),

    CONSTRAINT chk_paid_amount CHECK (paid_amount >= 0),
    CONSTRAINT chk_total_positive CHECK (total > 0)
);

CREATE INDEX idx_sales_school ON sales(school_id);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_date ON sales(school_id, sale_date DESC);
CREATE INDEX idx_sales_status ON sales(school_id, status);
```

#### `sale_items`
Detalle de productos por venta

```sql
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,  -- Precio al momento de la venta
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,

    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_unit_price_positive CHECK (unit_price >= 0)
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

---

### **6. ENCARGOS (Pedidos Personalizados)**

#### `orders`
Pedidos por encargo (con medidas personalizadas, fechas de entrega)

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    code VARCHAR(30) NOT NULL,  -- "ENC-2024-0001"
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    order_date TIMESTAMP DEFAULT NOW(),
    delivery_date TIMESTAMP,
    expected_delivery_days INTEGER DEFAULT 7,

    total NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0,  -- Abonos
    balance NUMERIC(10, 2) GENERATED ALWAYS AS (total - paid_amount) STORED,

    status VARCHAR(20) DEFAULT 'pending',
    -- "pending", "in_production", "ready", "delivered", "cancelled"

    -- Medidas personalizadas (ej: para Yombers)
    custom_measurements JSONB,
    /* Ejemplo:
    {
        "delantero": 40,
        "trasero": 42,
        "espalda": 35,
        "cintura": 28,
        "largo": 75
    }
    */

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, code)
);

CREATE INDEX idx_orders_school ON orders(school_id);
CREATE INDEX idx_orders_client ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(school_id, status);
CREATE INDEX idx_orders_delivery_date ON orders(school_id, delivery_date);
```

#### `order_items`
Detalle de productos por encargo

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,

    CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

---

### **7. CAMBIOS/DEVOLUCIONES**

#### `exchanges`
Registro de cambios de productos

```sql
CREATE TABLE exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    code VARCHAR(30) NOT NULL,  -- "CMB-2024-0001"
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,

    exchange_date TIMESTAMP DEFAULT NOW(),

    total_returned NUMERIC(10, 2) DEFAULT 0,  -- Valor de productos devueltos
    total_new NUMERIC(10, 2) DEFAULT 0,       -- Valor de productos nuevos
    balance NUMERIC(10, 2) GENERATED ALWAYS AS (total_new - total_returned) STORED,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(school_id, code)
);

CREATE INDEX idx_exchanges_school ON exchanges(school_id);
CREATE INDEX idx_exchanges_client ON exchanges(client_id);
CREATE INDEX idx_exchanges_date ON exchanges(school_id, exchange_date DESC);
```

#### `exchange_items`
Detalle de productos en el cambio

```sql
CREATE TABLE exchange_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,

    returned_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    returned_quantity INTEGER DEFAULT 0,

    new_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    new_quantity INTEGER DEFAULT 0,

    price_difference NUMERIC(10, 2) DEFAULT 0
);

CREATE INDEX idx_exchange_items_exchange ON exchange_items(exchange_id);
```

---

### **8. FINANZAS**

#### `transactions`
Registro contable de movimientos (auto-generado por triggers)

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    transaction_date TIMESTAMP DEFAULT NOW(),

    type VARCHAR(30) NOT NULL,
    -- "sale", "expense", "payment_received", "commission", "exchange"

    category VARCHAR(50),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,  -- Positivo = ingreso, Negativo = egreso

    -- Referencias polimórficas
    related_type VARCHAR(20),  -- "sale", "order", "expense"
    related_id UUID,

    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_school ON transactions(school_id);
CREATE INDEX idx_transactions_date ON transactions(school_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(school_id, type);
CREATE INDEX idx_transactions_related ON transactions(related_type, related_id);
```

#### `expenses`
Gastos del negocio

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    expense_date TIMESTAMP DEFAULT NOW(),
    category VARCHAR(50) NOT NULL,
    -- "materials", "labor", "transport", "utilities", "rent", "other"

    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    supplier VARCHAR(255),
    receipt_url VARCHAR(500),  -- Foto/PDF del recibo

    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_expenses_school ON expenses(school_id);
CREATE INDEX idx_expenses_date ON expenses(school_id, expense_date DESC);
CREATE INDEX idx_expenses_category ON expenses(school_id, category);
```

#### `accounts_payable`
Cuentas por pagar / préstamos

```sql
CREATE TABLE accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    creditor VARCHAR(255) NOT NULL,  -- A quién se le debe
    concept TEXT NOT NULL,

    purchase_date DATE NOT NULL,
    due_date DATE NOT NULL,

    amount NUMERIC(10, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) DEFAULT 0,  -- % mensual
    paid_amount NUMERIC(10, 2) DEFAULT 0,

    is_paid BOOLEAN DEFAULT FALSE,
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_accounts_payable_school ON accounts_payable(school_id);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(school_id, due_date);
CREATE INDEX idx_accounts_payable_is_paid ON accounts_payable(school_id, is_paid);
```

---

## 🔐 Seguridad y Aislamiento

### Row-Level Security (Implementación futura con PostgreSQL RLS)

Cada query SIEMPRE incluye filtro por `school_id`:

```python
# SQLAlchemy con filtro automático
def get_products(db: Session, school_id: UUID):
    return db.query(Product).filter(
        Product.school_id == school_id,
        Product.is_active == True
    ).all()
```

### Middleware de Tenancy

```python
# FastAPI dependency
async def get_current_school(
    current_user: User = Depends(get_current_user)
) -> School:
    # Obtener el colegio activo del usuario
    # desde el token JWT o sesión
    return current_user.active_school
```

---

## 📈 Triggers y Automatizaciones

### Auto-generar códigos

```sql
-- Función para generar código de venta
CREATE OR REPLACE FUNCTION generate_sale_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code := 'VNT-' ||
                TO_CHAR(NEW.sale_date, 'YYYY') || '-' ||
                LPAD(nextval('sales_seq_' || NEW.school_id::text)::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_sale_code
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_sale_code();
```

### Actualizar inventario

```sql
-- Reducir inventario al registrar venta
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory
    SET quantity = quantity - NEW.quantity,
        last_updated = NOW()
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_on_sale
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_sale();
```

### Registrar movimiento contable

```sql
-- Crear transacción al completar venta
CREATE OR REPLACE FUNCTION create_transaction_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        INSERT INTO transactions (
            school_id, type, description, amount,
            related_type, related_id
        ) VALUES (
            NEW.school_id, 'sale',
            'Venta ' || NEW.code, NEW.total,
            'sale', NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 Vistas Útiles

### Vista de inventario bajo

```sql
CREATE VIEW low_stock_products AS
SELECT
    s.name AS school_name,
    gt.name AS garment_type,
    p.code,
    p.size,
    i.quantity,
    i.min_stock_alert
FROM inventory i
JOIN products p ON i.product_id = p.id
JOIN garment_types gt ON p.garment_type_id = gt.id
JOIN schools s ON p.school_id = s.id
WHERE i.quantity <= i.min_stock_alert
  AND p.is_active = TRUE;
```

### Vista de ventas por mes

```sql
CREATE VIEW monthly_sales AS
SELECT
    s.name AS school_name,
    DATE_TRUNC('month', v.sale_date) AS month,
    COUNT(v.id) AS total_sales,
    SUM(v.total) AS total_revenue
FROM sales v
JOIN schools s ON v.school_id = s.id
WHERE v.status = 'completed'
GROUP BY s.name, DATE_TRUNC('month', v.sale_date)
ORDER BY month DESC;
```

---

## 🚀 Migraciones con Alembic

### Crear migración inicial

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Initial multi-tenant schema"
alembic upgrade head
```

### Modificar esquema

1. Editar modelos en `backend/app/models/`
2. Generar migración: `alembic revision --autogenerate -m "Add field X"`
3. Revisar archivo generado en `alembic/versions/`
4. Aplicar: `alembic upgrade head`

---

## 📚 Próximos Pasos

1. ✅ Implementar modelos SQLAlchemy
2. ✅ Crear migración inicial
3. ✅ Aplicar migración
4. ✅ Insertar datos de prueba (seed data)
5. ✅ Implementar endpoints CRUD

Ver [API.md](API.md) para documentación de endpoints.
