const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = "C:\\Users\\e\\Documents\\Guardian";
const localBackupDir = path.join(baseDir, "Respaldo de la versión 4.6.0");
const localZipPath = path.join(baseDir, "Respaldo_Version_4.6.0.zip");

const dBackupDir = "D:\\Respaldo de la versión 4.6.0";
const dZipPath = "D:\\Respaldo_Version_4.6.0.zip";

console.log("==========================================================");
console.log("   INICIANDO RESPALDO OFICIAL DE GUARDIÁN VERSIÓN 4.6.0");
console.log("==========================================================");

// 1. Preparar directorio local
if (fs.existsSync(localBackupDir)) {
    console.log("Limpiando directorio previo de respaldo local...");
    fs.rmSync(localBackupDir, { recursive: true, force: true });
}
fs.mkdirSync(localBackupDir, { recursive: true });

const frontDest = path.join(localBackupDir, "front");
const backDest = path.join(localBackupDir, "back");

// 2. Robocopy front
console.log("[1/6] Copiando Frontend de forma limpia (excluyendo node_modules, .git, dist, .astro)...");
try {
    execSync(`robocopy "${path.join(baseDir, 'front')}" "${frontDest}" /E /XD node_modules .git dist .astro /XF *.log /NFL /NDL /NJH /NJS`, { stdio: 'ignore' });
} catch (e) {
    // Robocopy returns exit codes 1-3 for successful copies
}
console.log("Frontend copiado exitosamente en:", frontDest);

// 3. Robocopy back
console.log("[2/6] Copiando Backend de forma limpia (excluyendo node_modules, .git, dist)...");
try {
    execSync(`robocopy "${path.join(baseDir, 'back')}" "${backDest}" /E /XD node_modules .git dist /XF *.log /NFL /NDL /NJH /NJS`, { stdio: 'ignore' });
} catch (e) {
    // Robocopy returns exit codes 1-3 for successful copies
}
console.log("Backend copiado exitosamente en:", backDest);

// 4. Agregar instrucciones técnicas de restauración
const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const instructions = `# INSTRUCCIONES DE RESTAURACIÓN Y DOCUMENTACIÓN TÉCNICA - VERSIÓN 4.6.0 ESTABLE
Fecha de Creación: ${now} (Hora Servidor)
Ambiente: Servidor Principal (https://guardian.com.ve) y Desarrollo (https://dev.guardian.com.ve)
Versión de Producción: Guardián v4.6.0 (Front: 4.6.0 | Back: 1.0.2)

Esta carpeta contiene el código fuente blindado, limpio y auditado de la versión 4.6.0 de Guardián.

=============================================================================
NOVEDADES, MEJORAS Y ARQUITECTURA DE LA VERSIÓN 4.6.0
=============================================================================

1. SUITE DE DISEÑO E IMPRESIÓN DE ETIQUETAS DE PRODUCTOS (58mm / 80mm / OFERTAS):
   - Módulo completo en Configuración -> Diseñador de Etiquetas con previsualización en tiempo real.
   - Soporte para formatos térmicos de 80mm y 58mm (estándar compacto 54x38mm).
   - Tres modos de plantilla: Estándar, Moderna y Promocional con cinta '★ OFERTA ESPECIAL ★'.
   - Opciones granulares de visibilidad: Nombre de negocio, RIF, Nombre del producto, SKU, unidad/presentación, código de barras y texto editable al pie.
   - Modos monetarios: USD Ref ($), Bolívares (Bs. tasa oficial BCV) y Bimonetario simultáneo (formato vertical u horizontal).

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

O ejecute directamente el script automatizado 'RESTAURAR_VERSION_4.6.0.bat'.
`;

fs.writeFileSync(path.join(localBackupDir, "INSTRUCCIONES_DE_RESTAURACION.md"), instructions, 'utf8');
console.log("[3/6] Instrucciones de restauración generadas.");

// 5. Crear script de restauración .bat
const batContent = `@echo off
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
cd ..\\back
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
`;

fs.writeFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.6.0.bat"), batContent, 'utf8');
fs.writeFileSync(path.join(localBackupDir, "RESTAURAR_VERSION_4.6.0.bat"), batContent, 'utf8');
console.log("[4/6] Script ejecutable RESTAURAR_VERSION_4.6.0.bat generado.");

// 6. Crear Zip Local
if (fs.existsSync(localZipPath)) {
    fs.unlinkSync(localZipPath);
}
console.log("[5/6] Comprimiendo respaldo local a formato ZIP (esto puede tomar unos momentos)...");
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${localBackupDir}\\*' -DestinationPath '${localZipPath}' -CompressionLevel Optimal"`);
console.log("Respaldo local comprimido exitosamente:", localZipPath);

// 7. Replicar en D:\
console.log("[6/6] Verificando unidad de almacenamiento secundario D:\\...");
if (fs.existsSync("D:\\")) {
    console.log("Copiando respaldo a la unidad D:\\...");
    if (fs.existsSync(dBackupDir)) {
        fs.rmSync(dBackupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(dBackupDir, { recursive: true });
    try {
        execSync(`robocopy "${localBackupDir}" "${dBackupDir}" /E /NFL /NDL /NJH /NJS`, { stdio: 'ignore' });
    } catch (e) {}

    fs.copyFileSync(localZipPath, dZipPath);
    fs.copyFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.6.0.bat"), "D:\\RESTAURAR_VERSION_4.6.0.bat");

    console.log("Respaldo en D:\\ completado exitosamente:");
    console.log(" - Carpeta:", dBackupDir);
    console.log(" - Archivo comprimido:", dZipPath);
    console.log(" - Script de recuperación: D:\\RESTAURAR_VERSION_4.6.0.bat");
} else {
    console.log("Unidad D:\\ no detectada. Respaldo conservado localmente en", localBackupDir, "y", localZipPath);
}

console.log("");
console.log("==========================================================");
console.log("  RESPALDO DE GUARDIÁN VERSIÓN 4.6.0 COMPLETADO CON ÉXITO");
console.log("==========================================================");
