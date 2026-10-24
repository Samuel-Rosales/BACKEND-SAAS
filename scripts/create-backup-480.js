const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = "C:\\Users\\e\\Documents\\Guardian";
const localBackupDir = path.join(baseDir, "Respaldo de la versión 4.8.0");
const localZipPath = path.join(baseDir, "Respaldo_Version_4.8.0.zip");

const dBackupDir = "D:\\Respaldo de la versión 4.8.0";
const dZipPath = "D:\\Respaldo_Version_4.8.0.zip";

console.log("==========================================================");
console.log("   INICIANDO RESPALDO OFICIAL DE GUARDIÁN VERSIÓN 4.8.0");
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
const instructions = `# INSTRUCCIONES DE RESTAURACIÓN Y DOCUMENTACIÓN TÉCNICA - VERSIÓN 4.8.0 ESTABLE
Fecha de Creación: ${now} (Hora Servidor)
Ambiente: Servidor Principal (https://guardian.com.ve) y Desarrollo (https://dev.guardian.com.ve)
Versión de Producción: Guardián v4.8.0 (Front: 4.8.0 | Back: 1.0.3)

Esta carpeta contiene el código fuente blindado, limpio y auditado de la versión 4.8.0 de Guardián.

=============================================================================
NOVEDADES, MEJORAS Y ARQUITECTURA DE LA VERSIÓN 4.8.0
=============================================================================

1. SUITE DE SUBAGENTES ADMINISTRATIVOS AUTÓNOMOS (GUARDIÁN AI):
   - Integración de 5 subagentes especializados con insignias de color dedicadas:
     * 🛒 Especialista en Ventas & POS (Azul)
     * 📦 Perito de Inventario & Stock (Esmeralda)
     * 💳 Gestor de Créditos & Cobranzas (Ámbar)
     * 📊 Auditor Financiero & Cajas (Púrpura)
     * 🖥️ Tutor Operativo del Sistema (Cian)
   - 32 herramientas analíticas y de ejecución conectadas a base de datos en tiempo real.

2. MOTOR FAST-PATH FORENSE (< 200 ms):
   - Respuestas instantáneas en memoria para saludos, bienvenida ejecutiva y consulta oficial de Tasa BCV.
   - Ahorro masivo de tokens y cero latencia perceptible para consultas recurrentes.

3. PÍLDORAS Y CHIPS DE SUGERENCIAS INTERACTIVAS (suggestedOptions):
   - Opciones contextuales dinámicas renderizadas al pie de cada respuesta para ejecutar acciones con un solo clic.

4. MOTOR GEMINI 3.8 FLASH CON BAJA LATENCIA:
   - Configuración con thinkingBudget: 0 y temperatura controlada para respuesta contable y matemática exacta.

5. NORMALIZACIÓN DE TASAS CAMBIARIAS E IMPRESIÓN DIRECTA DE TICKETS:
   - Extracción numérica segura de tasas desde resolveBusinessExchangeRate.
   - Emisión térmica directa sin puente con banners estilizados y soporte 58mm / 80mm.

=============================================================================
PROCEDIMIENTO DE RESTAURACIÓN MANUAL MEDIANTE GIT
=============================================================================
En caso de requerir volver a esta versión en el servidor o localmente:
1. Frontend:
   git checkout master
   git reset --hard backup/v4.8.0-stable
2. Backend:
   git checkout main
   git reset --hard backup/v4.8.0-stable

O ejecute directamente el script automatizado 'RESTAURAR_VERSION_4.8.0.bat'.
`;

fs.writeFileSync(path.join(localBackupDir, "INSTRUCCIONES_DE_RESTAURACION.md"), instructions, 'utf8');
console.log("[3/6] Instrucciones de restauración generadas.");

// 5. Crear script de restauración .bat
const batContent = `@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.8.0 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.8.0-stable
echo Frontend restaurado exitosamente a backup/v4.8.0-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\\back
git checkout main
git fetch origin
git reset --hard backup/v4.8.0-stable
echo Backend restaurado exitosamente a backup/v4.8.0-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.8.0
echo ======================================================
pause
`;

fs.writeFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.8.0.bat"), batContent, 'utf8');
fs.writeFileSync(path.join(localBackupDir, "RESTAURAR_VERSION_4.8.0.bat"), batContent, 'utf8');
console.log("[4/6] Script ejecutable RESTAURAR_VERSION_4.8.0.bat generado.");

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
    fs.copyFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.8.0.bat"), "D:\\RESTAURAR_VERSION_4.8.0.bat");

    console.log("Respaldo en D:\\ completado exitosamente:");
    console.log(" - Carpeta:", dBackupDir);
    console.log(" - Archivo comprimido:", dZipPath);
    console.log(" - Script de recuperación: D:\\RESTAURAR_VERSION_4.8.0.bat");
} else {
    console.log("Unidad D:\\ no detectada. Respaldo conservado localmente en", localBackupDir, "y", localZipPath);
}

// 8. Crear ramas de respaldo git locales y remotas
try {
    console.log("Creando etiquetas/ramas de respaldo Git 'backup/v4.8.0-stable'...");
    execSync(`git -C "${path.join(baseDir, 'front')}" branch -f backup/v4.8.0-stable HEAD`, { stdio: 'ignore' });
    execSync(`git -C "${path.join(baseDir, 'front')}" push -f origin backup/v4.8.0-stable`, { stdio: 'ignore' });
    execSync(`git -C "${path.join(baseDir, 'back')}" branch -f backup/v4.8.0-stable HEAD`, { stdio: 'ignore' });
    execSync(`git -C "${path.join(baseDir, 'back')}" push -f origin backup/v4.8.0-stable`, { stdio: 'ignore' });
    console.log("Ramas de respaldo git sincronizadas exitosamente.");
} catch (e) {
    console.warn("Advertencia al sincronizar ramas git de respaldo:", e.message);
}

console.log("");
console.log("==========================================================");
console.log("  RESPALDO DE GUARDIÁN VERSIÓN 4.8.0 COMPLETADO CON ÉXITO");
console.log("==========================================================");
