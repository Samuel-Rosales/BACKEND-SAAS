$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.4.5"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.4.5.zip"

$dBackupDir = "D:\Respaldo de la versión 4.4.5"
$dZipPath = "D:\Respaldo_Version_4.4.5.zip"

Write-Host "Iniciando respaldo de la versión 4.4.5..."

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.5 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ambiente: Producción (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)

Esta carpeta contiene el código fuente blindado y limpio de la versión 4.4.5 de Guardian.

Novedades, correcciones y mejoras consolidadas:
1. Cuadre de Caja Blindado ante Anulaciones de Venta:
   - Desvinculación física de cobros en base de datos (cashRegisterId = null) al anular cualquier factura.
   - Filtrado a nivel de consulta en el servicio de caja registradora (cash-register.service) y reportes de caja (cash-register-report.service) para excluir terminantemente ventas con estado CANCELLED.
   - Deducción neta simétrica de reembolsos originados por notas de crédito.
   - Corrección retroactiva automática para ventas históricas previamente canceladas.
2. Retorno Integral al Inventario y Kardex al Anular Factura:
   - Incremento del stock físico en el lote (StockLot) correspondiente.
   - Registro auditable obligatorio del movimiento de entrada (IN) en el Kardex (StockMovement) con motivo "Anulación Venta #{receiptNumber}".
   - Respaldo de seguridad (fallback) para productos comercializados por presentación o sin trazabilidad previa de lotes.
3. Revalidación Reactiva en Tiempo Real (Frontend):
   - Mutación de claves de caché SWR en SaleDetailModal para refrescar al instante los indicadores de caja registradora y reportes financieros sin recargar el navegador.
4. Mejoras Heredadas de v4.4.4:
   - Auto-guardado de borradores de facturas de compra en almacenamiento local persistente con detección y restauración automática.
   - Protección nativa del navegador contra cierres o recargas accidentales.
   - Renovación proactiva de tokens JWT cada 30 minutos dentro del BusinessLayout.
5. Mejoras Heredadas de v4.4.3:
   - Consolidado financiero P&L con segregación de débito fiscal (IVA recaudado).
   - Inclusión obligatoria de comisiones de venta dentro de los egresos operativos.
   - Recálculo del punto de equilibrio basado en margen de contribución.
   - Cuadrícula KPI continua en una sola línea responsiva.

Para restaurar mediante Git en caso de emergencia:
Ejecuta el script 'RESTAURAR_VERSION_4.4.5.bat'.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.4.5 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.4.5-stable
echo Frontend restaurado exitosamente a backup/v4.4.5-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.4.5-stable
echo Backend restaurado exitosamente a backup/v4.4.5-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.4.5
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.5.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.5.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.4.5.bat") -Force

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
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.5.bat") -Destination "D:\RESTAURAR_VERSION_4.4.5.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.4.5.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}
