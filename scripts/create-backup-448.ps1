$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.4.8"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.4.8.zip"

$dBackupDir = "D:\Respaldo de la versión 4.4.8"
$dZipPath = "D:\Respaldo_Version_4.4.8.zip"

Write-Host "Iniciando respaldo de la versión 4.4.8..."

# 1. Preparar directorio local
if (Test-Path $localBackupDir) {
    Remove-Item -Path $localBackupDir -Recurse -Force
}
New-Item -ItemType Directory -Path $localBackupDir -Force | Out-Null

$frontDest = Join-Path $localBackupDir "front"
$backDest = Join-Path $localBackupDir "back"

# Robocopy front excluyendo node_modules, .git, dist, .astro
robocopy (Join-Path $baseDir "front") $frontDest /E /XD node_modules .git dist .astro /XF *.log | Out-Null
Write-Host "Front copiado limpiamente a $frontDest"

# Robocopy back excluyendo node_modules, .git, dist
robocopy (Join-Path $baseDir "back") $backDest /E /XD node_modules .git dist /XF *.log | Out-Null
Write-Host "Back copiado limpiamente a $backDest"

# 2. Agregar instrucciones técnicas de restauración
$instructions = @"
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.8 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ambiente: Servidor Principal (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)

Esta carpeta contiene el código fuente blindado y limpio de la versión 4.4.8 de Guardian.

Novedades, correcciones y mejoras consolidadas:
1. Corrección Crítica en PDF del Reporte de Ventas:
   - Eliminación de mancha oscura generada por el estiramiento de fondo de fila en Yoga Flexbox (@react-pdf/renderer v4).
   - Estilo aplicado individualmente a celdas con repetición de cabecera automática ('fixed') en cada página.
   - Protección con 'wrap={false}' para evitar quiebres anómalos de renglones entre páginas.
2. Descarga Oficial Directa de Ventas:
   - Botón directo y despejado de 'Descargar PDF' con avisos de estado.
   - Retiro de opción y librerías externas no requeridas (xlsx), optimizando el bundle.
3. Consolidación de Versión 4.4.7:
   - Filtro por Fechas en Reportes de Inventario (Hoy, Esta semana, Este mes, Rango personalizado).
   - Acceso transversal directo a artículos vendidos de hoy.
4. Consolidación de Versión 4.4.6:
   - Comisión gerencial por sucursal (1.5% sin IVA).
   - Deducción proporcional en devoluciones y anulación total en eliminación de factura.
   - Reflejo en reporte financiero P&L y comisiones de venta.

Para restaurar mediante Git en caso de emergencia:
Ejecuta el script 'RESTAURAR_VERSION_4.4.8.bat'.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.4.8 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.4.8-stable
echo Frontend restaurado exitosamente a backup/v4.4.8-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.4.8-stable
echo Backend restaurado exitosamente a backup/v4.4.8-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.4.8
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.8.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.8.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.4.8.bat") -Force

# 4. Crear Zip Local
if (Test-Path $localZipPath) {
    Remove-Item -Path $localZipPath -Force
}
Compress-Archive -Path "$localBackupDir\*" -DestinationPath $localZipPath -CompressionLevel Optimal
Write-Host "Respaldo local comprimido: $localZipPath"

# 5. Replicar Respaldo en la Unidad D:\
if (Test-Path "D:\") {
    Write-Host "Copiando respaldo a la unidad D:\..."
    if (Test-Path $dBackupDir) {
        Remove-Item -Path $dBackupDir -Recurse -Force
    }
    robocopy $localBackupDir $dBackupDir /E /NFL /NDL /NJH /NJS | Out-Null
    Copy-Item -Path $localZipPath -Destination $dZipPath -Force
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.8.bat") -Destination "D:\RESTAURAR_VERSION_4.4.8.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.4.8.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}
