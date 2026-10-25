$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.5.0"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.5.0.zip"

$dBackupDir = "D:\Respaldo de la versión 4.5.0"
$dZipPath = "D:\Respaldo_Version_4.5.0.zip"

Write-Host "=========================================================="
Write-Host "   INICIANDO RESPALDO OFICIAL DE GUARDIÁN VERSIÓN 4.5.0"
Write-Host "=========================================================="

# 1. Preparar directorio local
if (Test-Path $localBackupDir) {
    Remove-Item -Path $localBackupDir -Recurse -Force
}
New-Item -ItemType Directory -Path $localBackupDir -Force | Out-Null

$frontDest = Join-Path $localBackupDir "front"
$backDest = Join-Path $localBackupDir "back"

# Robocopy front excluyendo node_modules, .git, dist, .astro
Write-Host "[1/6] Copiando Frontend de forma limpia..."
robocopy (Join-Path $baseDir "front") $frontDest /E /XD node_modules .git dist .astro /XF *.log | Out-Null
Write-Host "Frontend copiado limpiamente a $frontDest"

# Robocopy back excluyendo node_modules, .git, dist
Write-Host "[2/6] Copiando Backend de forma limpia..."
robocopy (Join-Path $baseDir "back") $backDest /E /XD node_modules .git dist /XF *.log | Out-Null
Write-Host "Backend copiado limpiamente a $backDest"

# 2. Agregar instrucciones técnicas de restauración
$fechaActual = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$instructions = @"
# INSTRUCCIONES DE RESTAURACIÓN Y DOCUMENTACIÓN TÉCNICA - VERSIÓN 4.5.0 ESTABLE
Fecha: $fechaActual
Ambiente: Servidor Principal (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)
Versión: Guardián v4.5.0 (Front: 4.5.0 | Back: 1.0.2)

Esta carpeta contiene el código fuente blindado, limpio y auditado de la versión 4.5.0 de Guardián.

=============================================================================
NOVEDADES, MEJORAS Y ARQUITECTURA DE LA VERSIÓN 4.5.0
=============================================================================

1. SUITE INTEGRAL GUARDIÁN AI (ASISTENTE EJECUTIVO INTELIGENTE):
   - Integración nativa con Gemini 2.5 Flash mediante API en backend y streaming seguro.
   - Tabla de cuotas y consumo de tokens por empresa (ai_usage) para prevención de sobrecostos.
   - Herramientas (Function Calling) conectadas al negocio en tiempo real:
     * get_vendor_commissions: Cálculo y desglose analítico de ventas y comisiones por vendedor.
     * audit_inactive_inventory: Auditoría de dinero dormido e inventario estancado sin rotación.
     * generate_whatsapp_collection_reminder: Generación automática de mensajes de cobranza personalizados para clientes con saldos vencidos.
     * get_system_help: Tutor operativo interactivo que guía paso a paso sobre cómo usar cada módulo del sistema.
     * get_financial_overview y get_inventory_overview: Consultas consolidadas de caja, balance y depósitos.
   - Motor de voz blindado en Frontend:
     * Lectura de voz con Web Speech API dividida en oraciones secuenciales para evitar el congelamiento de 15 segundos en Chromium.
     * Liberador de contexto de audio Web Audio API (unlockAudioPipe) y recolección de basura con window.currentUtterance.
     * Reconocimiento de voz por micrófono (dictado para preguntas directas).
   - Experiencia de usuario Responsive Móvil / Escritorio:
     * Móvil (< md): Píldora compacta y estética '[ 🤖 IA ]' con whitespace-nowrap en cabecera superior junto a la versión v4.5.0.
     * Escritorio (>= md): Botón expandido en breadcrumbs junto a la credencial 'DUEÑO'.
     * Modal interactivo de conversación con tabs para cambiar de negocio, métricas en vivo y botón de silencio/pausa.

2. MÓDULO DE VENTAS EN ESPERA (PARKED SALES):
   - Capacidad de pausar una venta en el punto de venta (POS) y guardarla localmente.
   - Recuperación inmediata de la orden en espera sin pérdida de artículos, precios ni cliente.

3. DISEÑADOR Y CONFIGURACIÓN DINÁMICA DE TICKETS:
   - Columna 'ticketConfig' en la entidad de negocios (businesses).
   - Personalización de formato de impresión de comprobantes fiscales y tickets de venta según requerimientos de la tienda.

4. RECARGO POR CRÉDITO CONFIGURABLE (10% / 20%):
   - Política de recargo opcional por cliente/empresa para financiamiento y ventas a crédito.
   - Cálculo automático de comisiones e intereses moratorios sobre cuotas vencidas.

5. IDENTIFICACIÓN FISCAL (RIF) Y MORA:
   - Configuración de RIF institucional en encabezados de documentos y recibos.
   - Políticas de cobro de recargos por mora en cuotas retrasadas.

=============================================================================
PROCEDIMIENTO DE RESTAURACIÓN MANUAL MEDIANTE GIT
=============================================================================
En caso de requerir volver a esta versión en el servidor o localmente:
1. Frontend:
   git checkout master
   git reset --hard backup/v4.5.0-stable
2. Backend:
   git checkout main
   git reset --hard backup/v4.5.0-stable

O ejecute directamente el script automatizado RESTAURAR_VERSION_4.5.0.bat.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8
Write-Host "[3/6] Instrucciones de restauración generadas."

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.5.0 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.5.0-stable
echo Frontend restaurado exitosamente a backup/v4.5.0-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.5.0-stable
echo Backend restaurado exitosamente a backup/v4.5.0-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.5.0
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.5.0.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.5.0.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.5.0.bat") -Force
Write-Host "[4/6] Script ejecutable RESTAURAR_VERSION_4.5.0.bat generado."

# 4. Crear Zip Local
if (Test-Path $localZipPath) {
    Remove-Item -Path $localZipPath -Force
}
Write-Host "[5/6] Comprimiendo respaldo local a formato ZIP..."
Compress-Archive -Path "$localBackupDir\*" -DestinationPath $localZipPath -CompressionLevel Optimal
Write-Host "Respaldo local comprimido exitosamente: $localZipPath"

# 5. Replicar Respaldo en la Unidad D:\
Write-Host "[6/6] Verificando unidad de almacenamiento secundario D:\..."
if (Test-Path "D:\") {
    Write-Host "Copiando respaldo a la unidad D:\..."
    if (Test-Path $dBackupDir) {
        Remove-Item -Path $dBackupDir -Recurse -Force
    }
    robocopy $localBackupDir $dBackupDir /E /NFL /NDL /NJH /NJS | Out-Null
    Copy-Item -Path $localZipPath -Destination $dZipPath -Force
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.5.0.bat") -Destination "D:\RESTAURAR_VERSION_4.5.0.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.5.0.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "  RESPALDO DE GUARDIÁN VERSIÓN 4.5.0 COMPLETADO CON ÉXITO"
Write-Host "=========================================================="
