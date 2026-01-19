#!/bin/bash

# 🚀 Script para Analizar Rendimiento de Build

echo "📊 Análisis de Rendimiento - Toliboy Dashboard"
echo "============================================="
echo ""

# 1. Tamaño total del proyecto
echo "📁 Tamaño del Proyecto:"
du -sh /home/david-dev/toliboy_jobs/toliboy-dasboard
du -sh /home/david-dev/toliboy_jobs/toliboy-dasboard/node_modules
echo ""

# 2. Número de archivos
echo "📑 Conteo de Archivos:"
find /home/david-dev/toliboy_jobs/toliboy-dasboard/src -name "*.ts" | wc -l
echo "   TypeScript files found"
find /home/david-dev/toliboy_jobs/toliboy-dasboard/src -name "*.html" | wc -l
echo "   HTML files found"
find /home/david-dev/toliboy_jobs/toliboy-dasboard/src -name "*.scss" | wc -l
echo "   SCSS files found"
echo ""

# 3. Dependencias grandes
echo "📦 Top Dependencias Pesadas:"
npm list --depth=0 2>/dev/null | head -20
echo ""

echo "✅ Para un análisis más detallado:"
echo "   cd /home/david-dev/toliboy_jobs/toliboy-dasboard"
echo "   npm run build -- --stats-json"
echo "   npx webpack-bundle-analyzer dist/vixon/stats.json"
