$baseDir = "C:\Users\e\Documents\Guardian"
$backupDir = Join-Path $baseDir "Respaldo de la versión 4.0.0"
$zipPath = Join-Path $baseDir "Respaldo_Version_4.0.0.zip"

if (Test-Path $backupDir) {
    Remove-Item -Path $backupDir -Recurse -Force
}
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$frontDest = Join-Path $backupDir "front"
$backDest = Join-Path $backupDir "back"

# Robocopy front excluding node_modules, .git, dist, .astro
robocopy (Join-Path $baseDir "front") $frontDest /E /XD node_modules .git dist .astro /XF *.log | Out-Null
Write-Host "Front backed up to $frontDest"

# Robocopy back excluding node_modules, .git, dist
robocopy (Join-Path $baseDir "back") $backDest /E /XD node_modules .git dist /XF *.log | Out-Null
Write-Host "Back backed up to $backDest"

# Add restoration instructions
$instructions = @"
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.0.0 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Esta carpeta contiene el código fuente limpio y blindado de la versión 4.0.0 de Guardian.
Novedades incluidas:
1. Módulo de Comisiones por Venta por Empleado (Exclusivo Plan Premium).
2. Reporte de Comisiones por Venta con comprobante de liquidación imprimible.
3. Control de Acceso Exclusivo para Administradores y Propietarios (Cajeros restringidos).
4. Consulta Automática de RIF y Razón Social en SENIAT (Exclusivo Plan Premium).
5. Cambio de Método de Pago en Ventas y Carga de Cotizaciones a Facturación.
6. Traslado de Inventario entre Almacenes sin Costo.

Para restaurar mediante Git:
Ejecuta el archivo 'RESTAURAR_VERSION_4.0.0.bat' ubicado en la raíz del proyecto.
"@

Set-Content -Path (Join-Path $backupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8
Write-Host "Backup folder 4.0.0 created."

# Compress to zip
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Respaldo_Version_4.0.0.zip created successfully."
