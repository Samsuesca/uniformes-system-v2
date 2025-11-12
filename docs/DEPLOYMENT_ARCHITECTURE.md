# 🏗️ Arquitectura de Despliegue - Uniformes System v2.0

## 📊 Visión General

Este documento describe la arquitectura de despliegue para convertir el sistema de local a distribuido multi-usuario.

### Arquitectura Objetivo

```
                    ☁️ CLOUD SERVER
                 (DigitalOcean/AWS/Railway)
                   PostgreSQL + FastAPI
                   (Centro de Datos único)
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   [Desktop App]     [Desktop App]    [Web Portal]
   Tauri - POS       Tauri - Admin    React - Clientes
   (Windows/Mac)     (Windows/Mac)    (Navegador web)
```

### Interfaces del Sistema

1. **Desktop App (Tauri)**
   - Usuarios: Vendedores, Administradores, Desarrolladores
   - Plataformas: Windows, macOS, Linux
   - Features: POS completo, gestión de inventario, reportes, impresión local

2. **Web Portal (React)**
   - Usuarios: Clientes externos (padres, estudiantes)
   - Plataformas: Cualquier navegador moderno
   - Features: Catálogo público, pedidos online, tracking

---

## 🗺️ Roadmap de Implementación

### **FASE 1: Testing Local (Mac ↔ Windows)** ⏱️ 2-3 días
**Objetivo:** Probar comunicación multi-computadora en red local

**Estado:** 🔄 En progreso

**Cambios necesarios:**
- ✅ Configurar backend para escuchar en `0.0.0.0` (todas las interfaces)
- ✅ Actualizar CORS para aceptar conexiones de red local
- ✅ Crear sistema de configuración de entorno en frontend
- ✅ Documentación de testing creada (PHASE1_TESTING.md)
- ⏳ Compilar app Tauri para Windows (.exe)
- ⏳ Testing: Mac (servidor) ↔ Windows (cliente)

**Resultado esperado:**
- Backend corriendo en Mac accesible desde Windows en LAN
- App Tauri en Windows conectándose exitosamente al backend Mac

---

### **FASE 2: Cloud Deployment** ⏱️ 1 semana
**Objetivo:** Backend en producción accesible desde internet

**Estado:** ⏳ Pendiente

**Infraestructura recomendada:**
- **Servidor:** DigitalOcean Droplet ($12/mes) - Ubuntu 22.04
- **Specs:** 2GB RAM, 1 vCPU, 50GB SSD
- **Stack:** Nginx + Docker Compose + PostgreSQL + Redis
- **SSL:** Certbot (Let's Encrypt - gratuito)
- **Dominio:** tu-dominio.com (requerido para SSL)

**Pasos:**
1. Configurar servidor VPS
2. Docker Compose para producción
3. Nginx como reverse proxy
4. SSL con Certbot
5. Migración de base de datos
6. Backups automáticos

**Costos estimados:**
- Servidor: $12/mes (DigitalOcean)
- Dominio: $10-15/año
- SSL: Gratuito (Let's Encrypt)
- **Total:** ~$12-13/mes

---

### **FASE 3: Desktop App Multi-Entorno** ⏱️ 3-5 días
**Objetivo:** App Tauri que se conecte a local O cloud

**Estado:** ⏳ Pendiente

**Features:**
- Selector de entorno en Settings (Local / LAN / Cloud)
- Builds multi-plataforma (Windows, macOS, Linux)
- Auto-update capability (opcional)
- Instaladores profesionales

**Distribución:**
- Windows: `.exe` installer (MSI o NSIS)
- macOS: `.app` bundle (DMG)
- Linux: `.AppImage` o `.deb`

---

### **FASE 4: Web Portal para Clientes** ⏱️ 2 semanas
**Objetivo:** Portal público para pedidos online

**Estado:** ⏳ Pendiente

**Nuevo proyecto:**
```
uniformes-system-v2/
├── backend/           # Compartido
├── frontend/          # Desktop App
└── customer-portal/   # NUEVO - Web público
```

**Features del portal:**
- Catálogo por colegio
- Carrito de compras
- Checkout (crear orden)
- Tracking de pedido
- Guía de tallas
- Filtros por tipo de prenda

**Deployment:**
- Opción A: Vercel/Netlify (gratuito, recomendado)
- Opción B: Mismo servidor con Nginx

---

## 📋 Estado Actual del Proyecto

### ✅ Completado (95% del MVP)

**Backend:**
- ✅ API REST completa (43+ endpoints)
- ✅ Multi-tenant architecture
- ✅ JWT authentication
- ✅ CRUD services (8 servicios)
- ✅ Sistema de ventas
- ✅ Sistema de cambios/devoluciones
- ✅ Gestión de inventario
- ✅ PostgreSQL + Redis en Docker

**Frontend:**
- ✅ Tauri desktop app funcional
- ✅ 7 páginas implementadas
- ✅ Login con JWT
- ✅ Sistema de ventas completo
- ✅ Gestión de cambios UI
- ✅ Impresión de recibos
- ✅ Validación de stock

### ⏳ Pendiente (5%)

**Backend:**
- Tests unitarios
- Reportes avanzados
- Exportación Excel/PDF

**Frontend:**
- Páginas: Clients, Orders, Settings (solo placeholders)
- Dashboard con stats reales
- Reportes y gráficos

---

## 🔐 Seguridad

### Producción
- ✅ JWT con expiración
- ✅ Passwords hasheados (bcrypt)
- ✅ CORS configurado por entorno
- ⏳ Rate limiting (TODO)
- ⏳ HTTPS obligatorio (Fase 2)
- ⏳ Backups automáticos (Fase 2)

### Desarrollo
- ✅ Secrets en `.env` (gitignored)
- ✅ `.env.example` documentado
- ⏳ Vault para secrets en producción (Fase 2)

---

## 🔄 Flujo de Actualización

### Desarrollo Local
```bash
# Backend
cd backend
git pull origin develop
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd frontend
git pull origin develop
npm install
npm run tauri dev
```

### Producción (Post-Fase 2)
```bash
# En servidor
cd uniformes-system-v2
git pull origin main
docker-compose -f docker/docker-compose.prod.yml up -d --build
docker exec backend alembic upgrade head
```

---

## 📞 Soporte y Escalabilidad

### Capacidad Actual (Post-Fase 2)
- **Usuarios simultáneos:** 50-100 usuarios
- **Colegios:** Ilimitados (multi-tenant)
- **Transacciones/día:** ~1000-5000
- **Almacenamiento:** 50GB (expandible)

### Escalabilidad Futura
Si se necesita más capacidad:
- Upgrade servidor: 4GB RAM ($24/mes)
- Load balancer + múltiples workers
- PostgreSQL con réplicas de lectura
- CDN para assets estáticos
- Redis Cluster para caché distribuido

---

## 📊 Monitoreo (Fase 2+)

### Métricas Clave
- Uptime del servidor (objetivo: 99.9%)
- Tiempo de respuesta API (<200ms)
- Errores 5xx (<0.1%)
- Espacio en disco
- Memoria/CPU usage

### Herramientas Recomendadas
- Logs: Docker logs + rotación
- Monitoring: Grafana + Prometheus (opcional)
- Alerts: Email/SMS en downtime
- Backups: Daily PostgreSQL dumps

---

## 🎯 Próximos Pasos Inmediatos

**HOY:**
1. ✅ Resolver problema de paths absolutos (COMPLETADO)
2. ✅ Configurar backend para red local (COMPLETADO)
3. ✅ Crear sistema de entornos en frontend (COMPLETADO)
4. ✅ Documentar testing Fase 1 (COMPLETADO)
5. ⏳ Compilar app para Windows

**ESTA SEMANA:**
5. Testing Mac ↔ Windows en LAN
6. Documentar proceso de build multi-plataforma
7. Preparar servidor cloud (opcional: ya empezar)

**PRÓXIMAS 2 SEMANAS:**
8. Deployment a cloud
9. Testing en producción
10. Builds finales para distribución

---

**Última actualización:** 2025-11-09
**Versión:** v2.0.0-dev
**Autor:** Angel Samuel Suesca Rios
