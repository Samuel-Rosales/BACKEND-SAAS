$baseDir = "C:\Users\e\Documents\Guardian"
$localBackupDir = Join-Path $baseDir "Respaldo de la versión 4.4.9"
$localZipPath = Join-Path $baseDir "Respaldo_Version_4.4.9.zip"

$dBackupDir = "D:\Respaldo de la versión 4.4.9"
$dZipPath = "D:\Respaldo_Version_4.4.9.zip"

Write-Host "Iniciando respaldo de la versión 4.4.9..."

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.9 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Ambiente: Servidor Principal (guardian.com.ve) y Desarrollo (dev.guardian.com.ve)

Esta carpeta contiene el código fuente blindado y limpio de la versión 4.4.9 de Guardian.

Novedades, correcciones y mejoras consolidadas:
1. Precisión y Flexibilidad Total en Cantidades (Gramos Libres y Decimales Arbitrarios):
   - Soporte de hasta 6 lugares decimales en entradas numéricas (precisión de miligramos / 0.000001).
   - Eliminación de la máscara rígida monetaria de 2 decimales en Field.tsx.
   - Solución al borrado fantasma durante la digitación de ceros iniciales (e.g. '0.' y '0.0').
   - Desbloqueo de pasos decimales en modales de ventas, órdenes, compras, inventario y notas de crédito con step='any'.
   - Actualización transversal de validadores de backend a un piso mínimo de 0.000001.
2. Corrección de Maquetación PDF en Reporte de Ventas (Consolidado de v4.4.8):
   - Eliminación de mancha por estiramiento de fila en Yoga Flexbox.
   - Celda por celda con cabecera repetida en cada página (fixed) y wrap={false}.
3. Filtro por Fechas en Inventario (Consolidado de v4.4.7):
   - Hoy, Esta semana, Este mes, Rango personalizado y artículos vendidos hoy.
4. Comisión Gerencial por Tienda 1.5% (Consolidado de v4.4.6).

Para restaurar mediante Git en caso de emergencia:
Ejecuta el script 'RESTAURAR_VERSION_4.4.9.bat'.
"@

Set-Content -Path (Join-Path $localBackupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8

# 3. Crear script de restauración .bat
$batContent = @"
@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.4.9 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.4.9-stable
echo Frontend restaurado exitosamente a backup/v4.4.9-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\back
git checkout main
git fetch origin
git reset --hard backup/v4.4.9-stable
echo Backend restaurado exitosamente a backup/v4.4.9-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.4.9
echo ======================================================
pause
"@

Set-Content -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.9.bat") -Value $batContent -Encoding UTF8
Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.9.bat") -Destination (Join-Path $localBackupDir "RESTAURAR_VERSION_4.4.9.bat") -Force

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
    Copy-Item -Path (Join-Path $baseDir "RESTAURAR_VERSION_4.4.9.bat") -Destination "D:\RESTAURAR_VERSION_4.4.9.bat" -Force

    Write-Host "Respaldo en D:\ completado exitosamente:"
    Write-Host " - Carpeta: $dBackupDir"
    Write-Host " - Archivo comprimido: $dZipPath"
    Write-Host " - Script de recuperación: D:\RESTAURAR_VERSION_4.4.9.bat"
} else {
    Write-Host "Unidad D:\ no detectada. Respaldo conservado localmente en $localBackupDir y $localZipPath"
}
