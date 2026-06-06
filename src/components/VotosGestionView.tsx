import React, { useState } from "react";
import { User, BoardVoto } from "../types";
import { Search, FileCode, CheckCircle, ExternalLink, Calendar, Edit2, X, Download, Plus, FileText } from "lucide-react";

export interface VotosGestionViewProps {
  currentUser: User;
  boardVotos: BoardVoto[];
  onUpdateBoardVotoStatus: (votoId: string, newStatus: "Pendiente" | "Aprobado" | "Observado", obsText?: string) => void;
  onEditBoardVoto: (v: BoardVoto) => void;
  votosPlazoLimite: string;
  onUpdateVotosPlazoLimite: (newPlazo: string) => void;
  onAddBoardVoto?: (v: BoardVoto) => void;
}

export const VotosGestionView: React.FC<VotosGestionViewProps> = ({
  currentUser,
  boardVotos,
  onUpdateBoardVotoStatus,
  onEditBoardVoto,
  votosPlazoLimite,
  onUpdateVotosPlazoLimite,
  onAddBoardVoto
}) => {
  const [searchVoto, setSearchVoto] = useState("");
  const [newDeadLineInput, setNewDeadLineInput] = useState("");
  const [votoEditingId, setVotoEditingId] = useState<string | null>(null);
  const [votoEditingDesc, setVotoEditingDesc] = useState("");
  const [votoEditingDept, setVotoEditingDept] = useState("");
  const [votoEditingLink, setVotoEditingLink] = useState("");
  
  const [votoObservingId, setVotoObservingId] = useState<string | null>(null);
  const [votoObservacionesInput, setVotoObservacionesInput] = useState("");

  // Creation State
  const [isCreatingVote, setIsCreatingVote] = useState(false);
  const [createDept, setCreateDept] = useState("Secretaría de Iglesia");
  const [createDesc, setCreateDesc] = useState("PROPONE ");
  const [createLink, setCreateLink] = useState("");
  const [createStatus, setCreateStatus] = useState<"Pendiente" | "Aprobado">("Aprobado");

  const handleCreateDirectVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDesc.trim() || !createDesc.toUpperCase().startsWith("PROPONE")) {
      alert("Por formalidad constitucional, el texto de la propuesta eclesiástica obligatoriamente debe comenzar con la palabra de consigna 'PROPONE'.");
      return;
    }

    if (onAddBoardVoto) {
      onAddBoardVoto({
        id: "voto-" + (boardVotos.length + 1) + "-" + Date.now(),
        descripcion: createDesc,
        departamento: createDept,
        solicitante: currentUser.name,
        solicitanteEmail: currentUser.email,
        linkDriveDoc: createLink || undefined,
        fechaEnvio: new Date().toISOString().split("T")[0],
        estado: createStatus
      });

      alert(`¡Voto creado exitosamente de forma directa con estado "${createStatus}"!`);
      setCreateDesc("PROPONE ");
      setCreateLink("");
      setIsCreatingVote(false);
    }
  };

  const handleExportAgendaDoc = () => {
    const headerTitle = "========================================================\n" +
                        "                 IGLESIA ADVENTISTA LOCAL\n" +
                        "                         ACTA\n" +
                        "                   JUNTA DIRECTIVA\n"
                        "========================================================\n\n" +
                        "    Celebrada el  de  de 20, a las . Hrs.\n\n" +
                        "         Sede Local - Distrito Central \n\n";

    const metaSection = `MIEMBROS PARTICIPANTES:\n` +
                        `ORACION:\n` +
                        "--------------------------------------------------------\n\n";

    let propuestas = "VOTOS:\n";
    const approvedVotos = boardVotos.filter(v => v.estado === "Aprobado");
    
    if (approvedVotos.length === 0) {
      propuestas += "(No se registran votos aprobados en esta sesión)\n\n";
    } else {
      approvedVotos.forEach((v, index) => {
        propuestas += `${index + 1}. [${v.departamento.toUpperCase()}] PROPONE:\n` +
                      `   "${v.descripcion}"\n` +
                      `   • Solicitante: ${v.solicitante} (${v.fechaEnvio})\n` +
                      `   • Folio de Control: ${v.id.substring(0, 8)}\n` +
                      (v.linkDriveDoc ? `   • Documento de Soporte: ${v.linkDriveDoc}\n` : "") +
                      "\n";
      });
    }

    let cierre = "ORACIÓN FINAL:\n" +
                 "--------------------------------------------------------\n" +
                 "Pr. Nombre                              " + currentUser.name + "\n" +
                 "Pastor Distrital & Presidente            Secretaria de Iglesia\n\n" +
                 "========================================================\n";

    const textPayload = headerTitle + metaSection + propuestas + cierre;
    const blob = new Blob([textPayload], { type: "application/msword;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Agenda_Oficial_Junta_Limite_${votosPlazoLimite}.doc`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    alert(`¡Agenda exportada satisfactoriamente!\nSe ha generado y descargado el archivo "Agenda_Oficial_Junta_Limite_${votosPlazoLimite}.doc".`);
  };

  const filteredVotos = boardVotos.filter(v => 
    v.departamento.toLowerCase().includes(searchVoto.toLowerCase()) || 
    v.descripcion.toLowerCase().includes(searchVoto.toLowerCase()) ||
    v.solicitante.toLowerCase().includes(searchVoto.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* Statistics & Deadline Config bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
        <div className="md:col-span-8 space-y-1">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase rounded-full">Consolidación de Sesión</span>
          <h3 className="font-sans text-base font-black text-primary">Plazo de Envío y Cronograma de Agenda</h3>
          <p className="text-xs text-on-surface-variant font-medium">
            Módulo restrictivo para revisar solicitudes de agenda para junta, clasificar votos, enmendar descripciones y fijar plazos límitativos.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-secondary" />
              Plazo de Solicitud: <span className="font-mono text-blue-700 font-extrabold ml-1">
                {votosPlazoLimite ? `Miércoles, ${new Date(votosPlazoLimite).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : "No definido"}
              </span>
            </div>
          </div>
        </div>

        {/* Deadline configure form */}
        <div className="md:col-span-4 bg-[#f8fafc] text-primary p-4 rounded-xl space-y-2 border border-slate-200 self-stretch flex flex-col justify-center shadow-inner">
          <div className="space-y-1.5 text-xs text-left">
            <label className="font-extrabold text-[10px] uppercase text-primary tracking-wider block text-slate-700">✍️ Fijar Plazo Límite (Secretaría)</label>
            <div className="flex gap-1.5">
              <input 
                type="date"
                value={newDeadLineInput}
                onChange={(e) => setNewDeadLineInput(e.target.value)}
                className="p-2 border border-slate-200 bg-white font-semibold text-primary outline-none focus:border-indigo-500 text-xs rounded-lg flex-1"
              />
              <button 
                onClick={() => {
                  if (!newDeadLineInput) return;
                  onUpdateVotosPlazoLimite(newDeadLineInput);
                  alert(`¡Plazo límite actualizado a ${newDeadLineInput} exitosamente!`);
                }}
                className="py-1.5 px-3 bg-indigo-600 text-white font-extrabold text-[11px] rounded-lg hover:bg-indigo-750 transition-all shadow"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-12 space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="font-sans text-xs font-black text-primary uppercase tracking-wider">Mociones Presentadas (Revisión de Secretaría)</h3>
              <button
                type="button"
                onClick={() => setIsCreatingVote(prev => !prev)}
                className="px-2.5 py-1 text-[10px] uppercase font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
              >
                {isCreatingVote ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {isCreatingVote ? "Cerrar Formulario" : "Crear Voto"}
              </button>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por departamento o líder..."
                value={searchVoto}
                onChange={(e) => setSearchVoto(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs rounded-full border border-slate-200 bg-transparent outline-none focus:border-indigo-550 w-full"
              />
            </div>
          </div>

          {/* Create Direct Vote Form */}
          {isCreatingVote && (
            <div className="bg-indigo-50/50 border border-indigo-200 p-5 rounded-2xl space-y-4 text-xs font-medium animate-fade-in text-left">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-indigo-900 uppercase tracking-wide">🆕 Crear Propuesta de Voto Directo (Secretaría)</h4>
                <button onClick={() => setIsCreatingVote(false)} className="p-1 hover:bg-indigo-100 rounded text-indigo-900">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDirectVote} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700">Departamento Solicitante</label>
                    <select 
                      value={createDept}
                      onChange={(e) => setCreateDept(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 mt-1 rounded-lg outline-none font-bold text-primary cursor-pointer text-xs"
                    >
                      <option value="Secretaría de Iglesia">Secretaría de Iglesia</option>
                      <option value="Tesorería Local">Tesorería Local</option>
                      <option value="Ministerio Joven">Ministerio Joven</option>
                      <option value="Ministerio Infantil">Ministerio Infantil</option>
                      <option value="ADRA / Acción Social">ADRA / Acción Social</option>
                      <option value="Diaconado / Infraestructura">Diaconado / Infraestructura</option>
                      <option value="Música y Audio Visual">Música y Audio Visual</option>
                      <option value="Evangelismo y Misión">Evangelismo y Misión</option>
                      <option value="Ministerio de la Mujer">Ministerio de la Mujer</option>
                      <option value="Club de Aventureros">Club de Aventureros</option>
                      <option value="Club de Conquistadores">Club de Conquistadores</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Enlace Documento Drive (Opcional)</label>
                    <input 
                      type="url" 
                      placeholder="https://drive.google.com..."
                      value={createLink}
                      onChange={(e) => setCreateLink(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 mt-1 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Estado Inicial</label>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateStatus("Aprobado")}
                        className={`flex-1 py-1 px-3.5 rounded-lg border text-[11px] font-black uppercase transition-all whitespace-nowrap ${
                          createStatus === "Aprobado"
                            ? "bg-green-100 text-green-800 border-green-300 shadow-sm"
                            : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Aprobado (Agenda)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateStatus("Pendiente")}
                        className={`flex-1 py-1 px-3.5 rounded-lg border text-[11px] font-black uppercase transition-all whitespace-nowrap ${
                          createStatus === "Pendiente"
                            ? "bg-blue-100 text-blue-800 border-blue-300 shadow-sm"
                            : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        Pendiente (Por Revisar)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 block">Texto de la Propuesta</label>
                    <span className="text-[10px] text-indigo-750 font-extrabold uppercase bg-indigo-50 px-1 border border-indigo-200 rounded">Debe iniciar con PROPONE</span>
                  </div>
                  <textarea 
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="PROPONE..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-lg outline-none mt-1 min-h-[90px] font-bold text-primary"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setIsCreatingVote(false)} className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300 hover:bg-slate-250 cursor-pointer">
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg shadow-md flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Crear y Registrar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Inline Editing Form */}
          {votoEditingId && (
            <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl space-y-4 text-xs font-medium animate-fade-in">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-blue-900 uppercase tracking-wide">✏️ Editar Solicitud de Voto (Secretaría)</h4>
                <button onClick={() => setVotoEditingId(null)} className="p-1 hover:bg-blue-100 rounded text-blue-900">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Departamento</label>
                  <input 
                    type="text" 
                    value={votoEditingDept} 
                    onChange={(e) => setVotoEditingDept(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none mt-1 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Enlace Documento Drive (Opcional)</label>
                  <input 
                    type="text" 
                    value={votoEditingLink} 
                    onChange={(e) => setVotoEditingLink(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none mt-1 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Texto Propuesta (Debe empezar con PROPONE)</label>
                <textarea 
                  value={votoEditingDesc} 
                  onChange={(e) => setVotoEditingDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 p-3.5 rounded-lg outline-none mt-1 min-h-[80px] font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs">
                <button onClick={() => setVotoEditingId(null)} className="px-3 py-1.5 bg-slate-205 text-slate-800 font-bold rounded-lg border border-slate-350">
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (!votoEditingDesc.toUpperCase().startsWith("PROPONE")) {
                      alert("La propuesta editada DEBE empezar con la palabra 'PROPONE'.");
                      return;
                    }
                    const updated = boardVotos.find(v => v.id === votoEditingId);
                    if (updated) {
                      const newV = {
                        ...updated,
                        descripcion: votoEditingDesc,
                        departamento: votoEditingDept,
                        linkDriveDoc: votoEditingLink || undefined
                      };
                      onEditBoardVoto(newV);
                      alert("¡Propuesta de voto rectificada exitosamente!");
                    }
                    setVotoEditingId(null);
                  }}
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg shadow"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredVotos.map((v) => {
              const isObservingThis = votoObservingId === v.id;
              return (
                <div key={v.id} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all text-left space-y-3 relative overflow-hidden ${
                  v.estado === "Aprobado" ? "border-green-200" : v.estado === "Observado" ? "border-amber-250 bg-amber-50/10" : "border-slate-200"
                }`}>
                  <div className="absolute top-4 right-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      v.estado === "Aprobado" 
                        ? "bg-green-100 text-green-800 border border-green-200" 
                        : v.estado === "Observado"
                        ? "bg-amber-100 text-amber-850 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200/50"
                    }`}>
                      {v.estado}
                    </span>
                  </div>

                  <div className="flex gap-2 items-start text-xs pr-20 select-none">
                    <div className={`p-1.5 rounded-xl ${
                      v.estado === "Aprobado" ? "bg-green-50 text-green-600" : v.estado === "Observado" ? "bg-amber-50 text-amber-600" : "bg-[#f1f5f9] text-blue-600"
                    }`}>
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-[#112435] text-xs block">{v.departamento}</span>
                      <span className="text-[10px] text-gray-450 font-bold font-mono">Presentado por: {v.solicitante} &bull; Enviado: {v.fechaEnvio}</span>
                    </div>
                  </div>

                  <div className="text-xs bg-[#f8fafc] p-3.5 rounded-xl border border-slate-150">
                    <p className="font-black text-primary leading-relaxed whitespace-pre-wrap">{v.descripcion}</p>
                    {v.linkDriveDoc && (
                      <div className="mt-2 text-right">
                        <a href={v.linkDriveDoc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-primary font-bold">
                          <ExternalLink className="w-3 h-3 text-blue-600" /> Ver Documento Moción en Drive
                        </a>
                      </div>
                    )}
                  </div>

                  {v.estado === "Observado" && v.observaciones && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-950 font-bold font-sans">
                      <span className="font-black uppercase tracking-wider text-[9px] text-amber-800 block mb-0.5">⚠️ Observación de Secretaría:</span>
                      "{v.observaciones}"
                    </div>
                  )}

                  {isObservingThis && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 space-y-2 mt-2 text-xs">
                      <label className="font-black text-amber-950 uppercase text-[9px] block">Motivo / Requerimiento de Observación</label>
                      <input 
                        type="text"
                        value={votoObservacionesInput}
                        onChange={(e) => setVotoObservacionesInput(e.target.value)}
                        placeholder="Falta detallar presupuesto o cotizaciones..."
                        className="w-full bg-white border border-amber-300 rounded-lg p-2.5 outline-none font-semibold text-slate-800"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setVotoObservingId(null)} className="px-3 py-1 bg-slate-205 rounded font-extrabold text-slate-700">Cancelar</button>
                        <button 
                          onClick={() => {
                            if (!votoObservacionesInput.trim()) return;
                            onUpdateBoardVotoStatus(v.id, "Observado", votoObservacionesInput);
                            setVotoObservingId(null);
                            setVotoObservacionesInput("");
                          }} 
                          className="px-3.5 py-1 bg-amber-600 text-white font-extrabold rounded shadow"
                        >
                          Guardar Observación
                        </button>
                      </div>
                    </div>
                  )}

                  {!votoEditingId && (
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 select-none flex-wrap">
                      {v.estado !== "Aprobado" && (
                        <button 
                          onClick={() => onUpdateBoardVotoStatus(v.id, "Aprobado")}
                          className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg border border-green-200 text-[10px] shadow-sm"
                        >
                          Aprobar e Indexar
                        </button>
                      )}

                      {v.estado !== "Observado" && !isObservingThis && (
                        <button 
                          onClick={() => setVotoObservingId(v.id)}
                          className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg border border-amber-200 text-[10px] shadow-sm"
                        >
                          Observar Propuesta
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setVotoEditingId(v.id);
                          setVotoEditingDesc(v.descripcion);
                          setVotoEditingDept(v.departamento);
                          setVotoEditingLink(v.linkDriveDoc || "");
                        }}
                        className="px-3 py-1 bg-slate-50 hover:bg-slate-200 text-primary font-bold rounded-lg border text-[10px] shadow-sm"
                      >
                        Corregir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider">Generar Agenda Oficial de la Sesión</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-medium text-slate-500">Combina y empaqueta las propuestas aprobadas para junta directiva (.doc)</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleExportAgendaDoc}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-750 text-white font-black text-xs rounded-xl hover:shadow-lg hover:scale-[1.02] flex items-center gap-1.5 transition-all shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Agenda (.docx)
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-red-650 hover:bg-red-750 text-white font-black text-xs rounded-xl hover:shadow-lg hover:scale-[1.02] flex items-center gap-1.5 transition-all shadow cursor-pointer"
                    title="Exportar agenda en formato PDF para el Pastor y Primer Anciano"
                  >
                    <FileText className="w-3.5 h-3.5" /> Exportar agenda PDF (.pdf)
                  </button>
                </div>
              </div>

              <div className="border border-slate-300 shadow-inner rounded-xl p-6 sm:p-10 max-w-2xl mx-auto bg-white text-slate-900 border-t-8 border-t-primary font-serif">
                <div className="text-center font-sans space-y-1.5 border-b-2 border-primary pb-5">
                  <div className="text-lg font-black text-primary tracking-wide">IGLESIA LOS CREADORES</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">ACTA</div>
                  <div className="text-xs text-red-700 font-extrabold bg-red-100/40 inline-block px-3 py-0.5 rounded border border-red-200/50">JUNTA DIRECTIVA</div>
                </div>

                <div className="space-y-6 pt-6 font-sans text-xs select-none">
                  <div className="text-center">
                    <h4 className="text-sm font-black text-primary uppercase">AGENDA PRELIMINAR DE JUNTA DIRECTIVA</h4>
                    <span className="text-[10px] text-gray-500 italic font-mono block mt-1">Celebrada el 07 de marzo de 2026, a las 15.30 Hrs.</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-[10px]">
                    <strong>SESIÓN EXPORTABLE:</strong> {votosPlazoLimite}<br />
                    <strong>CONVOCADO POR:</strong> Pastor (Presidencia de Junta)<br />
                    <strong>RECOPILADO POR:</strong> {currentUser.name} (Secretaría de Actas)<br />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="font-extrabold uppercase text-[#1a365d] border-b border-slate-200 block pb-0.5 mb-1.5">MIEMBROS PARTICIPANTES:</span>
                      <ul className="list-decimal list-inside text-gray-750 pl-2 space-y-0.5 text-[11px] font-medium">
                        <li>ORACIÓN INICIAL:</li>
                      </ul>
                    </div>

                    <div>
                      <span className="font-extrabold uppercase text-[#1a365d] border-b border-slate-200 block pb-0.5 mb-1.5">PROPUESTAS:</span>
                      <ul className="list-decimal list-inside text-gray-850 pl-2 space-y-2.5 text-[11px] font-bold">
                        {boardVotos.filter(v => v.estado === "Aprobado").map((v) => (
                          <li key={v.id} className="leading-relaxed border-l-2 border-slate-350 pl-2">
                            <strong>{v.departamento}</strong>: {v.descripcion}
                          </li>
                        ))}
                        {boardVotos.filter(v => v.estado === "Aprobado").length === 0 && (
                          <li className="text-gray-500 italic font-medium">No hay propuestas aprobadas registradas todavía para esta sesión.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
