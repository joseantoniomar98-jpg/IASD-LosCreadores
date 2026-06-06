/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Cloud, RefreshCw, CheckCircle2, AlertCircle, Eye, FolderOpen, 
  Settings, Database, Check, Play, FileCheck, ArrowRight, ToggleLeft, ToggleRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GoogleDriveConfigData {
  connected: boolean;
  folderId: string;
  folderName: string;
  autoSync: boolean;
  syncRendiciones: boolean;
  syncBalances: boolean;
  lastSyncDate: string | null;
}

interface GestionGoogleDriveProps {
  config: GoogleDriveConfigData;
  onUpdateConfig: (newConfig: GoogleDriveConfigData) => void;
}

export const GestionGoogleDrive: React.FC<GestionGoogleDriveProps> = ({
  config,
  onUpdateConfig,
}) => {
  // Local edit states
  const [folderIdInput, setFolderIdInput] = useState(config.folderId);
  const [folderNameInput, setFolderNameInput] = useState(config.folderName);
  
  // Checking API connectivity states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Simulated Synced File history list
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: "RE_419_Boleta_Combustible_Aventureros.pdf", date: "Hace 2 horas", size: "124 KB", code: "RE-419" },
    { name: "RE_418_Factura_Sonido_Comunicaciones.pdf", date: "Ayer, 18:40", size: "1.2 MB", code: "RE-418" },
    { name: "SOPORTE_DEV_RE_415_Caja_Chica.png", date: "Hace 3 días", size: "348 KB", code: "RE-415" },
    { name: "Balance_Consolidado_Mayo_2026.pdf", date: "28 May 2026", size: "2.1 MB", code: "BAL-05" },
    { name: "Acta_Junta_Oficial_2026_056.pdf", date: "22 Mar 2026", size: "450 KB", code: "ACT-056" }
  ]);

  const handleToggleConnected = () => {
    onUpdateConfig({
      ...config,
      connected: !config.connected
    });
  };

  const handleToggleAutoSync = () => {
    onUpdateConfig({
      ...config,
      autoSync: !config.autoSync
    });
  };

  const handleToggleSyncRendiciones = () => {
    onUpdateConfig({
      ...config,
      syncRendiciones: !config.syncRendiciones
    });
  };

  const handleToggleSyncBalances = () => {
    onUpdateConfig({
      ...config,
      syncBalances: !config.syncBalances
    });
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      folderId: folderIdInput,
      folderName: folderNameInput
    });
    alert("¡Configuración de Google Drive guardada con éxito!");
  };

  // Connection Test simulation
  const handleTestConnection = () => {
    setTestingConnection(true);
    setTestResult(null);
    setTestLogs([]);

    const steps = [
      "Iniciando handshake seguro con Google OAuth API v3...",
      "Validando token de acceso del Tesorero...",
      "Token local verificado. Permiso de acceso concedido.",
      "Conectándose al drive raíz del Ministerio IASD...",
      `Comprobando existencia de la carpeta: "${folderNameInput}" (ID: ${folderIdInput})...`,
      "Carpeta remota ubicada con éxito.",
      "Cuota disponible en Google Drive: 12.4 GB libres de 15 GB.",
      "✅ Conectividad API establecida con éxito."
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setTestLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setTestingConnection(false);
          setTestResult("success");
          onUpdateConfig({
            ...config,
            lastSyncDate: new Date().toISOString().replace("T", " ").substring(0, 19)
          });
        }
      }, (index + 1) * 750);
    });
  };

  return (
    <div className="space-y-6" id="panel-google-drive">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-[#1552a6] text-white p-6 sm:p-7 rounded-2xl shadow border border-blue-950">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl border border-white/20 text-blue-200">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black uppercase tracking-wider">Configuración de Google Drive</h2>
            <p className="text-xs text-blue-100 font-medium max-w-xl">
              Asocia el departamento de Finanzas con la nube de Google Drive. Los respaldos y justificantes físicos de las rendiciones se archivarán automáticamente en tu carpeta compartida en tiempo real de manera segura.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: General Status & API Settings Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-[#1552a6]" /> Ajustes de Sincronización
            </h3>
            <button 
              onClick={handleToggleConnected}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                config.connected
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-rose-100 text-rose-800 border-rose-200"
              }`}
            >
              {config.connected ? "✓ Vinculado" : "✗ Sin Vincular"}
            </button>
          </div>

          <form onSubmit={handleSaveChanges} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-outline font-black uppercase tracking-wider block">ID de Carpeta Google Drive</label>
                <input 
                  type="text"
                  value={folderIdInput}
                  onChange={(e) => setFolderIdInput(e.target.value)}
                  className="w-full bg-slate-50 border border-outline-variant p-2.5 rounded-lg text-xs font-mono font-bold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                  placeholder="ID alfanumérico largo de Drive"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-outline font-black uppercase tracking-wider block">Nombre de la Carpeta Destino</label>
                <input 
                  type="text"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-outline-variant p-2.5 rounded-lg text-xs font-semibold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                  placeholder="Nombre amigable de la carpeta"
                  required
                />
              </div>
            </div>

            {/* SYNC CONFIG TOGGLES */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3.5 border border-slate-100">
              <h4 className="text-[10px] text-primary font-black uppercase tracking-wider">Políticas de Auto-Almacenamiento</h4>
              
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <div>
                  <p>Habilitar Sincronización en Tiempo Real</p>
                  <p className="text-[10px] text-outline font-normal">Sincroniza comprobantes en cuanto son subidos por directores.</p>
                </div>
                <button type="button" onClick={handleToggleAutoSync} className="text-primary hover:scale-105 transition-all">
                  {config.autoSync ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-outline" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-primary pt-2.5 border-t border-slate-200">
                <div>
                  <p>Subir Soportes de Rendiciones</p>
                  <p className="text-[10px] text-outline font-normal font-normal">Convierte y respalda JPGs/PDFs en la carpeta remota.</p>
                </div>
                <button type="button" onClick={handleToggleSyncRendiciones} className="text-primary hover:scale-105 transition-all">
                  {config.syncRendiciones ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-outline" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-primary pt-2.5 border-t border-slate-200">
                <div>
                  <p>Auto-respaldo de Informes de Balances</p>
                  <p className="text-[10px] text-outline font-normal">Subida mensual automatizada de balances conciliados de junta.</p>
                </div>
                <button type="button" onClick={handleToggleSyncBalances} className="text-primary hover:scale-105 transition-all">
                  {config.syncBalances ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-outline" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full h-11 bg-[#1552a6] text-white hover:bg-blue-800 transition-all text-xs font-black uppercase tracking-wider rounded-lg shadow"
            >
              Guardar Ajustes de Directorio
            </button>
          </form>
        </div>

        {/* Right Side: Connectivity Test Terminal & Upload Log */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Diagnostic Console Box */}
          <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-600" /> Diagnóstico de API
              </h4>
              <button 
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-3 h-8 text-[11px] font-black text-[#1552a6] bg-[#eef4fc] hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-55"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-blue-700" : ""}`} /> Test Conexión
              </button>
            </div>

            {/* Diagnostics screen */}
            {testLogs.length === 0 && !testingConnection ? (
              <div className="bg-slate-900 rounded-xl p-6 text-center text-slate-400 text-xs border border-slate-800">
                <Play className="w-6 h-6 text-slate-500 mx-auto mb-2 animate-bounce" />
                <p className="font-bold">Consola en Espera</p>
                <p className="text-[10px] text-slate-500 mt-1">Presiona "Test Conexión" para validar las credenciales de la API con los servidores de Google Cloud.</p>
              </div>
            ) : (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[9px] text-[#22c55e] space-y-1.5 h-44 overflow-y-auto">
                {testLogs.map((log, index) => (
                  <div key={index} className={log.startsWith("✅") ? "text-emerald-400 font-bold" : "opacity-90"}>
                    {log}
                  </div>
                ))}
                {testingConnection && (
                  <div className="flex items-center gap-2 text-[#38bdf8] italic pt-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#38bdf8]" /> Buscando token web de seguridad...
                  </div>
                )}
                {testResult === "success" && (
                  <div className="bg-emerald-950/50 border border-emerald-900/60 p-2 rounded-lg text-emerald-400 mt-2 text-[10px] font-sans">
                    <p className="font-bold">✓ Prueba Exitosa</p>
                    <p className="opacity-80">La conexión con el repositorio Google Drive está activa para su uso.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recently backed up files list */}
          <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-outline-variant/20">
              <FolderOpen className="w-4 h-4 text-teal-600" /> Archivos Sincronizados Recientemente
            </h4>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-all">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left overflow-hidden">
                      <p className="text-xxs font-bold text-primary truncate max-w-[170px]" title={file.name}>{file.name}</p>
                      <p className="text-[9px] text-outline font-medium">{file.size} • {file.date}</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-black font-mono shrink-0 uppercase tracking-widest">{file.code}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
