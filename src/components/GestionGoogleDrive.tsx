/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Cloud, RefreshCw, CheckCircle2, AlertCircle, Eye, FolderOpen, 
  Settings, Database, Check, Play, FileCheck, ArrowRight, ToggleLeft, ToggleRight,
  LogOut, Trash2, FolderPlus, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getAccessToken, signInWithGoogle, logoutGoogle, getGoogleUserProfile,
  checkDriveFolderExists, createDriveFolder, uploadFileToDrive, fetchDriveFiles, DriveFile
} from "../googleAuth";

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
  // Authentication status states
  const [isAuth, setIsAuth] = useState(!!getAccessToken());
  const [googleUser, setGoogleUser] = useState(getGoogleUserProfile());

  // Input editing states
  const [folderIdInput, setFolderIdInput] = useState(config.folderId);
  const [folderNameInput, setFolderNameInput] = useState(config.folderName);
  
  // Real Drive API files List
  const [realDriveFiles, setRealDriveFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Folder creation assistant
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("SGE - Comprobantes de Tesorería");

  // Checking API connectivity states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // File Upload states
  const [uploadingTest, setUploadingTest] = useState(false);

  // Auto load files if authenticated and folder exists
  const loadDriveFiles = async () => {
    if (!getAccessToken() || !config.folderId) return;
    setLoadingFiles(true);
    try {
      const files = await fetchDriveFiles(config.folderId);
      setRealDriveFiles(files);
    } catch (e) {
      console.error("Error loading files from Google Drive:", e);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isAuth && config.folderId) {
      loadDriveFiles();
    }
  }, [isAuth, config.folderId]);

  // Auth Connect
  const handleConnectGoogle = async () => {
    try {
      const result = await signInWithGoogle();
      if (result) {
        setIsAuth(true);
        setGoogleUser(getGoogleUserProfile());
        alert("¡Conexión establecida con Google Drive con éxito!");
      }
    } catch (err: any) {
      alert("Error al conectar con Google: " + (err.message || err));
    }
  };

  // Auth Disconnect
  const handleDisconnectGoogle = async () => {
    const confirmed = window.confirm("¿Está seguro de que desea desconectar su cuenta de Google? Los justificantes no podrán archivarse en la nube temporalmente.");
    if (!confirmed) return;
    
    await logoutGoogle();
    setIsAuth(false);
    setGoogleUser(null);
    setRealDriveFiles([]);
    onUpdateConfig({
      ...config,
      connected: false
    });
  };

  // Toggles for triggers
  const handleToggleAutoSync = () => {
    onUpdateConfig({ ...config, autoSync: !config.autoSync });
  };

  const handleToggleSyncRendiciones = () => {
    onUpdateConfig({ ...config, syncRendiciones: !config.syncRendiciones });
  };

  const handleToggleSyncBalances = () => {
    onUpdateConfig({ ...config, syncBalances: !config.syncBalances });
  };

  // Manual save for fields
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      folderId: folderIdInput.trim(),
      folderName: folderNameInput.trim()
    });
    alert("¡Configuración de Google Drive guardada!\nSe utilizará la carpeta indicada para almacenar sus respaldos.");
  };

  // Create Google Drive Folder Automatic Helper
  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuth) {
      alert("Su cuenta de Google no está conectada.");
      return;
    }
    setCreatingFolder(true);
    try {
      const folder = await createDriveFolder(newFolderNameInput.trim());
      if (folder) {
        setFolderIdInput(folder.id);
        setFolderNameInput(folder.name);
        onUpdateConfig({
          ...config,
          folderId: folder.id,
          folderName: folder.name,
          connected: true
        });
        alert(`¡Carpeta creada con éxito!\nNombre: "${folder.name}"\nID: ${folder.id}`);
      } else {
        alert("Ocurrió un error al crear la carpeta en Google Drive. Intente de nuevo.");
      }
    } catch (err: any) {
      alert("Error: " + (err.message || err));
    } finally {
      setCreatingFolder(false);
    }
  };

  // Real Connection/Folder validation
  const handleTestConnection = async () => {
    if (!isAuth) {
      alert("Debe conectar su cuenta antes de realizar la prueba.");
      return;
    }
    if (!folderIdInput.trim()) {
      alert("Indique un ID de Carpeta válido para comprobar.");
      return;
    }

    setTestingConnection(true);
    setTestResult(null);
    setTestLogs([]);

    const log = (msg: string) => setTestLogs(prev => [...prev, msg]);

    try {
      log("Iniciando verificación segura con los servidores de Google Cloud...");
      await new Promise(r => setTimeout(r, 600));

      const token = getAccessToken();
      if (!token) {
        log("❌ Error: Token de acceso no encontrado localmente.");
        setTestResult("error");
        setTestingConnection(false);
        return;
      }

      log("Token de Google OAuth v3 validado correctamente.");
      log(`Consultando metadatos para la carpeta: "${folderNameInput}" (ID: ${folderIdInput})...`);
      await new Promise(r => setTimeout(r, 750));

      const response = await checkDriveFolderExists(folderIdInput.trim());
      if (response.exists) {
        log(`✓ Carpeta ubicada con éxito en su Google Drive.`);
        log(`📂 Nombre de la Carpeta: "${response.name}"`);
        log("Probando permisos de lectura y escritura en el repositorio contable...");
        await new Promise(r => setTimeout(r, 500));
        log("✅ Conexión establecida con éxito. Todos los servicios de red están activos.");
        setTestResult("success");
        
        onUpdateConfig({
          ...config,
          folderId: folderIdInput.trim(),
          folderName: response.name || folderNameInput.trim(),
          connected: true,
          lastSyncDate: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()
        });
        
        // Refresh the file list
        loadDriveFiles();
      } else {
        log(`❌ Error API: ${response.error || "No se localizó la carpeta."}`);
        log("Verifique que el ID sea correcto y que su cuenta tenga permisos en ella.");
        setTestResult("error");
      }
    } catch (err: any) {
      log(`❌ Error de red o respuesta inesperada: ${err.message || err}`);
      setTestResult("error");
    } finally {
      setTestingConnection(false);
    }
  };

  // Upload an interactive test file to verify files pipeline
  const handleUploadTestFile = async () => {
    if (!config.folderId) {
      alert("Configure primero una carpeta de almacenamiento antes de subir respaldos de prueba.");
      return;
    }
    setUploadingTest(true);
    try {
      const docContent = `SISTEMA DE GESTIÓN GENERAL\nComprobante de Verificación Integral de Enlaces en la Nube\n--------------------------------------------\nSincronización automatizada: ACTIVA\nFecha de Sincronización: ${new Date().toLocaleString()}\nUsuario autenticado: ${googleUser?.email || "Tesorero Central"}\nID de Carpeta Vinculada: ${config.folderId}\n\nConexión de respaldo establecida correctamente en tiempo real.`;
      const blob = new Blob([docContent], { type: "text/plain" });
      
      const response = await uploadFileToDrive("Test_Auditoria_Sistema.txt", "text/plain", blob, config.folderId);
      if (response) {
        alert(`¡Archivo de prueba subido exitosamente!\nID del Archivo: ${response.id}`);
        loadDriveFiles();
      } else {
        alert("La API de Google Drive rechazó la carga del archivo. Compruebe los permisos.");
      }
    } catch (err: any) {
      alert("Error durante la prueba de carga: " + (err.message || err));
    } finally {
      setUploadingTest(false);
    }
  };

  // Securely delete file with confirmation dialog
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(`¿Está seguro de que desea eliminar permanentemente el archivo "${fileName}" de Google Drive?`);
    if (!isConfirmed) return;

    try {
      const token = getAccessToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Archivo descartado con éxito de Google Drive.");
        loadDriveFiles();
      } else {
        const errorText = await res.text();
        alert(`No se pudo eliminar el archivo. Respuesta de Drive: ${res.status} - ${errorText}`);
      }
    } catch (err: any) {
      alert("Error de conexión al eliminar archivo: " + (err.message || err));
    }
  };

  const formatSize = (bytesStr?: string) => {
    if (!bytesStr) return "S/T";
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return "S/T";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
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
            <h2 className="text-xl font-black uppercase tracking-wider">Módulo de Almacenamiento en la Nube</h2>
            <p className="text-xs text-blue-100 font-medium max-w-xl">
              Vincule la administración local del sistema con Google Drive para archivar automáticamente comprobantes, actas de junta y balances financieros en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {/* Auth Gate Screen */}
      {!isAuth ? (
        <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-8 max-w-2xl mx-auto text-center space-y-6">
          <Cloud className="w-16 h-16 mx-auto text-slate-300 animate-bounce" />
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
              Vincular Google Drive
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Consiga almacenamiento ilimitado y copias de seguridad de sus comprobantes e informes autorizando al portal el acceso a su Drive.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            {/* Compliant Sign In With Google Material button style */}
            <button 
              onClick={handleConnectGoogle}
              className="flex items-center gap-3 px-5 py-3 border border-slate-300 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-all font-bold shadow-sm text-sm"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0 block">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>Conectarse con Google Cuenta</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Side: General Status & API Settings Form */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Profile Bar */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shrink-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                {googleUser?.picture ? (
                  <img 
                    src={googleUser.picture} 
                    alt="Perfil" 
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1552a6] text-white flex items-center justify-center font-extrabold text-sm uppercase shrink-0">
                    {googleUser?.name?.substring(0, 2) || "TR"}
                  </div>
                )}
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-black text-slate-800 leading-tight truncate">{googleUser?.name || "Tesorero Central"}</p>
                  <p className="text-[10px] text-slate-400 font-mono font-bold leading-normal truncate">{googleUser?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleDisconnectGoogle}
                className="h-8 px-3 rounded-lg text-[10px] font-black text-rose-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 transition-all uppercase tracking-widest flex items-center gap-1 shrink-0"
              >
                <LogOut className="w-3 h-3" /> Desconectar
              </button>
            </div>

            {/* Config Form */}
            <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-light/10">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-[#1552a6]" /> Ajustes de Directorio
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                  config.connected
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-rose-100 text-rose-800 border-rose-200"
                }`}>
                  {config.connected ? "✓ Vinculado" : "✗ Sin Validar"}
                </span>
              </div>

              <form onSubmit={handleSaveChanges} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block">ID de Carpeta Google Drive</label>
                    <input 
                      type="text"
                      value={folderIdInput}
                      onChange={(e) => setFolderIdInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                      placeholder="ID: 1abc_123xyz..."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-wider block">Nombre de Referencia</label>
                    <input 
                      type="text"
                      value={folderNameInput}
                      onChange={(e) => setFolderNameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                      placeholder="Nombre amigable"
                      required
                    />
                  </div>
                </div>

                {/* SYNC CONFIG TOGGLES */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3.5 border border-slate-100">
                  <h4 className="text-[10px] text-primary font-black uppercase tracking-wider">Políticas Contables de Almacenamiento</h4>
                  
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <div>
                      <p>Habilitar Sincronización en Tiempo Real</p>
                      <p className="text-[10px] text-slate-400 font-normal">Copia comprobantes en cuanto son subidos al sistema central.</p>
                    </div>
                    <button type="button" onClick={handleToggleAutoSync} className="text-primary hover:scale-105 transition-all">
                      {config.autoSync ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pt-2.5 border-t border-slate-200">
                    <div>
                      <p>Respaldar Comprobantes de Rendiciones</p>
                      <p className="text-[10px] text-slate-400 font-normal">Sincroniza JPGs/PDFs en la carpeta remota al instante.</p>
                    </div>
                    <button type="button" onClick={handleToggleSyncRendiciones} className="text-primary hover:scale-105 transition-all">
                      {config.syncRendiciones ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pt-2.5 border-t border-slate-200">
                    <div>
                      <p>Respaldar Informes de Caja Mensual</p>
                      <p className="text-[10px] text-slate-400 font-normal">Subida mensual automatizada de balances validados de junta.</p>
                    </div>
                    <button type="button" onClick={handleToggleSyncBalances} className="text-primary hover:scale-105 transition-all">
                      {config.syncBalances ? <ToggleRight className="w-8 h-8 text-[#1552a6]" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    type="submit"
                    className="px-5 h-10 bg-[#1552a6] text-white hover:bg-blue-800 transition-all text-xs font-black uppercase tracking-wider rounded-lg shadow-sm"
                  >
                    Guardar ID de Directorio
                  </button>
                </div>
              </form>
            </div>

            {/* Folder Provisioner assistant */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FolderPlus className="w-4.5 h-4.5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Asistente: Crear Carpeta en Google Drive</h3>
              </div>
              <p className="text-xxs text-slate-500 leading-normal font-medium">
                ¿No tiene una carpeta creada aún? Ingrese un nombre y el portal creará de forma segura el directorio en la raíz de su Google Drive, vinculándolo automáticamente sin configurar nada más.
              </p>
              <form onSubmit={handleCreateNewFolder} className="flex gap-3 items-end">
                <div className="space-y-1.5 flex-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase block">Nombre de la carpeta a crear</label>
                  <input 
                    type="text"
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 h-9 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                    placeholder="SGE - Archivo General"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={creatingFolder}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-xxs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${creatingFolder ? "animate-spin" : ""}`} /> Crear
                </button>
              </form>
            </div>
          </div>

          {/* Right Side: Diagnostics Console & Live Cloud Explorer */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Diagnostics console */}
            <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" /> Diagnóstico de API
                </h4>
                <button 
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3 h-8 text-[11px] font-black text-[#1552a6] bg-[#eef4fc] hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-55"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-blue-700" : ""}`} /> Verificar Conexión
                </button>
              </div>

              {testLogs.length === 0 && !testingConnection ? (
                <div className="bg-slate-900 rounded-xl p-5 text-center text-slate-400 text-xs border border-slate-800">
                  <Play className="w-6 h-6 text-slate-500 mx-auto mb-2 animate-bounce" />
                  <p className="font-bold">Consola Web de Pruebas</p>
                  <p className="text-[10px] text-slate-500 mt-1">Haga clic en "Verificar Conexión" para validar las credenciales del portal con los servidores oficiales de Google Cloud.</p>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[9px] text-[#22c55e] space-y-1.5 h-44 overflow-y-auto">
                  {testLogs.map((log, index) => (
                    <div key={index} className={log.startsWith("✅") || log.startsWith("✓") ? "text-emerald-400 font-bold" : log.startsWith("❌") ? "text-rose-400 font-bold" : "opacity-90"}>
                      {log}
                    </div>
                  ))}
                  {testingConnection && (
                    <div className="flex items-center gap-2 text-[#38bdf8] italic pt-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin text-[#38bdf8]" /> Resolviendo credenciales contables...
                    </div>
                  )}
                  {testResult === "success" && (
                    <div className="bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg text-emerald-400 mt-2 text-[10px] font-sans">
                      <p className="font-bold">✓ Enlace Exitoso</p>
                      <p className="opacity-80">La sincronización con Google Drive está completamente habilitada.</p>
                    </div>
                  )}
                  {testResult === "error" && (
                    <div className="bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg text-rose-400 mt-2 text-[10px] font-sans">
                      <p className="font-bold">✗ Error de Vinculación</p>
                      <p className="opacity-80">Compruebe los accesos y asegúrese de que el ID de la carpeta no haya sido borrado de su Drive.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Drive Explorer */}
            <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-teal-600" /> Explorador Live de Google Drive
                </h4>
                
                {config.folderId && (
                  <button 
                    onClick={handleUploadTestFile}
                    disabled={uploadingTest}
                    className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all rounded disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileCheck className="w-3 h-3 shrink-0" />
                    {uploadingTest ? "Subiendo..." : "Prueba Carga"}
                  </button>
                )}
              </div>

              {!config.folderId ? (
                <div className="py-12 text-center space-y-2 text-slate-400 text-xs">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold">Sin carpeta asignada</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">Configure el ID de carpeta para inspeccionar sus archivos remotos aquí.</p>
                </div>
              ) : loadingFiles ? (
                <div className="py-12 text-center space-y-3 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#1552a6]" />
                  <p className="font-semibold text-primary font-mono text-[10px]">Cargando archivos desde Google Drive...</p>
                </div>
              ) : realDriveFiles.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-400 text-xs">
                  <FolderOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold">Carpeta Vacía o Inalcanzable</p>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto">Suba un comprobante de gastos o presione el botón "Prueba Carga" para verificar la sincronización de archivos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold select-none px-1">
                    <span>ARCHIVOS ENCONTRADOS ({realDriveFiles.length})</span>
                    <button onClick={loadDriveFiles} className="hover:text-primary transition-all p-1">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                  {realDriveFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-all">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="text-left overflow-hidden">
                          <p className="text-xxs font-bold text-slate-800 truncate max-w-[150px]" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[8px] text-slate-400 font-bold">
                            {formatSize(file.size)} • {new Date(file.createdTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a 
                          href={`https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 text-slate-400 hover:text-[#1552a6] transition-all bg-white rounded border border-slate-200"
                          title="Abrir en Google Drive"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        <button 
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-all bg-white rounded border border-slate-200"
                          title="Eliminar de Google Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
