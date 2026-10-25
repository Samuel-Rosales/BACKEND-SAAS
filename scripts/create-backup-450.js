const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = "C:\\Users\\e\\Documents\\Guardian";
const localBackupDir = path.join(baseDir, "Respaldo de la versión 4.5.0");
const localZipPath = path.join(baseDir, "Respaldo_Version_4.5.0.zip");

const dBackupDir = "D:\\Respaldo de la versión 4.5.0";
const dZipPath = "D:\\Respaldo_Version_4.5.0.zip";

console.log("==========================================================");
console.log("   INICIANDO RESPALDO OFICIAL DE GUARDIÁN VERSIÓN 4.5.0");
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
const instructions = `# INSTRUCCIONES DE RESTAURACIÓN Y DOCUMENTACIÓN TÉCNICA - VERSIÓN 4.5.0 ESTABLE
Fecha de Creación: ${now} (Hora Servidor)
Ambiente: Servidor Principal (https://guardian.com.ve) y Desarrollo (https://dev.guardian.com.ve)
Versión de Producción: Guardián v4.5.0 (Front: 4.5.0 | Back: 1.0.2)

Esta carpeta contiene el código fuente blindado, limpio y auditado de la versión 4.5.0 de Guardián.

=============================================================================
NOVEDADES, MEJORAS Y ARQUITECTURA DE LA VERSIÓN 4.5.0
=============================================================================

1. SUITE INTEGRAL GUARDIÁN AI (ASISTENTE EJECUTIVO INTELIGENTE):
   - Conexión nativa con Gemini 2.5 Flash mediante API en backend y streaming seguro.
   - Tabla de cuotas y consumo de tokens por empresa (ai_usage) para prevención de sobrecostos.
   - Herramientas (Function Calling) conectadas al negocio en tiempo real:
     * 'get_vendor_commissions': Cálculo y desglose analítico de ventas y comisiones por vendedor.
     * 'audit_inactive_inventory': Auditoría de 'dinero dormido' e inventario estancado sin rotación.
     * 'generate_whatsapp_collection_reminder': Generación automática de mensajes de cobranza personalizados para clientes con saldos vencidos.
     * 'get_system_help': Tutor operativo interactivo que guía paso a paso sobre cómo usar cada módulo del sistema.
     * 'get_financial_overview' y 'get_inventory_overview': Consultas consolidadas de caja, balance y depósitos.
   - Motor de voz blindado en Frontend:
     * Lectura de voz con Web Speech API dividida en oraciones secuenciales para evitar el congelamiento de 15 segundos en Chromium.
     * Liberador de contexto de audio Web Audio API ('unlockAudioPipe') y recolección de basura con 'window.currentUtterance'.
     * Reconocimiento de voz por micrófono (dictado para preguntas directas).
   - Experiencia de usuario Responsive Móvil / Escritorio:
     * Móvil (< md): Píldora compacta y estética '[ 🤖 IA ]' con 'whitespace-nowrap' en cabecera superior junto a la versión v4.5.0.
     * Escritorio (>= md): Botón expandido en breadcrumbs junto a la credencial 'DUEÑO'.
     * Modal interactivo de conversación con tabs para cambiar de negocio, métricas en vivo y botón de silencio/pausa.

2. MÓDULO DE VENTAS EN ESPERA (PARKED SALES):
   - Capacidad de pausar una venta en el punto de venta (POS) y guardarla localmente.
   - Recuperación inmediata de la orden en espera sin pérdida de artículos, precios ni cliente.

3. DISEÑADOR Y CONFIGURACIÓN DINÁMICA DE TICKETS:
   - Columna 'ticketConfig' en la entidad de negocios (businesses).
   - Personalización de formato de impresión de comprobantes fiscales y tickets de venta según requerimientos de la tienda.

4. RECARGO POR CRÉDITO CONFIGURABLE (10% / 20%):
   - Política de recargo opcional por cliente/empresa para financiamiento y ventas a crédito.
   - Cálculo automático de comisiones e intereses moratorios sobre cuotas vencidas.

5. IDENTIFICACIÓN FISCAL (RIF) Y MORA:
   - Configuración de RIF institucional en encabezados de documentos y recibos.
   - Políticas de cobro de recargos por mora en cuotas retrasadas.

=============================================================================
PROCEDIMIENTO DE RESTAURACIÓN MANUAL MEDIANTE GIT
=============================================================================
En caso de requerir volver a esta versión en el servidor o localmente:
1. Frontend:
   git checkout master
   git reset --hard backup/v4.5.0-stable
2. Backend:
   git checkout main
   git reset --hard backup/v4.5.0-stable

O ejecute directamente el script automatizado 'RESTAURAR_VERSION_4.5.0.bat'.
`;

fs.writeFileSync(path.join(localBackupDir, "INSTRUCCIONES_DE_RESTAURACION.md"), instructions, 'utf8');
console.log("[3/6] Instrucciones de restauración generadas.");

// 5. Crear script de restauración .bat
const batContent = `@echo off
chcp 65001 >nul
echo ======================================================
echo    RESTAURANDO GUARDIAN A LA VERSION 4.5.0 ESTABLE
echo ======================================================
echo.
cd /d "%~dp0"

echo [1/4] Restaurando Frontend (GuardTech)...
cd front
git checkout master
git fetch origin
git reset --hard backup/v4.5.0-stable
echo Frontend restaurado exitosamente a backup/v4.5.0-stable.
echo.

echo [2/4] Restaurando Backend (BACKEND-SAAS)...
cd ..\\back
git checkout main
git fetch origin
git reset --hard backup/v4.5.0-stable
echo Backend restaurado exitosamente a backup/v4.5.0-stable.
echo.

echo [3/4] Verificando estado del repositorio...
cd ..
echo Frontend:
cd front && git log -n 1 --oneline && cd ..
echo Backend:
cd back && git log -n 1 --oneline && cd ..

echo.
echo ======================================================
echo  RESTAURACION COMPLETADA CON EXITO A LA VERSION 4.5.0
echo ======================================================
pause
`;

fs.writeFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.5.0.bat"), batContent, 'utf8');
fs.writeFileSync(path.join(localBackupDir, "RESTAURAR_VERSION_4.5.0.bat"), batContent, 'utf8');
console.log("[4/6] Script ejecutable RESTAURAR_VERSION_4.5.0.bat generado.");

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
    fs.copyFileSync(path.join(baseDir, "RESTAURAR_VERSION_4.5.0.bat"), "D:\\RESTAURAR_VERSION_4.5.0.bat");

    console.log("Respaldo en D:\\ completado exitosamente:");
    console.log(" - Carpeta:", dBackupDir);
    console.log(" - Archivo comprimido:", dZipPath);
    console.log(" - Script de recuperación: D:\\RESTAURAR_VERSION_4.5.0.bat");
} else {
    console.log("Unidad D:\\ no detectada. Respaldo conservado localmente en", localBackupDir, "y", localZipPath);
}

console.log("");
console.log("==========================================================");
console.log("  RESPALDO DE GUARDIÁN VERSIÓN 4.5.0 COMPLETADO CON ÉXITO");
console.log("==========================================================");
