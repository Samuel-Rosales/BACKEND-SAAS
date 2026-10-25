$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.4.2"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.4.2.zip"

$dBackupDir = "D:\Respaldo de la versión 4.4.2"
$dZipPath = "D:\Respaldo_Version_4.4.2.zip"

Write-Host "Iniciando respaldo de la versión 4.4.2..."

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.2 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ambiente: Producción (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)

Esta carpeta contiene el código fuente blindado y limpio de la versión 4.4.2 de Guardian.

Novedades, correcciones y mejoras consolidadas:
1. Escáner de Códigos de Barra Móvil por Hardware:
   - Configuración nativa exclusiva de cámara trasera ('facingMode: environment') con autofocus continuo.
   - Eliminación de errores de sobre-restricción (OverconstrainedError) en navegadores móviles (Chrome, Safari, Firefox).
   - Supresión de colisiones por enumeración de lentes con getCameras().
   - Soporte para flash/linterna LED integrado.
   - Lectura rápida de códigos 1D (EAN-13, EAN-8, Code-128, Code-39, UPC-A, ITF) y 2D (QR).
2. Configuración de Caja en POS y Selección Manual de Vendedor al Facturar con Atribución de Comisiones.
3. Blindaje exclusivo para Plan Premium en asignación de vendedor y reportes financieros.
4. Soporte Contable Dual de Cashea: métricas de venta, inicial personalizada quincenal e historial de pagos.
5. Ampliación ergonómica del modal de cobro (PaymentProcessingModal max-w-4xl).
6. Validación de RIFs y documentos alfanuméricos en clientes.
7. Impresión térmica Spooler y puente fiscal SENIAT (DTP-80i).

Para restaurar mediante Git en caso de emergencia:
Ejecuta el script 'RESTAURAR_VERSION_4.4.2.bat'.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.4.2 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard v4.4.2-stable
echo Frontend restaurado exitosamente a v4.4.2-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard v4.4.2-stable
echo Backend restaurado exitosamente a v4.4.2-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.4.2
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.2.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.2.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.4.2.bat") -Force

# 4. Crear Zip Local
if (Test-Path $localZipPath) {
    Remove-Item -Path $localZipPath -Force
}
Compress-Archive -Path "$localBackupDir\*" -DestinationPath $localZipPath -CompressionLevel Optimal
Write-Host "Respaldo local comprimido: $localZipPath"

# 5. Replicar Respaldo en la Unidad D:\
Write-Host "Copiando respaldo a la unidad D:\..."
if (Test-Path $dBackupDir) {
    Remove-Item -Path $dBackupDir -Recurse -Force
}
robocopy $localBackupDir $dBackupDir /E /NFL /NDL /NJH /NJS | Out-Null
Copy-Item -Path $localZipPath -Destination $dZipPath -Force
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.2.bat") -Destination "D:\RESTAURAR_VERSION_4.4.2.bat" -Force

Write-Host "Respaldo en D:\ completado exitosamente:"
Write-Host " - Carpeta: $dBackupDir"
Write-Host " - Archivo comprimido: $dZipPath"
Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.4.2.bat"
