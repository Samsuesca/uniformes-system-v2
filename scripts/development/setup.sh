#!/bin/bash
set -e

echo "🚀 CONFIGURANDO ENTORNO DE DESARROLLO"
echo "====================================="

# Verificar que estamos en la carpeta correcta
if [[ ! -f "backend/requirements.txt" ]]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Crear entorno virtual de Python
echo "🐍 Configurando entorno virtual de Python..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# Instalar dependencias de Node.js
echo "📦 Instalando dependencias de Node.js..."
cd frontend
npm install
cd ..

# Crear archivo .env
if [[ ! -f ".env" ]]; then
    echo "📝 Creando archivo .env..."
    cat > .env << 'ENVEOF'
# Database
DATABASE_URL=postgresql+asyncpg://uniformes_user:dev_password@localhost:5432/uniformes_db

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=dev-secret-key-change-in-production

# Environment
ENV=development
DEBUG=true
ENVEOF
fi

echo "✅ Configuración completada!"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Instalar Docker Desktop si no lo tienes"
echo "2. Ejecutar: docker-compose -f docker/docker-compose.dev.yml up -d"
echo "3. En otra terminal: cd frontend && npm run tauri:dev"
echo ""
echo "🔗 URLs importantes:"
echo "   Backend API: http://localhost:8000"
echo "   Docs API: http://localhost:8000/docs"
