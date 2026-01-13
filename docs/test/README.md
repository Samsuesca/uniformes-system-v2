# Testing

Documentacion de estrategias de testing y resultados.

---

## Contenido

| Documento | Descripcion |
|-----------|-------------|
| [testing-guide.md](./testing-guide.md) | Guia general de testing |
| [phase1-testing-guide.md](./phase1-testing-guide.md) | Guia de testing Phase 1 (LAN) |
| [phase1-results.md](./phase1-results.md) | Resultados de Phase 1 |

---

## Estado Actual de Tests

### Backend (Python/pytest)

| Tipo | Archivos | Tests |
|------|----------|-------|
| Unit tests | 5 | 140 |
| API tests | 6 | 133 |
| Integration | 1 | 11 |
| **Total** | 12 | **284** |

### Frontend

- Framework: Vitest
- Estado: En expansion

---

## Ejecutar Tests

### Backend

```bash
cd backend
source venv/bin/activate
pytest
pytest --cov=app  # Con cobertura
```

### Frontend

```bash
cd frontend
npm run test
```

---

## Fases de Testing

| Fase | Descripcion | Estado |
|------|-------------|--------|
| Phase 1 | Testing LAN (Mac ↔ Windows) | Completado |
| Phase 2 | Testing con datos reales | En progreso |
| Phase 3 | Testing de carga | Pendiente |

---

[← Volver al indice](../README.md)
