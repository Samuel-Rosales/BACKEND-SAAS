$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.4.11"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.4.11.zip"

$dBackupDir = "D:\Respaldo de la versión 4.4.11"
$dZipPath = "D:\Respaldo_Version_4.4.11.zip"

Write-Host "Iniciando respaldo de la versión 4.4.11..."

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.11 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ambiente: Servidor Principal (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)

Esta carpeta contiene el código fuente blindado y limpio de la versión 4.4.11 de Guardian.

Novedades, correcciones y mejoras consolidadas:
1. Reestructuración Estratégica de Planes:
   - Lanzamiento de Plan Comercial ($15.00/mes) en sustitución de 'Plan Básico'.
   - Actualización de Plan Premium ($25.00/mes) con conjunto exclusivo de super-poderes.
   - Desactivación de Plan Enterprise y migración transparente de cuentas a Plan Premium.
2. Blindaje Funcional de Restaurante:
   - Exclusividad de Mesas, Comandas y Pedidos para Plan Premium y Demo.
   - Bloqueo 403 en backend y tarjeta visual informativa de upgrade en frontend.
3. Límite de Almacenes y Depósitos:
   - 1 depósito principal en Plan Comercial. Múltiples depósitos reservados a Plan Premium.
4. Permisos Gerenciales en Cobros (v4.4.10).
5. Decimales y Gramos Fraccionarios Libres (v4.4.9).

Para restaurar mediante Git en caso de emergencia:
Ejecuta el script 'RESTAURAR_VERSION_4.4.11.bat'.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.4.11 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.4.11-stable
echo Frontend restaurado exitosamente a backup/v4.4.11-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.4.11-stable
echo Backend restaurado exitosamente a backup/v4.4.11-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.4.11
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.11.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.11.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.4.11.bat") -Force

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
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.11.bat") -Destination "D:\RESTAURAR_VERSION_4.4.11.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.4.11.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}
