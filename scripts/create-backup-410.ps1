$baseDir = "C:\Users\e\Documents\Guardian"
$backupDir = Join-Path $baseDir "Respaldo de la versión 4.1.0"
$zipPath = Join-Path $baseDir "Respaldo_Version_4.1.0.zip"

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
# INSTRUCCIONES DE RESTAURACIÓN - VERSIÓN 4.1.0 ESTABLE
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Esta carpeta contiene el código fuente limpio y blindado de la versión 4.1.0 de Guardian.
Novedades incluidas:
1. Integración Fiscal Oficial SENIAT para DEVTECH DTP-80i vía WinUSB nativo (dtpdfiscal64.dll).
2. Subtotal Definitivo (tipo 1), lectura de saldo fiscal en céntimos y cierre fiscal legal (cero facturas anuladas).
3. Conversión bimonetaria automática a Bolívares (VES) a tasa oficial BCV para cumplimiento normativo SENIAT.
4. Módulo de Conciliación Dual de Caja: Reporte Z Fiscal vs Notas de Entrega POS-80C vs Total en Gaveta.
5. Rediseño de alto contraste WCAG AAA para la tarjeta de Notas de Entrega en azul cielo translúcido.
6. Puente Fiscal Portátil Autónomo de 9.1 MB (GUARDIAN-PUENTE-FISCAL-PORTATIL.zip).

Para restaurar mediante Git:
Ejecuta el archivo 'RESTAURAR_VERSION_4.1.0.bat' ubicado en la raíz del proyecto.
"@

Set-Content -Path (Join-Path $backupDir "INSTRUCCIONES_DE_RESTAURACION.md") -Value $instructions -Encoding UTF8
Write-Host "Backup folder 4.1.0 created."

# Compress to zip
if (Test-Path $zipPath) {
    Remove-Item -Path $zipPath -Force
}
Compress-Archive -Path "$backupDir\*" -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "Respaldo_Version_4.1.0.zip created successfully."
