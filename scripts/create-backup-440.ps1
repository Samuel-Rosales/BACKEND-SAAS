$baseDir = "C:\Users\e\Documents\Guardian"
$backupDir = Join-Path $baseDir "Respaldo de la versión 4.4.0"
$zipPath = Join-Path $baseDir "Respaldo_Version_4.4.0.zip"

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.4.0 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Esta carpeta contiene el código fuente limpio y blindado de la versión 4.4.0 de Guardian.
Novedades y mejoras consolidadas:
1. Configuración de Caja en POS y Selección de Vendedor para Atribución de Comisiones.
2. Blindaje exclusivo para Plan Premium en asignación de vendedor y reportes financieros.
3. Soporte contable dual de Cashea: métricas de ventas, inicial personalizada, cuotas quincenales e historial de pagos.
4. Escáner de código de barras mediante cámara móvil en formularios de inventario y punto de venta.
5. Expansión ergonómica del modal de procesamiento de pagos (PaymentProcessingModal max-w-4xl).
6. Validación de RIFs formateados y documentos de identidad alfanuméricos en clientes.
7. Impresión térmica directa por hardware Spooler y puente fiscal oficial SENIAT (DTP-80i).

Para restaurar mediante Git:
Ejecuta el archivo 'RESTAURAR_VERSION_4.4.0.bat' ubicado en la raíz del proyecto.
"@

Set-Content -Path (Join-Path $backupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8
Write-Host "Backup folder 4.4.0 created."

# Compress to zip
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Respaldo_Version_4.4.0.zip created successfully."
