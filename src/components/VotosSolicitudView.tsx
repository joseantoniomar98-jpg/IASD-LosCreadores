import React, { useState } from "react";
import { User, BoardVoto } from "../types";
import { Plus, Search, FileCode, FileUp, ExternalLink, Calendar } from "lucide-react";

export interface VotosSolicitudViewProps {
  currentUser: User;
  boardVotos: BoardVoto[];
  onAddBoardVoto: (v: BoardVoto) => void;
  votosPlazoLimite: string;
}

export const VotosSolicitudView: React.FC<VotosSolicitudViewProps> = ({
  currentUser,
  boardVotos,
  onAddBoardVoto,
  votosPlazoLimite
}) => {
  const [newVotoDept, setNewVotoDept] = useState("Ministerio Joven");
  const [newVotoDesc, setNewVotoDesc] = useState("PROPONE ");
  const [newVotoLinkDrive, setNewVotoLinkDrive] = useState("");
  const [searchVoto, setSearchVoto] = useState("");

  const handleRegisterVoteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVotoDesc.trim() || !newVotoDesc.toUpperCase().startsWith("PROPONE")) {
      alert("Por seguridad constitucional de IASD, el texto de la propuesta obligatoriamente debe comenzar con la palabra de consigna 'PROPONE'.");
      return;
    }

    onAddBoardVoto({
      id: "voto-" + (boardVotos.length + 1) + "-" + Date.now(),
      descripcion: newVotoDesc,
      departamento: newVotoDept,
      solicitante: currentUser.name,
      solicitanteEmail: currentUser.email,
      linkDriveDoc: newVotoLinkDrive || undefined,
      fechaEnvio: new Date().toISOString().split("T")[0],
      estado: "Pendiente"
    });

    alert(`¡Solicitud de Voto registrada con éxito en el sistema!\nSe ha notificado vía correo a la secretaría de la junta.`);
    setNewVotoDesc("PROPONE ");
    setNewVotoLinkDrive("");
  };

  // Filter only own proposed board votes or show general for reference
  const filteredVotos = boardVotos.filter(v => 
    (v.solicitante.toLowerCase().includes(currentUser.name.toLowerCase()) || 
     currentUser.roles.some(r => r.toLowerCase().includes("secretar") || r.toLowerCase().includes("pastor") || r.toLowerCase().includes("anciano") || r.toLowerCase().includes("líder"))) &&
    (v.departamento.toLowerCase().includes(searchVoto.toLowerCase()) || v.descripcion.toLowerCase().includes(searchVoto.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-5 rounded-2xl border border-dotted border-slate-300 shadow-sm">
        <div className="md:col-span-8 space-y-1">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">Plazos de Recepción</span>
          <h3 className="font-sans text-base font-black text-primary">Plazo de Envío y Cronograma de Agenda</h3>
          <p className="text-xs text-on-surface-variant font-medium">
            Los oficiales y directores locales deben despachar sus mociones de agenda antes del plazo estipulado.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-secondary" />
              Plazo Máximo: <span className="font-mono text-blue-700 font-extrabold ml-1">
                {votosPlazoLimite ? `Miércoles, ${new Date(votosPlazoLimite).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : "No definido"}
              </span>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 bg-slate-50 text-slate-800 p-4 rounded-xl text-center border border-slate-200">
          <span className="font-black text-xs text-primary uppercase block">Recepción de Solicitudes</span>
          <span className="inline-block mt-1 px-3 py-1 bg-green-100 border border-green-200 text-green-800 font-mono text-[10px] font-black rounded-lg">● ABIERTO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider text-blue-600">Crear Solicitud de Voto</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Define los términos de la moción respetando el estilo formal.</p>
            </div>

            <form onSubmit={handleRegisterVoteRequest} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Departamento Solicitante</label>
                <select 
                  value={newVotoDept}
                  onChange={(e) => setNewVotoDept(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none font-bold text-primary cursor-pointer text-xs"
                >
                  <option value="Ministerio Joven">Ministerio Joven</option>
                  <option value="Ministerio Infantil">Ministerio Infantil</option>
                  <option value="ADRA / Acción Social">ADRA / Acción Social</option>
                  <option value="Diaconado / Infraestructura">Diaconado / Infraestructura</option>
                  <option value="Música y Audio Visual">Música y Audio Visual</option>
                  <option value="Evangelismo y Misión">Evangelismo y Misión</option>
                  <option value="Ministerio de la Mujer">Ministerio de la Mujer</option>
                  <option value="Club de Aventureros">Club de Aventureros</option>
                  <option value="Club de Conquistadores">Club de Conquistadores</option>
                  <option value="Tesorería Local">Tesorería Local</option>
                  <option value="Secretaría de Iglesia">Secretaría de Iglesia</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Oficial Solicitante</label>
                <input 
                  type="text" 
                  value={`${currentUser.name} (${currentUser.roles.join(", ")})`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-500 font-bold"
                  readOnly
                />
              </div>

              {/* Secure Google Drive Upload drag-n-drop simulated area */}
              <div className="space-y-1 bg-[#f0f9ff]/70 p-3.5 rounded-xl border border-sky-250">
                <span className="font-extrabold text-[9px] text-[#2c3e50] uppercase tracking-wider block mb-1">📁 Archivo Adjunto (Guarda en Google Drive de Secretaría)</span>
                <div className="border border-dashed border-sky-300 rounded-lg p-3 text-center bg-white hover:bg-sky-50/20 transition-colors relative cursor-pointer">
                  <input 
                    type="file" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const name = e.target.files[0].name;
                        const mockUrl = `https://drive.google.com/file/d/voto_adjunto_${Date.now()}/view`;
                        setNewVotoLinkDrive(mockUrl);
                        alert(`Se guardó el adjunto "${name}" de forma segura en la carpeta Google Drive de la Secretaría.\nAuto-completado enlace de Drive.`);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileUp className="w-5 h-5 mx-auto text-sky-500 mb-1" />
                  <p className="text-[9px] text-slate-600 font-medium font-sans">Arrastra documento de soporte (.pdf, .docx, o imagen) o haz clic</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Enlace de Documento de Drive</label>
                <input 
                  type="url" 
                  placeholder="https://drive.google.com/file/d/..."
                  value={newVotoLinkDrive}
                  onChange={(e) => setNewVotoLinkDrive(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 outline-none text-primary"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Descripción de la Propuesta</label>
                  <span className="text-[9px] text-[#2e86c1] font-black uppercase bg-sky-50 px-1 border border-sky-200 rounded">PROPONE</span>
                </div>
                
                <textarea 
                  placeholder="PROPONE la aprobación del financiamiento para la adquisición de..."
                  value={newVotoDesc}
                  onChange={(e) => setNewVotoDesc(e.target.value)}
                  className="w-full bg-surface border border-slate-200 rounded-lg p-2.5 outline-none min-h-[90px] resize-none leading-relaxed text-primary font-bold"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold rounded-lg transition-all shadow flex items-center justify-center gap-1.5 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" /> Enviar Solicitud a Secretaría
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2 select-none">
            <h3 className="font-sans text-xs font-black text-primary uppercase tracking-wider">Tus Propuestas Ingresadas</h3>
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filtrar propuestas..."
                value={searchVoto}
                onChange={(e) => setSearchVoto(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-[11px] rounded-full border border-slate-200 bg-transparent outline-none focus:border-secondary w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredVotos.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border p-5 shadow-sm space-y-3 relative overflow-hidden border-slate-200 text-left">
                <div className="absolute top-4 right-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    v.estado === "Aprobado" 
                      ? "bg-green-100 text-green-850 border border-green-200" 
                      : v.estado === "Observado"
                      ? "bg-amber-100 text-amber-850 border border-amber-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200/50"
                  }`}>
                    {v.estado}
                  </span>
                </div>

                <div className="flex gap-2 items-start text-xs pr-20 select-none">
                  <div className="p-1.5 rounded-xl bg-slate-50 text-blue-600">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[#112435] text-xs block">{v.departamento}</span>
                    <span className="text-[10px] text-gray-400 font-bold">Solicitado por: {v.solicitante} &bull; Enviado: {v.fechaEnvio}</span>
                  </div>
                </div>

                <div className="text-xs bg-[#f8fafc] p-3.5 rounded-xl border border-slate-150">
                  <p className="font-bold text-primary leading-relaxed whitespace-pre-wrap">{v.descripcion}</p>
                  {v.linkDriveDoc && (
                    <div className="mt-2 text-right">
                      <a href={v.linkDriveDoc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-primary font-bold">
                        <ExternalLink className="w-3 h-3 text-blue-600" /> Ver Archivo en Drive
                      </a>
                    </div>
                  )}
                </div>

                {v.estado === "Observado" && v.observaciones && (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-950 font-medium">
                    <span className="font-black uppercase tracking-wider text-[9px] text-amber-800 block mb-0.5">⚠️ Observación de Secretaría:</span>
                    "{v.observaciones}"
                  </div>
                )}
              </div>
            ))}
            {filteredVotos.length === 0 && (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-400">No tienes propuestas registradas en la búsqueda actual.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
