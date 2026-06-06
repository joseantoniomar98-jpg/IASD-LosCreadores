import React from "react";
import { User, BoardVoto } from "../types";
import { CheckCircle, ExternalLink, Download } from "lucide-react";

export interface VotosAprobadosViewProps {
  currentUser: User;
  boardVotos: BoardVoto[];
  votosPlazoLimite: string;
}

export const VotosAprobadosView: React.FC<VotosAprobadosViewProps> = ({
  currentUser,
  boardVotos,
  votosPlazoLimite
}) => {
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
                 "Firmas Oficiales Convalidadas Digitales:\n\n" +
                 "Pr. Nombre                      Nombre\n" +
                 "Pastor Distrital & Presidente            Secretaria de Iglesia\n\n" +
                 "========================================================\n";

    const textPayload = headerTitle + metaSection + propuestas + cierre;
    const blob = new Blob([textPayload], { type: "application/msword;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Agenda_Consolidada_Lideres_${votosPlazoLimite}.doc`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);
  };

  const approvedVotos = boardVotos.filter(v => v.estado === "Aprobado");

  return (
    <div className="space-y-6 text-left">
      {/* CTA Download Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">
        <div className="space-y-1.5 max-w-xl text-center md:text-left">
          <span className="px-2.5 py-0.5 bg-emerald-600/35 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full tracking-wider">CONSIGNA ADMINISTRATIVA</span>
          <h2 className="text-lg sm:text-xl font-black font-sans tracking-tight text-white">Canal Oficial de Consulta de Agenda de Junta</h2>
          <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
            Estimados Pastores y Coordinadores, como parte del comité eclesiástico consejero tienen acceso preventivo e inapelable para revisar y descargar las propuestas aprobadas y consolidadas por la secretaría en formato Microsoft Word.
          </p>
        </div>

        <button 
          onClick={handleExportAgendaDoc}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl hover:shadow-lg hover:scale-[1.02] flex items-center gap-2 transition-all shadow shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-950" /> DESCARGAR AGENDA COMPLETA (.doc)
        </button>
      </div>

      {/* List of Approved and Consolidated Votes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-205 shadow-sm flex justify-between items-center select-none">
            <h3 className="font-sans text-xs font-black text-emerald-700 uppercase tracking-wider">Resoluciones de Junta aprobadas y consolidadas</h3>
            <span className="text-[10px] text-gray-500 font-bold font-mono">Límite: {votosPlazoLimite}</span>
          </div>

          <div className="space-y-4 font-sans">
            {approvedVotos.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border p-5 shadow-sm space-y-3 relative overflow-hidden border-emerald-200">
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    CONSOLIDADO
                  </span>
                </div>

                <div className="flex gap-2 items-start text-xs pr-20 select-none">
                  <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[#112435] text-xs block">{v.departamento}</span>
                    <span className="text-[10px] text-gray-400 font-bold font-mono">Oficial: {v.solicitante} &bull; Validado por Secretaría de Actas</span>
                  </div>
                </div>

                <div className="text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <p className="font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{v.descripcion}</p>
                  {v.linkDriveDoc && (
                    <div className="mt-2 text-right">
                      <a href={v.linkDriveDoc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-primary font-bold">
                        <ExternalLink className="w-3 h-3 text-blue-600" /> Ver Archivo en Drive
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {approvedVotos.length === 0 && (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-400">No se encontraron solicitudes consolidadas en este momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
