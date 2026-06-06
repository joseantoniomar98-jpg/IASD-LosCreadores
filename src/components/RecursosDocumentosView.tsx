import React, { useState } from "react";
import { User, ResourceFile } from "../types";
import { 
  Folder, FileText, Image, FileArchive, Search, Download, 
  UploadCloud, Cloud, ExternalLink, RefreshCw, CheckCircle, Info,
  Trash2, Edit, Check, X, FileSpreadsheet, Layers
} from "lucide-react";

interface RecursosDocumentosProps {
  currentUser?: User;
  mode?: "view" | "gestion";
  resources: ResourceFile[];
  onUpdateResources: React.Dispatch<React.SetStateAction<ResourceFile[]>>;
}

export const RecursosDocumentosView: React.FC<RecursosDocumentosProps> = ({ 
  currentUser,
  mode = "view",
  resources,
  onUpdateResources
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // States of upload settings
  const [uploadCategory, setUploadCategory] = useState<"templates" | "logos" | "manuals">("templates");

  // Inline rename state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState("");

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("¡Sincronización con Google Drive completada satisfactoriamente!\nSe ha validado el catálogo del repositorio compartido de la Iglesia con los archivos en la nube.");
    }, 1200);
  };

  const handleDownload = (file: ResourceFile) => {
    // Increment download count locally
    onUpdateResources(prev => prev.map(r => r.id === file.id ? { ...r, downloads: r.downloads + 1 } : r));
    
    // Mock download anchor
    const textPayload = `Este es el archivo simulado de Google Drive para: ${file.name}\nDescarga oficial autorizada para la Iglesia Los Creadores.`;
    const blob = new Blob([textPayload], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = file.name;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  };

  const isUploadAllowed = currentUser?.roles.some(r => 
    r.toLowerCase().includes("tesorero") || 
    r.toLowerCase().includes("secretar")
  ) ?? false;

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileUploaded = e.dataTransfer.files[0];
      const newFile: ResourceFile = {
        id: "res-" + Date.now(),
        name: fileUploaded.name,
        category: uploadCategory,
        type: fileUploaded.name.toLowerCase().endsWith(".pdf") ? "pdf" : 
              fileUploaded.name.toLowerCase().endsWith(".zip") ? "zip" : 
              (fileUploaded.name.toLowerCase().endsWith(".png") || fileUploaded.name.toLowerCase().endsWith(".jpg")) ? "image" : "doc",
        size: (fileUploaded.size / 1024 < 1024) 
          ? `${(fileUploaded.size / 1024).toFixed(1)} KB`
          : `${(fileUploaded.size / 1024 / 1024).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0],
        downloads: 0
      };
      onUpdateResources(prev => [newFile, ...prev]);
      alert(`¡Archivo "${fileUploaded.name}" subido con éxito en la categoría selecionada y respaldado en Google Drive!`);
    }
  };

  const handleManualUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUploaded = e.target.files[0];
      const newFile: ResourceFile = {
        id: "res-" + Date.now(),
        name: fileUploaded.name,
        category: uploadCategory,
        type: fileUploaded.name.toLowerCase().endsWith(".pdf") ? "pdf" : 
              fileUploaded.name.toLowerCase().endsWith(".zip") ? "zip" : 
              (fileUploaded.name.toLowerCase().endsWith(".png") || fileUploaded.name.toLowerCase().endsWith(".jpg")) ? "image" : "doc",
        size: (fileUploaded.size / 1024 < 1024) 
          ? `${(fileUploaded.size / 1024).toFixed(1)} KB`
          : `${(fileUploaded.size / 1024 / 1024).toFixed(1)} MB`,
        date: new Date().toISOString().split("T")[0],
        downloads: 0
      };
      onUpdateResources(prev => [newFile, ...prev]);
      alert(`¡Archivo "${fileUploaded.name}" cargado con éxito en la categoría Seleccionada!`);
    }
  };

  const handleDeleteFile = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar definitivamente el recurso "${name}"?\nEsta acción lo borrará del repositorio y de Google Drive.`)) {
      onUpdateResources(prev => prev.filter(r => r.id !== id));
    }
  };

  const startRenameFile = (file: ResourceFile) => {
    setEditingFileId(file.id);
    setEditingFileName(file.name);
  };

  const saveRenameFile = () => {
    if (!editingFileName.trim()) return;
    onUpdateResources(prev => prev.map(r => r.id === editingFileId ? { ...r, name: editingFileName.trim() } : r));
    setEditingFileId(null);
  };

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || res.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-left" id={`recursos-${mode}-view`}>
      {/* Header section with Google Drive Integration Status */}
      <div className="bg-white p-6 rounded-2xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className={`font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md inline-block mb-1.5 ${
            mode === "gestion" ? "bg-indigo-100 text-indigo-800" : "bg-[#1552a6]/10 text-[#1552a6]"
          }`}>
            {mode === "gestion" ? "⚙️ PANEL DE CONTROL DE DOCUMENTOS" : "📂 REPOSiTORIO COMENTADO DE LA IGLESIA"}
          </span>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight">
            {mode === "gestion" ? "Gestión Administrativa de Recursos" : "Recursos y Formatos Oficiales"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {mode === "gestion" 
              ? "Cargue nuevos formatos de rendiciones, actualice logotipos, reemplace manuales de junta y administre la disponibilidad de archivos del Drive compartido para toda la feligresía."
              : "Acceso unificado a las plantillas de Word oficiales, manuales de administración departamental, reglamentos financieros y logotipos en alta resolución compartidos por Tesorería."
            }
          </p>
        </div>

        {isUploadAllowed && (
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0 select-none">
            <button 
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar Cloud
            </button>
            
            <a
              href="https://drive.google.com/drive/folders/iglesia_los_creadores"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-750 text-white rounded-xl text-xs font-extrabold hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              Ver Raíz Drive
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {mode === "gestion" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <strong>Módulo de Gobernación Oficial:</strong> Estás en la vista de administración exclusiva para la Secretaría General y la Tesorería. Los cambios realizados aquí (subidas de formatos, renombrado o eliminación de logotipos) se propagan de manera inmediata y en tiempo real a la vista de los directores de departamento.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Filter Catalog & Upload Center */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/60 shadow-sm space-y-4">
            <h3 className="font-sans text-xs font-black text-slate-500 uppercase tracking-wider">Carpetas del Repositorio</h3>
            
            <div className="space-y-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  activeCategory === "all"
                    ? "bg-slate-100 text-slate-900 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="text-[11px] font-semibold">Todos los archivos</span>
                </div>
                <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {resources.length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory("templates")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  activeCategory === "templates"
                    ? "bg-slate-100 text-slate-900 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-500 fill-emerald-500 shrink-0" />
                  <span className="text-[11px] font-semibold">Formatos y Plantillas</span>
                </div>
                <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {resources.filter(r => r.category === "templates").length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory("logos")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  activeCategory === "logos"
                    ? "bg-slate-100 text-slate-900 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                  <span className="text-[11px] font-semibold">Logotipos e Identidad</span>
                </div>
                <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {resources.filter(r => r.category === "logos").length}
                </span>
              </button>

              <button
                onClick={() => setActiveCategory("manuals")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                  activeCategory === "manuals"
                    ? "bg-slate-100 text-slate-900 font-extrabold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-purple-500 fill-purple-500 shrink-0" />
                  <span className="text-[11px] font-semibold">Manuales y Guías</span>
                </div>
                <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {resources.filter(r => r.category === "manuals").length}
                </span>
              </button>
            </div>
          </div>

          {/* Secretary/Treasurer Upload Box - ONLY visible in GESTION view */}
          {mode === "gestion" && isUploadAllowed && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <span className="text-[9px] text-[#1552a6] font-black uppercase tracking-wider block">
                📤 CREADOR DE RECURSOS
              </span>
              
              <div className="space-y-1 text-xs">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Categoría destino:</label>
                <select 
                  value={uploadCategory} 
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 p-2 rounded-lg text-xs outline-none text-primary font-bold"
                >
                  <option value="templates">Formatos y Plantillas</option>
                  <option value="logos">Logotipos e Identidad</option>
                  <option value="manuals">Manuales y Guías</option>
                </select>
              </div>

              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-5 rounded-xl justify-center text-center space-y-3 transition-all ${
                  dragActive ? "border-[#1552a6] bg-blue-50/50" : "border-slate-300 bg-slate-50/30"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#1552a6]/10 mx-auto flex items-center justify-center text-[#1552a6]">
                  <UploadCloud className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[11px] text-slate-800">Cargar Archivo</h4>
                  <p className="text-[9px] text-slate-400 mt-1">Arrastra documentos o haz clic abajo para publicar.</p>
                </div>
                <label className="inline-block px-3 py-1.5 bg-slate-900 border border-slate-950 hover:bg-slate-850 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider select-none transition-all cursor-pointer">
                  Examinar Local
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleManualUploadChange} 
                  />
                </label>
              </div>
            </div>
          )}

          {mode === "view" && (
            <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 select-none">
              <div className="flex gap-2 items-start text-[11px] text-slate-500 leading-normal">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700">Repositorio Privado</p>
                  <p className="mt-1">
                    Esta ventana es de solo lectura y descarga. Si requiere sustituir alguna plantilla o subir nuevos manuales corporativos, diríjase a la sección de <strong>Gestión de Recursos</strong> en su barra lateral de navegación (restringido a directivas).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Explorer Grid list */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Search bar */}
          <div className="bg-white p-3 rounded-2xl border border-outline-variant/60 shadow-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
            <input
              type="text"
              placeholder="Buscar por nombre de plantilla, logotipo, reglamento, archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-none p-1 text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Files List Container */}
          <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden">
            <div className="border-b border-outline-variant/30 px-6 py-4 bg-slate-50/50 flex justify-between items-center select-none">
              <span className="font-sans text-xs font-black text-slate-505 uppercase tracking-wider">
                Mostrando {filteredResources.length} de {resources.length} documentos
              </span>
            </div>

            {filteredResources.length > 0 ? (
              <div className="divide-y divide-outline-variant/30">
                {filteredResources.map((file) => {
                  const isEditingThis = editingFileId === file.id;

                  return (
                    <div key={file.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                      
                      {/* Left: icon & details of file */}
                      <div className="flex gap-3 items-center flex-1 w-full overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          {file.type === "image" ? (
                            <Image className="w-5 h-5 text-blue-600" />
                          ) : file.type === "pdf" ? (
                            <FileText className="w-5 h-5 text-red-600" />
                          ) : file.type === "zip" ? (
                            <FileArchive className="w-5 h-5 text-amber-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-700" />
                          )}
                        </div>

                        <div className="text-left leading-tight flex-1 min-w-0">
                          {/* File Name Header or Edit Inline Input */}
                          {isEditingThis ? (
                            <div className="flex items-center gap-1.5 w-full max-w-md bg-slate-100 p-0.5 px-2 rounded-lg border border-slate-300">
                              <input 
                                type="text"
                                value={editingFileName}
                                onChange={(e) => setEditingFileName(e.target.value)}
                                className="w-full bg-transparent text-slate-800 text-xs font-bold outline-none border-none py-1"
                                autoFocus
                              />
                              <button 
                                onClick={saveRenameFile}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Guardar cambios"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingFileId(null)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <p className="font-bold text-slate-800 text-[12px] truncate select-all">{file.name}</p>
                              {mode === "gestion" && (
                                <button
                                  onClick={() => startRenameFile(file)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Renombrar archivo"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* File Sub-Metadata */}
                          <div className="flex flex-wrap gap-2.5 items-center text-[10px] text-slate-450 font-medium mt-1">
                            <span className="uppercase font-extrabold bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-mono text-[7px]">{file.type}</span>
                            <span className="bg-[#1552a6]/5 text-[#1552a6] font-bold px-1.5 rounded-md uppercase tracking-wider text-[7.5px] flex items-center gap-0.5">
                              <Layers className="w-2.5 h-2.5" /> {file.category === "templates" ? "Plantilla" : file.category === "logos" ? "Identidad" : "Manual / Guía"}
                            </span>
                            <span>{file.size}</span>
                            <span>Sincronizado: {file.date}</span>
                            <span className="text-slate-400 font-bold">Descargas: {file.downloads}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions download, delete, rename buttons */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 select-none">
                        
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-100 hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-wider rounded-xl text-slate-700 flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 cursor-pointer shrink-0"
                          title="Descargar plantilla a su pc"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" /> Descargar
                        </button>

                        {mode === "gestion" && (
                          <button
                            onClick={() => handleDeleteFile(file.id, file.name)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
                            title="Eliminar del catálogo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Folder className="w-12 h-12 text-slate-200 mx-auto fill-slate-50" />
                <p className="font-bold text-slate-600">No se encontraron archivos en esta carpeta</p>
                <p className="text-xs text-slate-400">Intenta cambiar los términos de búsqueda o selecciona otra categoría.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
