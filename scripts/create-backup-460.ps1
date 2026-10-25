$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.6.0"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.6.0.zip"

$dBackupDir = "D:\Respaldo de la versión 4.6.0"
$dZipPath = "D:\Respaldo_Version_4.6.0.zip"

Write-Host "=========================================================="
Write-Host "   INICIANDO RESPALDO OFICIAL DE GUARDIÁN VERSIÓN 4.6.0"
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
# INSTRUCCIONES DE RESTAURACIÓN Y DOCUMENTACIÓN TÉCNICA - VERSIÓN 4.6.0 ESTABLE
Fecha: $fechaActual
Ambiente: Servidor Principal (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)
Versión: Guardián v4.6.0 (Front: 4.6.0 | Back: 1.0.2)

Esta carpeta contiene el código fuente blindado, limpio y auditado de la versión 4.6.0 de Guardián.

=============================================================================
NOVEDADES, MEJORAS Y ARQUITECTURA DE LA VERSIÓN 4.6.0
=============================================================================

1. SUITE DE DISEÑO E IMPRESIÓN DE ETIQUETAS DE PRODUCTOS (58mm / 80mm / OFERTAS):
   - Módulo en Configuración -> Diseñador de Etiquetas con previsualización en tiempo real.
   - Soporte para formatos térmicos de 80mm y 58mm (estándar compacto 54x38mm).
   - Tres modos de plantilla: Estándar, Moderna y Promocional con cinta '★ OFERTA ESPECIAL ★'.
   - Opciones granulares de visibilidad: Nombre de negocio, RIF, Nombre del producto, SKU, unidad/presentación, código de barras y texto editable al pie.
   - Modos monetarios: USD Ref, Bolívares (Bs. tasa oficial BCV) y Bimonetario simultáneo (vertical u horizontal).

2. GENERADOR UNIVERSAL DE CÓDIGO DE BARRAS (getBarcodeValue):
   - Soporte para códigos de barra de productos, presentaciones activas y SKU.
   - Autogeneración inteligente para productos de servicio o sin código previo (prefijo nacional 759 + id del producto).
   - Eliminación definitiva de espacios vacíos en etiquetas para artículos no codificados.

3. IMPRESIÓN DIRECTA DESDE EL INVENTARIO:
   - Al pulsar 'Imprimir Etiquetas', se abre directamente el modal de emisión con la configuración y formato guardados del negocio.
   - Fidelidad visual idéntica entre el diseñador, la vista previa de inventario y el PDF final.

4. REDISEÑO ERGONÓMICO EN CONFIGURACIÓN DE IMPRESORA:
   - Barra de pestañas segmentada a todo lo ancho para Factura y Etiquetas.
   - Selector visual destacado de modelo de impresora y ancho de papel térmico.

5. SUITE COMPLETA GUARDIÁN AI (ASISTENTE EJECUTIVO INTELIGENTE):
   - Auditor de dinero dormido, tutor operativo, cobranza inteligente por WhatsApp y límites de cuota por negocio.

=============================================================================
PROCEDIMIENTO DE RESTAURACIÓN MANUAL MEDIANTE GIT
=============================================================================
En caso de requerir volver a esta versión en el servidor o localmente:
1. Frontend:
   git checkout master
   git reset --hard backup/v4.6.0-stable
2. Backend:
   git checkout main
   git reset --hard backup/v4.6.0-stable

O ejecute directamente el script automatizado RESTAURAR_VERSION_4.6.0.bat.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8
Write-Host "[3/6] Instrucciones de restauración generadas."

# 3. Crear script de restauración .bat
$batContent = @'
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.6.0 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.6.0-stable
echo Frontend restaurado exitosamente a backup/v4.6.0-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.6.0-stable
echo Backend restaurado exitosamente a backup/v4.6.0-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.6.0
echo ======================================================
pause
'@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.6.0.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.6.0.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.6.0.bat") -Force
Write-Host "[4/6] Script ejecutable RESTAURAR_VERSION_4.6.0.bat generado."

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
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.6.0.bat") -Destination "D:\RESTAURAR_VERSION_4.6.0.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.6.0.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "  RESPALDO DE GUARDIÁN VERSIÓN 4.6.0 COMPLETADO CON ÉXITO"
Write-Host "=========================================================="
