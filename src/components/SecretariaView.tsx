/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Meeting, SpaceResource, User, BoardActa, TesoreriaBalance, BoardVoto } from "../types";
import { SPACES_SEED } from "../data";
import { 
  Calendar, FileCode, Search, Plus, MapPin, CheckCircle, Clock,
  Download, FileUp, Filter, AlertCircle, Ban, HelpCircle, HardDriveDownload, Lock, ChevronDown, ChevronRight,
  Sparkles, Tag, Hourglass, FileText, Check, X, ExternalLink, Edit2, Trash2, Printer, Loader2, FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDepartmentColorClasses } from "../utils";
import { VotosSolicitudView } from "./VotosSolicitudView";
import { VotosGestionView } from "./VotosGestionView";
import { VotosAprobadosView } from "./VotosAprobadosView";
import { sendGmailEmail, getAccessToken } from "../googleAuth";

// Helper resilient date split and translation
const getYearAndMonth = (dateStr: string) => {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const MONTHS_FULL = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return {
      year,
      month: MONTHS_FULL[monthIndex] || "General",
      monthNum: parts[1],
      day: parts[2]
    };
  }
  
  const yearMatch = dateStr.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : "Otros";
  
  const MONTHS_MAP: Record<string, string> = {
    "Jan": "Enero", "Feb": "Febrero", "Mar": "Marzo", "Apr": "Abril", "May": "Mayo", "Jun": "Junio",
    "Jul": "Julio", "Aug": "Agosto", "Sep": "Septiembre", "Oct": "Octubre", "Nov": "Noviembre", "Dec": "Diciembre",
    "Ene": "Enero", "Abr": "Abril", "Dic": "Diciembre"
  };
  
  let foundMonth = "General";
  for (const [key, val] of Object.entries(MONTHS_MAP)) {
    if (dateStr.toLowerCase().includes(key.toLowerCase())) {
      foundMonth = val;
      break;
    }
  }
  
  const dayMatch = dateStr.match(/^\d+/);
  const day = dayMatch ? dayMatch[0] : "01";

  return {
    year,
    month: foundMonth,
    monthNum: "00",
    day
  };
};

interface SecretariaProps {
  meetings: Meeting[];
  spaces: SpaceResource[];
  onAddMeeting: (evt: Meeting) => void;
  onUpdateSpaceStatus: (id: string, available: boolean) => void;
  currentUser: User;
  mode?: "calendario" | "actas" | "upload_acta" | "new_event" | "balances" | "votos" | "upload_balance";
  boardActas: BoardActa[];
  onAddBoardActa: (newAct: BoardActa) => void;
  tesoreriaBalances: TesoreriaBalance[];
  onAddTesoreriaBalance: (newBal: TesoreriaBalance) => void;
  boardVotos: BoardVoto[];
  onAddBoardVoto: (newVoto: BoardVoto) => void;
  onUpdateBoardVotoStatus: (id: string, estado: "Pendiente" | "Aprobado" | "Observado", observaciones?: string) => void;
  onEditBoardVoto: (updatedVoto: BoardVoto) => void;
  votosPlazoLimite: string;
  onUpdateVotosPlazoLimite: (newLimit: string) => void;
}

export const SecretariaView: React.FC<SecretariaProps> = ({
  meetings,
  spaces,
  onAddMeeting,
  onUpdateSpaceStatus,
  currentUser,
  mode = "calendario",
  boardActas = [],
  onAddBoardActa,
  tesoreriaBalances = [],
  onAddTesoreriaBalance,
  boardVotos = [],
  onAddBoardVoto,
  onUpdateBoardVotoStatus,
  onEditBoardVoto,
  votosPlazoLimite = "2026-06-03",
  onUpdateVotosPlazoLimite
}) => {
  // Navigation: "calendario", "actas", "balances" or "votos"
  const [subTab, setSubTab] = useState<"calendario" | "actas" | "balances" | "votos" | "votos_solicitud" | "votos_gestion" | "votos_aprobados">(() => {
    if (mode === "actas" || mode === "upload_acta") return "actas";
    if (mode === "balances" || mode === "upload_balance") return "balances";
    if (mode === "votos") return "votos";
    if (mode === "votos_solicitud") return "votos_solicitud";
    if (mode === "votos_gestion") return "votos_gestion";
    if (mode === "votos_aprobados") return "votos_aprobados";
    return "calendario";
  });

  React.useEffect(() => {
    if (mode === "actas" || mode === "upload_acta") setSubTab("actas");
    else if (mode === "balances" || mode === "upload_balance") setSubTab("balances");
    else if (mode === "votos") setSubTab("votos");
    else if (mode === "votos_solicitud") setSubTab("votos_solicitud");
    else if (mode === "votos_gestion") setSubTab("votos_gestion");
    else if (mode === "votos_aprobados") setSubTab("votos_aprobados");
    else setSubTab("calendario");
  }, [mode]);

  // Filter schedules
  const [searchSchedule, setSearchSchedule] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");
  
  // --- CALENDAR EVENT FORM ---
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDate, setEvtDate] = useState("");
  const [evtTime, setEvtTime] = useState("");
  const [evtLocation, setEvtLocation] = useState("Salón Social");
  
  // --- ACTS MANAGEMENT STATE ---
  const [searchAct, setSearchAct] = useState("");
  const [newActType, setNewActType] = useState<"Regular" | "Extraordinaria" | "Online">("Regular");
  const [newActDate, setNewActDate] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActVote, setNewActVote] = useState("");
  const [newActLinkDrive, setNewActLinkDrive] = useState("");
  const [actasViewMode, setActasViewMode] = useState<"tabla" | "libro" | "extractor">("libro");
  
  // --- ACTS EXTRACTOR STATE ---
  const [extractorInputText, setExtractorInputText] = useState("");
  const [extractorIsRunning, setExtractorIsRunning] = useState(false);
  const [extractorStep, setExtractorStep] = useState(0);
  const [extractedVotes, setExtractedVotes] = useState<any[]>([]);
  const [selectedSimulatedAct, setSelectedSimulatedAct] = useState("");
  const [extractorSuccessMsg, setExtractorSuccessMsg] = useState("");

  const [selectedSessionDate, setSelectedSessionDate] = useState<string>("2026-03-07");
  const [newActTitle, setNewActTitle] = useState("");
  const [newActLugar, setNewActLugar] = useState("");
  const [newActParticipantes, setNewActParticipantes] = useState("");
  const [newActOracionInicio, setNewActOracionInicio] = useState("");
  const [newActOracionFin, setNewActOracionFin] = useState("");

  // --- BALANCES MANAGEMENT STATE ---
  const [searchBalance, setSearchBalance] = useState("");
  const [newBalanceId, setNewBalanceId] = useState("");
  const [newBalancePeriod, setNewBalancePeriod] = useState("Mayo 2026");
  const [newBalanceDesc, setNewBalanceDesc] = useState("");
  const [newBalanceLinkDrive, setNewBalanceLinkDrive] = useState("");
  const [newBalanceYear, setNewBalanceYear] = useState<number>(2026);

  // --- VOTOS STATE ---
  const [searchVoto, setSearchVoto] = useState("");
  const [newVotoDept, setNewVotoDept] = useState("Ministerio Joven");
  const [newVotoDesc, setNewVotoDesc] = useState("PROPONE ");
  const [newVotoLinkDrive, setNewVotoLinkDrive] = useState("");
  const [votoObservingId, setVotoObservingId] = useState<string | null>(null);
  const [votoObservacionesInput, setVotoObservacionesInput] = useState("");
  const [votoEditingId, setVotoEditingId] = useState<string | null>(null);
  const [votoEditingDesc, setVotoEditingDesc] = useState("");
  const [votoEditingDept, setVotoEditingDept] = useState("");
  const [votoEditingLink, setVotoEditingLink] = useState("");
  const [newDeadLineInput, setNewDeadLineInput] = useState(votosPlazoLimite);

  // Simulation overlays
  const [emailLogs, setEmailLogs] = useState<string[]>([]);
  const [showEmailBanner, setShowEmailBanner] = useState(false);
  const [lastEmailDetails, setLastEmailDetails] = useState<{ to: string; subject: string; body: string } | null>(null);

  const triggerMockEmail = (to: string, subject: string, body: string) => {
    setLastEmailDetails({ to, subject, body });
    setShowEmailBanner(true);
    
    const hasGmail = !!getAccessToken();
    setEmailLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Para: ${to} | Asunto: ${subject}`,
      ...(hasGmail ? [`[${new Date().toLocaleTimeString()}] 🟢 [Sincronización Gmail Activa] Preparando envío real...`] : []),
      ...prev
    ]);

    if (hasGmail) {
      // Dispatch real email via connected Gmail API
      sendGmailEmail(to, subject, `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #1e3a8a; margin-top: 0;">Notificación IASD Los Creadores</h2>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-bottom: 20px;">
          <div style="font-size: 14px; color: #334155; line-height: 1.6;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-top: 20px; margin-bottom: 12px;">
          <p style="font-size: 11px; color: #64748b; text-align: center;">Este es un servicio automatizado real de Google Workspace integrado para el sistema de tesorería.</p>
        </div>
      `).then(success => {
        if (success) {
          setEmailLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ [Gmail API Sync] Correo enviado de forma real a ${to} con éxito!`, ...prev]);
        } else {
          setEmailLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ [Gmail API Sync] Error al despachar el correo electrónico por Gmail.`, ...prev]);
        }
      });
    }

    setTimeout(() => {
      setShowEmailBanner(false);
    }, 6000);
  };

  // Auth access checking for board acts
  // Authorized: Tesoreros, Pastores, Ancianos, Secretaría/Secretario o similar, or explicit Board Members (miembro de junta)
  const isBoardMember = currentUser.miembroDeJunta || currentUser.roles.some(role => 
    role.toLowerCase().includes("tesorero") || 
    role.toLowerCase().includes("pastor") || 
    role.toLowerCase().includes("anciano") || 
    role.toLowerCase().includes("secretar") || 
    role.toLowerCase().includes("líder")
  );

  const canAdministrateVotes = currentUser.roles.some(role => 
    role.toLowerCase().includes("secretar") || 
    role.toLowerCase().includes("pastor") || 
    role.toLowerCase().includes("anciano")
  ) || currentUser.miembroDeJunta;

  const isPastorOrElder = currentUser.roles.some(role => 
    role.toLowerCase().includes("pastor") || 
    role.toLowerCase().includes("anciano")
  );

  const newDateFormatted = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  };

  const handleExportAgendaDoc = () => {
    // Generate text document layout for Microsoft Word emulation
    const headerTitle = "========================================================\n" +
                        "          IGLESIA ADVENTISTA DEL SÉPTIMO DÍA\n" +
                        "     Distrito Los Creadores - Campo Sur de Chile\n" +
                        "========================================================\n\n" +
                        "    DOCUMENTO DE AGENDA OFICIAL PARA REUNIÓN DE JUNTA\n\n" +
                        "• CONFIDENCIAL - PARA USO EXCLUSIVO DE MIEMBROS DE JUNTA •\n\n";

    const metaSection = `FECHA LÍMITE DE SOLICITUDES: ${votosPlazoLimite}\n` +
                        `FECHA SUGERIDA JUNTA: Domingo subsiguiente\n` +
                        `CONVOCANTE PRESIDENCIAL: Pr. Pastor Demo\n` +
                        `RESPONSABLE REGISTRO: ${currentUser.name} (Secretaría de la Junta)\n\n` +
                        "--------------------------------------------------------\n\n";

    let devocional = "I. GESTIÓN DEVOCIONAL & APERTURA\n" +
                     "1. Declaración de inicio de quórum por Presidencia.\n" +
                     "2. Devocional, cántico y oración de consagración general.\n" +
                     "3. Lectura de recomendaciones preliminares.\n\n";

    let propuestas = "II. TABLA DE PROPUESTAS SOMETIDAS A VOTO\n";
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

    let cierre = "III. REVISIÓN DE ASUNTOS VARIOS Y ORACIÓN FINAL\n" +
                 "1. Ronda de avisos especiales de departamentos.\n" +
                 "2. Oración final e intercesión eclesiástica.\n\n" +
                 "--------------------------------------------------------\n" +
                 "Firmas Oficiales Convalidadas Digitales:\n\n" +
                 "Pr. Pastor Demo                        " + currentUser.name + "\n" +
                 "Pastor Distrital & Consejero            Secretario de Junta Directiva\n\n" +
                 "========================================================\n";

    const textPayload = headerTitle + metaSection + devocional + propuestas + cierre;
    const blob = new Blob([textPayload], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Agenda_Oficial_Junta_Limite_${votosPlazoLimite}.docx`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    alert(`¡Agenda exportada satisfactoriamente!\nSe ha generado y descargado el archivo oficial "Agenda_Oficial_Junta_Limite_${votosPlazoLimite}.docx" con la tabla de propuestas de voto vigentes.`);
  };

  const printAgendaToPDF = () => {
    const proposals = boardVotos.filter(v => v.estado === "Aprobado");
    let proposalsHtml = proposals.map(act => `
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; font-family: monospace;">
        <strong>[PROPUESTA DE VOTO DE JUNTA]</strong><br/>
        <strong>Depto:</strong> ${act.departamento}<br/>
        <strong>Solicitante:</strong> ${act.solicitante}<br/>
        <strong>Descripción:</strong> ${act.descripcion}<br/>
      </div>
    `).join("");

    const htmlContent = `
      <html>
        <head>
          <title>Agenda_Oficial_Junta_Limite_${votosPlazoLimite}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; }
            h1 { font-size: 20px; font-weight: 900; text-align: center; margin-bottom: 5px; text-transform: uppercase; }
            h2 { font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 25px; color: #475569; }
            .meta { font-size: 12px; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
          </style>
        </head>
        <body>
          <h1>IGLESIA LOS CREADORES</h1>
          <h2>AGENDA OFICIAL DE JUNTA DIRECTIVA</h2>
          <div class="meta">
            <p><strong>Fecha Límite:</strong> Miércoles, ${votosPlazoLimite}</p>
            <p><strong>Generado por:</strong> ${currentUser?.name || "Secretaría"}</p>
          </div>
          <h3>PROPUESTAS INDEXADAS (${proposals.length})</h3>
          ${proposalsHtml}
        </body>
      </html>
    `;

    let printFrame = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 250);
    }
  };

  const handleExportActaDoc = (sessionDate: string) => {
    const sessionActas = boardActas.filter(a => a.dateVal === sessionDate);
    if (sessionActas.length === 0) return;
    
    const representative = sessionActas[0];
    const headerTitle = "========================================================\n" +
                        "                IGLESIA LOS CREADORES\n" +
                        "                         ACTA\n" +
                        "                   JUNTA DIRECTIVA\n" +
                        "========================================================\n\n";

    const typeStr = representative.tipo === "Online" ? "Celebrada vía on line" : "Celebrada en " + (representative.lugar || "Los Creadores N° 0280 - Temuco");
    const metaSection = `Celebrada el ${representative.fecha},\n` +
                        `${typeStr}\n\n` +
                        `MIEMBROS PARTICIPANTES: ${representative.participantes || "Marta S., Juan P., Teresa C., Andrea C., Darlin C., Carlos M., Alicia R."}\n\n` +
                        (representative.oracionInicio ? `ORACION: ${representative.oracionInicio}\n\n` : "") +
                        "--------------------------------------------------------\n\n";

    let resolucionesText = "";
    sessionActas.map((act) => {
      resolucionesText += `${act.voto}     ${(act.titulo || "ACUERDO").toUpperCase()}\n\n` +
                           `VOTADO ${act.descripcion}\n\n\n`;
    });

    if (representative.oracionFin) {
      resolucionesText += `ORACION: ${representative.oracionFin}\n\n`;
    }

    const signatures = "--------------------------------------------------------\n" +
                       "FIRMADO DIGITALMENTE Y ASENTADO EN LIBRO DE ACTAS:\n\n" +
                       "Pr. CARLOS B.                          ALICIA R.\n" +
                       "          Pastor                        Secretaria de Iglesia\n\n" +
                       "========================================================\n";

    const textPayload = headerTitle + metaSection + resolucionesText + signatures;
    const blob = new Blob([textPayload], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = `Acta_Junta_Directiva_${sessionDate.replace(/-/g, "_")}.docx`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(blobUrl);

    alert(`¡Acta de Junta Directiva exportada satisfactoriamente!\nSe ha generado y descargado el archivo oficial "Acta_Junta_Directiva_${sessionDate.replace(/-/g, "_")}.docx" en el formato oficial.`);
  };

  const handlePrintActa = (sessionDate: string) => {
    const sessionActas = boardActas.filter(a => a.dateVal === sessionDate);
    if (sessionActas.length === 0) return;
    const representative = sessionActas[0];

    const htmlContent = `
      <html>
        <head>
          <title>Acta_LosCreadores_Junta_${sessionDate}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
            .header { text-align: center; margin-bottom: 30px; text-transform: uppercase; }
            .header h1 { font-size: 18px; font-weight: bold; margin: 0; letter-spacing: 1px; }
            .header h2 { font-size: 14px; font-weight: bold; margin: 4px 0 0 0; }
            .header h3 { font-size: 14px; font-weight: bold; margin: 4px 0 0 0; }
            .meta { margin-bottom: 25px; text-align: left; font-family: Arial, sans-serif; font-size: 12px; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .meta p { margin: 4px 0; }
            .voto-block { margin-top: 30px; margin-bottom: 30px; page-break-inside: avoid; }
            .voto-num { font-weight: bold; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; word-spacing: 3px; }
            .voto-text { text-indent: 35px; text-align: justify; font-size: 13px; margin: 0; white-space: pre-wrap; }
            .signatures { margin-top: 60px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 11px; }
            .sig-col { text-align: center; width: 45%; }
            .sig-line { font-weight: bold; border-top: 1px solid #000; padding-top: 8px; margin-top: 50px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>IGLESIA LOS CREADORES</h1>
            <h2>ACTA</h2>
            <h3>JUNTA DIRECTIVA</h3>
          </div>
          <div class="meta">
            <p>Celebrada el <strong>${representative.fecha}</strong>${representative.tipo !== "Online" ? `, a las 15.30 Hrs.` : ""}</p>
            <p>Celebrada <strong>${representative.tipo === "Online" ? "vía on line" : `en ${representative.lugar || "Los Creadores N° 0280 - Temuco"}`}</strong></p>
            <p style="margin-top: 8px;"><strong>MIEMBROS PARTICIPANTES:</strong> ${representative.participantes || "Marta S., Juan P., Teresa C., Andrea C., Darlin C., Carlos M., Alicia R."}</p>
            ${representative.oracionInicio ? `<p><strong>ORACION:</strong> ${representative.oracionInicio}</p>` : ""}
          </div>
          ${sessionActas.map(act => `
            <div class="voto-block">
              <div class="voto-num">${act.voto} &nbsp;&nbsp;&nbsp;&nbsp; ${(act.titulo || "ACUERDO").toUpperCase()}</div>
              <p class="voto-text">${act.descripcion.trim()}</p>
            </div>
          `).join("")}
          ${representative.oracionFin ? `<p style="font-family: Arial; font-size: 11px; margin-top: 30px;"><strong>ORACION:</strong> ${representative.oracionFin}</p>` : ""}
          <div class="signatures">
            <div class="sig-col">
              <div class="sig-line">Pr. CARLOS B.</div>
              <div>Pastor</div>
            </div>
            <div class="sig-col">
              <div class="sig-line">ALICIA R.</div>
              <div>Secretaria de Iglesia</div>
            </div>
          </div>
        </body>
      </html>
    `;

    let printFrame = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 250);
    }
  };

  // Expanded year and month collapsible view states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "2026-Mayo": true,
    "2026-Abril": true,
    "2024-Diciembre": true,
    "2024-Agosto": true,
    "2024-Julio": true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle meeting scheduling submit
  const handleScheduleEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle || !evtDate || !evtTime) {
      alert("Por favor rellene la fecha, el título y la hora del encuentro.");
      return;
    }

    const newMeeting: Meeting = {
      id: "meet-" + (meetings.length + 1),
      date: evtDate, 
      title: evtTitle,
      time: evtTime,
      duration: "1 hora",
      location: evtLocation,
      department: "Todos",
      status: "Aprobado"
    };

    onAddMeeting(newMeeting);
    alert(`Evento "${evtTitle}" agendado con éxito para el día ${newMeeting.date}!`);
    setEvtTitle("");
    setEvtDate("");
    setEvtTime("");
  };

  // Helper dictionary of months
  const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // Register Actas Handler (Elevated to App.tsx)
  const handleRegisterAct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newActVote || !newActDesc || !newActDate) {
      alert("Por favor ingresa un número de Voto, Descripción y Fecha para el acta.");
      return;
    }

    const dateObj = new Date(newActDate);
    const actYear = dateObj.getFullYear();
    const actMonth = MONTHS_ES[dateObj.getMonth()];

    const newActItem = {
      voto: newActVote,
      fecha: dateObj.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      tipo: newActType,
      descripcion: newActDesc,
      firmadoPor: `${currentUser.name} (${currentUser.roles[0]})`,
      peso: "1.5 MB",
      year: actYear,
      month: actMonth,
      dateVal: newActDate,
      linkDrive: newActLinkDrive || "https://drive.google.com/file/d/1u-Acta-demo/view",
      titulo: newActTitle || "Acuerdo Votado",
      lugar: newActLugar || "Los Creadores N° 0280 - Temuco",
      participantes: newActParticipantes || "Marta S., Juan P., Teresa C., Andrea C., Darlin C., Carlos M., Alicia R.",
      oracionInicio: newActOracionInicio || undefined,
      oracionFin: newActOracionFin || undefined
    };

    onAddBoardActa(newActItem);
    
    // Automatically select the newly created session date in our Libro view
    setSelectedSessionDate(newActDate);
    
    setExpandedGroups(prev => ({
      ...prev,
      [`${actYear}-${actMonth}`]: true
    }));

    alert(`¡Acta con Voto "${newActVote}" registrada con éxito!\nSe ha enlazado con el documento de Google Drive.`);
    
    // Clear
    setNewActVote("");
    setNewActDesc("");
    setNewActDate("");
    setNewActLinkDrive("");
    setNewActTitle("");
    setNewActLugar("");
    setNewActParticipantes("");
    setNewActOracionInicio("");
    setNewActOracionFin("");
  };

  // Register Balances Handler
  const handleRegisterBalance = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBalanceId || !newBalancePeriod || !newBalanceLinkDrive) {
      alert("Por favor ingresa el Código de Balance, el Periodo y el Enlace de Google Drive.");
      return;
    }

    const newBalItem = {
      id: newBalanceId,
      fecha: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      periodo: newBalancePeriod,
      linkDrive: newBalanceLinkDrive,
      creadoPor: `${currentUser.name} (${currentUser.roles[0]})`,
      peso: "1.2 MB",
      descripcion: newBalanceDesc || `Balance integral consolidado mensual correspondiente a ${newBalancePeriod}.`,
      year: newBalanceYear
    };

    onAddTesoreriaBalance(newBalItem);
    alert(`¡Balance de Tesorería del período "${newBalancePeriod}" registrado con éxito!`);

    // Reset Form
    setNewBalanceId("");
    setNewBalancePeriod("Mayo 2026");
    setNewBalanceDesc("");
    setNewBalanceLinkDrive("");
    setNewBalanceYear(2026);
  };

  // Register Vote Handler
  const handleRegisterVoteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newVotoDesc.trim()) {
      alert("Por favor ingresa una descripción para la propuesta.");
      return;
    }

    let parsedDesc = newVotoDesc.trim();
    // Enforce beginning with PROPONE
    if (!parsedDesc.toUpperCase().startsWith("PROPONE")) {
      parsedDesc = "PROPONE " + parsedDesc;
    }

    const newVotoItem = {
      id: "voto-" + (boardVotos.length + 1) + "-" + Date.now(),
      departamento: newVotoDept,
      solicitante: currentUser.name,
      solicitanteEmail: currentUser.email,
      descripcion: parsedDesc,
      linkDriveDoc: newVotoLinkDrive || undefined,
      fechaEnvio: new Date().toISOString().split("T")[0],
      estado: "Pendiente" as const
    };

    onAddBoardVoto(newVotoItem);
    
    // Notify Secretary
    triggerMockEmail(
      "secretaria@ejemplo.com",
      `Nueva Solicitud de Voto - ${newVotoDept}`,
      `Estimada Secretaria, el director ${currentUser.name} ha ingresado una nueva propuesta: "${parsedDesc}". Por favor ingrese al portal de secretaría para gestionarla.`
    );

    alert(`¡Solicitud de Voto registrada con éxito en el sistema!\nSe ha notificado vía correo a la secretaría de la junta.`);

    // Clear
    setNewVotoDesc("PROPONE ");
    setNewVotoLinkDrive("");
  };

  // Drag and drop uploader simulation file
  const [dragging, setDragging] = useState(false);

  const handleFileUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileName = files[0].name;
      const voteNum = prompt("Ingresa el número de Voto de la Junta para este archivo:", `V-${new Date().getFullYear()}-0${boardActas.length + 12}`);
      if (!voteNum) return;
      
      const newAct = {
        voto: voteNum,
        fecha: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
        tipo: "Regular" as const,
        descripcion: `Acta cargada desde archivo local: ${fileName.replace(/\.[^/.]+$/, "")}`,
        firmadoPor: `${currentUser.name} (Secretaría Digital)`,
        peso: "1.8 MB",
        year: new Date().getFullYear(),
        month: MONTHS_ES[new Date().getMonth()],
        dateVal: new Date().toISOString().split("T")[0],
        linkDrive: "https://drive.google.com/file/d/UploadedFromLocalSim/view"
      };
      onAddBoardActa(newAct);
      alert(`Archivo "${fileName}" enlazado con éxito como acta virtual bajo el voto ${voteNum}.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const newAct = {
      voto: `V-2026-0${boardActas.length + 15}`,
      fecha: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      tipo: "Online" as const,
      descripcion: "Acta cargada vía arrastrar y soltar",
      firmadoPor: `${currentUser.name} (Arrastre de archivos)`,
      peso: "980 KB",
      year: new Date().getFullYear(),
      month: MONTHS_ES[new Date().getMonth()],
      dateVal: new Date().toISOString().split("T")[0],
      linkDrive: "https://drive.google.com/file/d/UploadedFromDropSim/view"
    };
    onAddBoardActa(newAct);
    alert("Acta cargada exitosamente mediante Arrastrar y Soltar!");
  };

  // Filter operations: Only Approved events
  const filteredMeetings = meetings.filter(m => 
    m.status === "Aprobado" && (
      m.title.toLowerCase().includes(searchSchedule.toLowerCase()) ||
      m.location.toLowerCase().includes(searchSchedule.toLowerCase())
    )
  );

  const filteredActs = boardActas.filter(a => 
    a.voto.toLowerCase().includes(searchAct.toLowerCase()) ||
    a.descripcion.toLowerCase().includes(searchAct.toLowerCase()) ||
    a.tipo.toLowerCase().includes(searchAct.toLowerCase())
  );

  // Separating acts by Month & Year!
  const groupedActs: Record<number, Record<string, typeof boardActas>> = {};
  
  filteredActs.forEach(act => {
    if (!groupedActs[act.year]) {
      groupedActs[act.year] = {};
    }
    if (!groupedActs[act.year][act.month]) {
      groupedActs[act.year][act.month] = [];
    }
    groupedActs[act.year][act.month].push(act);
  });

  // Sort years descending
  const sortedYears = Object.keys(groupedActs)
    .map(Number)
    .sort((a, b) => b - a);

  // Balances filter & grouping by Year & Month (Identical layout)
  const filteredBalances = tesoreriaBalances.filter(b =>
    b.periodo.toLowerCase().includes(searchBalance.toLowerCase()) ||
    b.descripcion.toLowerCase().includes(searchBalance.toLowerCase()) ||
    b.creadoPor.toLowerCase().includes(searchBalance.toLowerCase())
  );

  const groupedBalances: Record<number, Record<string, typeof tesoreriaBalances>> = {};
  filteredBalances.forEach(bal => {
    if (!groupedBalances[bal.year]) {
      groupedBalances[bal.year] = {};
    }
    const month = bal.periodo.split(" ")[0] || "General";
    if (!groupedBalances[bal.year][month]) {
      groupedBalances[bal.year][month] = [];
    }
    groupedBalances[bal.year][month].push(bal);
  });

  const sortedBalanceYears = Object.keys(groupedBalances)
    .map(Number)
    .sort((a, b) => b - a);

  // Votos filters
  const filteredVotos = boardVotos.filter(v =>
    v.departamento.toLowerCase().includes(searchVoto.toLowerCase()) ||
    v.descripcion.toLowerCase().includes(searchVoto.toLowerCase()) ||
    v.solicitante.toLowerCase().includes(searchVoto.toLowerCase()) ||
    v.estado.toLowerCase().includes(searchVoto.toLowerCase())
  );


  return (
    <div className="space-y-6">

      {/* Mock Mail Notification Alert banner */}
      <AnimatePresence>
        {showEmailBanner && lastEmailDetails && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 max-w-sm bg-slate-900 border border-slate-700 text-white rounded-xl shadow-xl p-4 overflow-hidden"
          >
            <div className="flex gap-2.5 items-start">
              <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="text-left text-xs space-y-1">
                <span className="font-extrabold text-[10px] text-blue-400 block uppercase tracking-wider">Simulación de Correo Integrado</span>
                <p className="font-bold">Para: <span className="font-medium text-slate-300">{lastEmailDetails.to}</span></p>
                <p className="font-bold">Asunto: <span className="font-medium text-slate-300">{lastEmailDetails.subject}</span></p>
                <p className="text-[11px] text-slate-400 mt-1 italic leading-relaxed">
                  "{lastEmailDetails.body}"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar and switcher buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>PORTAL DE SECRETARÍA</span>
            <span>/</span>
            <span className="text-secondary font-bold">
              {subTab === "calendario" && "CALENDARIO Y AGENDA"}
              {subTab === "actas" && "CONSULTA DE ACTAS"}
              {subTab === "balances" && "BALANCES DE TESORERÍA"}
              {subTab === "votos" && "GESTIÓN DE VOTOS"}
              {subTab === "votos_solicitud" && "SOLICITAR VOTO JUNTA"}
              {subTab === "votos_gestion" && "GERENCIA Y GESTIÓN DE VOTOS"}
              {subTab === "votos_aprobados" && "VOTOS DE JUNTA APROBADOS"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            {subTab === "calendario" && "Calendario de Actividades de la Iglesia"}
            {subTab === "actas" && "Actas Oficiales de Junta Directiva"}
            {subTab === "balances" && "Balances de Tesorería Históricos"}
            {subTab === "votos" && "Gestión de Votos y Propuestas de Agenda"}
            {subTab === "votos_solicitud" && "Solicitar Propuestas de Voto para la Junta"}
            {subTab === "votos_gestion" && "Consolidación y Gestión de Votos de Junta"}
            {subTab === "votos_aprobados" && "Agenda Oficial de Votos Aprobados por Secretaría"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {subTab === "calendario" && "Planificación general, hitos y actividades oficiales del cuerpo y ministerios de la iglesia."}
            {subTab === "actas" && "Historial confidencial de resoluciones y acuerdos del cuerpo oficial de junta."}
            {subTab === "balances" && "Auditoría de balances mensuales subidos por Tesorería y enlazados directamente en Google Drive."}
            {subTab === "votos" && "Recepción de propuestas, establecimiento de agendas oficializadas, plazos de entrega y aprobación de votos."}
            {subTab === "votos_solicitud" && "Portal de presentación de propuestas para la agenda oficial de la Junta Directiva distrital."}
            {subTab === "votos_gestion" && "Módulo administrativo de secretaría para revisar, aprobar u observar solicitudes, definir plazos y exportar actas."}
            {subTab === "votos_aprobados" && "Visualizador oficial de la agenda de junta directa y descargador del documento consolidado formal."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: AGENDA & SPACES (Mockups 4 & 5) */}
        {subTab === "calendario" && (
          <motion.div 
            key="calendar-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Hand: Grouped Church Activities Calendar List (Hidden in new_event mode) */}
            {mode !== "new_event" && (
              <div className={`${mode === "calendario" ? "lg:col-span-12" : "lg:col-span-12"} space-y-6`}>
              
              <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 sm:p-8 space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 select-none pb-4 border-b border-outline-variant/20">
                  <div>
                    <h3 className="font-sans text-base font-black text-primary">Calendario de Actividades de la Iglesia</h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">Calendario general cronológico de acontecimientos aprobados y vigentes</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Year Selector Dropdown */}
                    <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm gap-2">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 select-none">Año:</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent text-xs font-black text-[#1552a6] outline-none cursor-pointer"
                      >
                        {["2024", "2025", "2026", "2027", "2028"].map((yr) => (
                          <option key={yr} value={yr} className="text-slate-900 bg-white">
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Local meeting search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Filtrar por actividad o lugar..."
                        value={searchSchedule}
                        onChange={(e) => setSearchSchedule(e.target.value)}
                        className="pl-9 pr-4 py-2 text-xs rounded-lg border border-outline bg-transparent select-all outline-none focus:border-secondary w-full sm:w-56 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Grouped Calendar content by Selected Year -> Month List */}
                <div className="space-y-8">
                  {(() => {
                    const grouped: Record<string, Record<string, Meeting[]>> = {};
                    
                    filteredMeetings.forEach(mt => {
                      const { year, month } = getYearAndMonth(mt.date);
                      if (!grouped[year]) {
                        grouped[year] = {};
                      }
                      if (!grouped[year][month]) {
                        grouped[year][month] = [];
                      }
                      grouped[year][month].push(mt);
                    });

                    const MONTHS_ORDER = [
                      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                    ];

                    const yr = selectedYear;
                    if (!grouped[yr]) {
                      return (
                        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <p className="text-sm font-bold text-slate-500">
                            No se registran actividades aprobadas para el año {yr}.
                          </p>
                          <p className="text-xs text-slate-400 mt-1">Usa los botones superiores para cambiar de año.</p>
                        </div>
                      );
                    }

                    const monthsOfThisYear = Object.keys(grouped[yr]).sort((a, b) => {
                      const idxA = MONTHS_ORDER.indexOf(a);
                      const idxB = MONTHS_ORDER.indexOf(b);
                      return idxA - idxB;
                    });

                    return (
                      <div className="space-y-8 pl-1">
                        {monthsOfThisYear.map(mth => {
                          const mtList = grouped[yr][mth];
                          return (
                            <div key={mth} className="space-y-4">
                              <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded inline-block shadow-sm">
                                📅 {mth} ({yr})
                              </h5>

                              <div className="flex flex-col gap-3">
                                {mtList.map(mt => {
                                  const { day } = getYearAndMonth(mt.date);
                                  const colorCls = getDepartmentColorClasses(mt.organizer || mt.department);
                                  return (
                                    <div 
                                      key={mt.id}
                                      className={`p-4 ${colorCls.bg} rounded-xl border ${colorCls.border} ${colorCls.borderLeft} flex items-start sm:items-center gap-4 transition-all hover:translate-x-0.5 shadow-sm select-none`}
                                    >
                                      {/* Day Circle/Badge */}
                                      <div className={`${colorCls.dot} hover:scale-105 transition-all text-white px-3 py-2.5 rounded-2xl text-center w-14 shrink-0 shadow font-mono`}>
                                        <span className="text-lg font-black block leading-none">{day}</span>
                                        <span className="text-[7px] font-black block uppercase tracking-wider mt-1 opacity-90 text-white/90">DÍA</span>
                                      </div>

                                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4 items-center">
                                        
                                        {/* Activity Name & Description */}
                                        <div className="md:col-span-6 space-y-1">
                                          <h6 className="text-sm font-black text-slate-900 leading-snug select-text">{mt.title}</h6>
                                          {mt.description && (
                                            <p className="text-[11px] text-slate-600 font-normal leading-relaxed italic line-clamp-2">
                                              "{mt.description}"
                                            </p>
                                          )}
                                        </div>

                                        {/* Event Metadata */}
                                        <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 font-medium">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span>{mt.time} ({mt.duration})</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="font-bold text-slate-800">{mt.location}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 pt-1 truncate">
                                            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span>Organiza: <strong className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${colorCls.badge}`}>{mt.organizer || mt.department}</strong></span>
                                          </div>
                                          <div className="flex items-center gap-1.5 pt-1 truncate">
                                            <span className="text-sm shrink-0">👥</span>
                                            <span className="truncate">Participan: <strong className="text-slate-800">{mt.participants && mt.participants.length > 0 ? mt.participants.join(", ") : "Todos"}</strong></span>
                                          </div>
                                        </div>

                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>

              </div>
            )}

            {/* Right Hand: Quick scheduler Carga form (Hidden in calendario mode) */}
            {mode !== "calendario" && (
              <div className={`${mode === "new_event" ? "lg:col-span-12 max-w-2xl mx-auto" : "lg:col-span-5"} space-y-6 select-none`}>
              
              <section className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-secondary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-black text-primary leading-tight">Agendar Sesión de Junta</h3>
                    <p className="text-xs text-on-surface-variant font-medium">Registrar un nuevo encuentro en el calendario</p>
                  </div>
                </div>

                <form onSubmit={handleScheduleEvent} className="space-y-4">
                  
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Título de Reunión o Evento</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Junta Directiva Ordinaria Junio"
                      value={evtTitle}
                      onChange={(e) => setEvtTitle(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 outline-none focus:ring-1 focus:ring-secondary text-primary font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date" 
                        value={evtDate}
                        onChange={(e) => setEvtDate(e.target.value)}
                        className="w-full bg-white border border-outline-variant p-2.5 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Hora</label>
                      <input 
                        type="time" 
                        value={evtTime}
                        onChange={(e) => setEvtTime(e.target.value)}
                        className="w-full bg-white border border-outline-variant p-2.5 rounded-lg outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-left">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Recinto / Espacio Reservado</label>
                    <select 
                      value={evtLocation}
                      onChange={(e) => setEvtLocation(e.target.value)}
                      className="w-full bg-white border border-outline-variant rounded-lg p-3 cursor-pointer outline-none font-semibold text-primary"
                    >
                      <option>Sala de Juntas Principal</option>
                      <option>Salón Multiusos</option>
                      <option>Oficina Secretaría</option>
                      <option>Nave Central del Templo</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-primary-container text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow select-none"
                  >
                    <Plus className="w-4 h-4" /> Ejecutar Registro Especial
                  </button>

                </form>
              </section>

              {/* Bar Metric widget representing calendar occupancy health */}
              <div className="bg-white rounded-2xl border border-outline-variant/60 p-5 shadow-sm text-xs text-left">
                <h4 className="font-extrabold text-[#112435] uppercase mb-2.5 tracking-wider">Salud y Ocupación Mensual</h4>
                <div className="space-y-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-on-surface-variant">Fines de Semana reservados:</span>
                    <span className="text-primary font-mono">80% ocupado</span>
                  </div>
                  <div className="w-full bg-[#f1f4f7] h-2 rounded-full overflow-hidden">
                    <div className="bg-error h-full rounded-full" style={{ width: "80%" }}></div>
                  </div>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    * Quedan pocos cupos de horarios para coordinaciones del departamento de Conquistadores los sábados en la tarde.
                  </p>
                </div>
              </div>

              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: ACTS DOWNLOAD ARCHIVE (Mockup 6) */}
        {subTab === "actas" && (
          <motion.div 
            key="acts-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-left"
          >
            {!isBoardMember ? (
              /* RESTRICTED LOCK VIEW */
              <div className="bg-white rounded-2xl border border-error/20 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-md">
                <div className="w-16 h-16 bg-error-container/25 text-error rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8 font-black" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-primary">Acceso Denegado: Contenido Restringido</h3>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-extrabold text-error">Art. 12 - Archivo de Actas de la Junta Directiva</p>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed max-w-md mx-auto">
                  Las actas oficiales de juntas regulares, extraordinarias y online corresponden a información de carácter estrictamente confidencial. Solo tienen autorización de lectura los oficiales activos de la Junta Directiva.
                </p>
                
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-xs text-left space-y-2">
                  <p className="font-bold text-primary flex items-center gap-1.5">
                     <span className="inline-block w-2.5 h-2.5 bg-error rounded-full"></span>
                    Tu Perfil Actual: <span className="text-[#102435] font-black">{currentUser.name}</span>
                  </p>
                  <p className="text-on-surface-variant">
                    Roles asignados: <span className="font-bold">{currentUser.roles.join(", ")}</span>
                  </p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-150 rounded-xl text-xs text-amber-950 leading-relaxed">
                  <span className="font-bold text-amber-950 block mb-1 font-sans">🔒 Control de Acceso Estricto:</span>
                  Para consultar el archivo de actas históricas, debe contar con privilegios asignados o autenticarse mediante un oficial habilitado (ej. Pastor, Anciano, Secretaria o Tesorero Central) desde el inicio de sesión.
                </div>
              </div>
            ) : (
              /* LOGGED BOARD MEMBER WORKSPACE */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Register New Board Minute Resolution (Hidden in actas mode) */}
                {mode !== "actas" && (
                  <div className={`${mode === "upload_acta" ? "lg:col-span-12 max-w-2xl mx-auto" : "lg:col-span-4"} space-y-6`}>
                  <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-5 sm:p-6 space-y-4">
                    <div className="select-none">
                      <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider">Registrar nueva acta</h3>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Ingresar resoluciones aprobadas por acta oficial</p>
                    </div>

                    <form onSubmit={handleRegisterAct} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Número de Voto / Código Acta</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 2026 – 057"
                            value={newActVote}
                            onChange={(e) => setNewActVote(e.target.value)}
                            className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none font-bold text-primary"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Título del Acuerdo</label>
                          <input 
                            type="text" 
                            placeholder="e.g. COMPRA DE IMPRESORA"
                            value={newActTitle}
                            onChange={(e) => setNewActTitle(e.target.value)}
                            className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none font-bold text-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Fecha Sesión</label>
                          <input 
                            type="date"
                            value={newActDate}
                            onChange={(e) => setNewActDate(e.target.value)}
                            className="w-full bg-white border border-outline-variant p-2 rounded-lg outline-none"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Junta</label>
                          <select 
                            value={newActType}
                            onChange={(e) => setNewActType(e.target.value as any)}
                            className="w-full bg-white border border-outline-variant p-2 rounded-lg outline-none font-semibold text-primary cursor-pointer"
                          >
                            <option value="Regular">Regular</option>
                            <option value="Extraordinaria">Extraordinaria</option>
                            <option value="Online">Online</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Lugar de Reunión</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Los Creadores N° 0280 - Temuco"
                          value={newActLugar}
                          onChange={(e) => setNewActLugar(e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg p-2 outline-none text-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Miembros Participantes</label>
                        <input 
                          type="text" 
                          placeholder="Nombres separados por comas..."
                          value={newActParticipantes}
                          onChange={(e) => setNewActParticipantes(e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg p-2 outline-none text-primary text-[11px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Oración Apertura</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del hermano..."
                            value={newActOracionInicio}
                            onChange={(e) => setNewActOracionInicio(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 outline-none text-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Oración Cierre</label>
                          <input 
                            type="text" 
                            placeholder="Nombre del hermano..."
                            value={newActOracionFin}
                            onChange={(e) => setNewActOracionFin(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2 outline-none text-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Enlace del Acta Compartido en Google Drive</label>
                        <input 
                          type="url" 
                          placeholder="https://drive.google.com/file/d/... o link compartido"
                          value={newActLinkDrive}
                          onChange={(e) => setNewActLinkDrive(e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg p-2.5 outline-none text-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Descripción / Acuerdo Votado</label>
                        <textarea 
                          placeholder="Detalles sobre el acuerdo, quorum, aprobación de presupuestos o nombramientos oficiales..."
                          value={newActDesc}
                          onChange={(e) => setNewActDesc(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none min-h-[80px] resize-none leading-relaxed text-primary"
                          required
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-[#112435] text-white font-extrabold rounded-lg hover:bg-secondary/90 transition-all shadow flex items-center justify-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar en Libro de Actas
                      </button>
                    </form>
                  </div>

                  {/* Drag & Drop uploader linking */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                      dragging 
                        ? "border-secondary bg-secondary-fixed-dim/20" 
                        : "border-outline-variant bg-white"
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="w-10 h-10 bg-secondary-fixed/60 text-secondary rounded-full flex items-center justify-center mx-auto text-center shadow-inner select-none pointer-events-none">
                        <FileUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-primary">Cargador Directo de PDF certificado</h4>
                        <p className="text-[10px] text-on-surface-variant mt-1 leading-snug">
                          Arrastra y suelta actas en PDF o haz clic abajo para vincularlas simbólicamente.
                        </p>
                      </div>
                      
                      <div className="select-none">
                        <label className="inline-block px-4 py-1.5 bg-primary hover:bg-primary-container text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow">
                          Vincular Archivo de Drive
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx" 
                            className="hidden" 
                            onChange={handleFileUploadSimulated} 
                            ref={null} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {/* Right Column: Dynamic sorted and separated chronological view */}
                {mode !== "upload_acta" && (
                  <div className={`${mode === "actas" ? "lg:col-span-12" : "lg:col-span-8"} space-y-6`}>
                  
                  {/* Search and control filter head */}
                  <div className="bg-white p-5 rounded-2xl border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-left select-none">
                      <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider">Archivo Histórico de Actas</h3>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Organizado por sesiones plenarias y libros foliados de actas oficiales directivas</p>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Filtrar por palabra clave o voto..."
                        value={searchAct}
                        onChange={(e) => setSearchAct(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-xs rounded-full border border-outline bg-transparent select-all outline-none focus:border-secondary w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between flex-wrap">
                    {/* Navigation Switch between Paper Book, Resolutions list and Extractor */}
                    <div className="flex flex-wrap gap-1 border-b border-outline-variant/30 select-none bg-slate-50 p-1 rounded-xl">
                      <button
                        onClick={() => setActasViewMode("libro")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          actasViewMode === "libro"
                            ? "bg-white text-primary shadow-sm font-extrabold border border-outline-variant/20"
                            : "text-gray-500 hover:text-primary"
                        }`}
                      >
                        📖 Libro de Actas (Formato Oficial)
                      </button>
                      <button
                        onClick={() => setActasViewMode("tabla")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          actasViewMode === "tabla"
                            ? "bg-white text-primary shadow-sm font-extrabold border border-outline-variant/20"
                            : "text-gray-500 hover:text-primary"
                        }`}
                      >
                        📋 Lista de Acuerdos e Indexación
                      </button>
                      <button
                        onClick={() => setActasViewMode("extractor")}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          actasViewMode === "extractor"
                            ? "bg-amber-600 text-white shadow-sm font-black border border-amber-700"
                            : "text-amber-800 hover:text-amber-950 bg-amber-50 border border-amber-200/50"
                        }`}
                      >
                        ✨ Extractor Digital de Acuerdos Drive
                      </button>
                    </div>

                    <a 
                      href="https://drive.google.com/drive/folders/placeholder-drive-folder-id?usp=drive_link" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-3 py-1.5 bg-[#f1f4f9] hover:bg-slate-200 text-primary text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-outline-variant/20 shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-600" /> Carpeta Drive Actas
                    </a>
                  </div>

                  {/* 1. OFFICIAL BOOK MODE: Sessional Sheet mimicking PDF exactly */}
                  {actasViewMode === "libro" && (() => {
                    // Dynamically group actas by dateVal to represent sessions
                    const sessionsMap: Record<string, BoardActa[]> = {};
                    boardActas.forEach(act => {
                      const matchesSearch = !searchAct || 
                        act.voto.toLowerCase().includes(searchAct.toLowerCase()) ||
                        act.descripcion.toLowerCase().includes(searchAct.toLowerCase()) ||
                        (act.titulo && act.titulo.toLowerCase().includes(searchAct.toLowerCase()));
                        
                      if (matchesSearch) {
                        if (!sessionsMap[act.dateVal]) {
                          sessionsMap[act.dateVal] = [];
                        }
                        sessionsMap[act.dateVal].push(act);
                      }
                    });
                    
                    const sortedSessionDates = Object.keys(sessionsMap).sort((a, b) => b.localeCompare(a));
                    const activeSessionDate = sortedSessionDates.includes(selectedSessionDate) 
                      ? selectedSessionDate 
                      : (sortedSessionDates[0] || "");

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Interactive Session Index Column */}
                        <div className="lg:col-span-4 space-y-3">
                          <div className="bg-white p-4 rounded-xl border border-outline-variant/60 shadow-sm">
                            <h4 className="font-extrabold text-[#112435] text-[10px] uppercase tracking-wider mb-2.5">Sesiones de Junta</h4>
                            <div className="space-y-1.5">
                              {sortedSessionDates.map((dateStr) => {
                                const acts = sessionsMap[dateStr];
                                const representative = acts[0];
                                const isSelected = activeSessionDate === dateStr;
                                
                                return (
                                  <button
                                    key={dateStr}
                                    onClick={() => setSelectedSessionDate(dateStr)}
                                    className={`w-full text-left p-2.5 rounded-lg border text-xs gap-1 flex flex-col transition-all cursor-pointer ${
                                      isSelected 
                                        ? "bg-slate-900 border-slate-900 text-white shadow-md font-bold" 
                                        : "bg-white border-outline-variant/60 hover:bg-slate-50 text-slate-800"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center w-full">
                                      <span className="font-black font-sans">{representative.fecha}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                        isSelected ? "bg-white/15 text-white border border-white/10" : "bg-slate-100 text-stone-600 border border-slate-200"
                                      }`}>
                                        {representative.tipo}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] ${isSelected ? "text-slate-300" : "text-stone-500 font-medium"}`}>
                                      {acts.length} {acts.length === 1 ? "voto aprobado" : "votos aprobados"}
                                    </span>
                                  </button>
                                );
                              })}
                              {sortedSessionDates.length === 0 && (
                                <p className="text-gray-400 text-center text-[11px] py-4 italic">No hay sesiones de junta encontradas en esta búsqueda.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Paper Document Preview Column */}
                        <div className="lg:col-span-8 space-y-4">
                          {(() => {
                            const acts = sessionsMap[activeSessionDate];
                            if (!acts || acts.length === 0) {
                              return (
                                <div className="bg-white p-12 rounded-xl text-center text-xs text-gray-500 border border-outline-variant/60">
                                  Por favor selecciona o registra una sesión de junta del panel izquierdo.
                                </div>
                              );
                            }
                            const rep = acts[0];
                            return (
                              <div className="space-y-4 font-serif">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <span className="text-[10px] font-mono text-gray-400 font-extrabold tracking-wider uppercase bg-slate-100 px-2 py-1 rounded">VISTA MINUTA OFICIAL INTEGRADA</span>
                                  <div className="flex gap-1.5 w-full sm:w-auto">
                                    <button
                                      onClick={() => handleExportActaDoc(activeSessionDate)}
                                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-[#112435] text-white hover:bg-[#1c374f] transition-all font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" /> Descargar (.docx)
                                    </button>
                                    <button
                                      onClick={() => handlePrintActa(activeSessionDate)}
                                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-650 text-white hover:bg-red-700 transition-all font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Printer className="w-3 h-3" /> Imprimir Acta
                                    </button>
                                  </div>
                                </div>

                                {/* Paper Styled Container */}
                                <div 
                                  id="printable-act-sheet"
                                  className="bg-[#fdfdfc] border border-stone-300 shadow-md p-8 sm:p-12 text-[#1c1d1f] text-left relative select-text rounded-2xl border-t-8 border-t-[#80705a] max-w-xl mx-auto"
                                >
                                  {/* Sheet Title */}
                                  <div className="text-center space-y-1 mb-6 uppercase font-sans border-b-2 border-stone-100 pb-5">
                                    <h2 className="text-lg font-black tracking-wider text-stone-900 leading-tight">IGLESIA LOS CREADORES</h2>
                                    <h3 className="text-xs font-black tracking-widest text-stone-600 leading-tight">ACTA DE ACUERDOS</h3>
                                    <h4 className="text-xs font-extrabold tracking-wider text-stone-700 leading-tight">JUNTA DIRECTIVA</h4>
                                  </div>

                                  {/* Sessions Meta Details */}
                                  <div className="text-[11px] font-sans space-y-2 text-stone-600 pb-5 border-b border-stone-200">
                                    <p className="leading-relaxed">
                                      Celebrada el <span className="font-extrabold text-stone-900">{rep.fecha}</span>{rep.tipo !== "Online" && " a las 15.30 Hrs."}
                                    </p>
                                    <p className="leading-relaxed">
                                      Celebrada <span className="font-extrabold text-stone-900">{rep.tipo === "Online" ? "vía on line" : `en ${rep.lugar || "Los Creadores N° 0280 - Temuco"}`}</span>
                                    </p>
                                    <p className="leading-relaxed pt-1.5">
                                      <span className="font-extrabold text-stone-900 block mb-0.5">MIEMBROS PARTICIPANTES:</span> 
                                      <span className="bg-stone-50 p-2 rounded-lg border border-stone-100 block text-stone-700 mt-1 leading-normal font-sans text-[10px] font-medium scale-[0.99] origin-left">
                                        {rep.participantes || "Marta S., Juan P., Teresa C., Andrea C., Darlin C., Carlos M., Alicia R., Pr. Carlos B."}
                                      </span>
                                    </p>
                                    {rep.oracionInicio && (
                                      <p className="leading-relaxed">
                                        <span className="font-extrabold text-stone-900">ORACION DE ENTREGÁ:</span> {rep.oracionInicio}
                                      </p>
                                    )}
                                  </div>

                                  {/* Resolutions listed */}
                                  <div className="space-y-8 pt-6">
                                    {acts.map((act) => (
                                      <div key={act.voto} className="space-y-2.5">
                                        {/* Code Header */}
                                        <div className="font-sans font-black text-xs text-stone-950 tracking-wide uppercase border-b border-dashed border-stone-150 pb-1">
                                          {act.voto} &nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp; {act.titulo || "ACUERDO GENERAL"}
                                        </div>
                                        
                                        {/* Vote Content starting with VOTADO */}
                                        <p className="text-xs sm:text-sm text-stone-850 leading-relaxed text-justify pl-3 text-stone-800 whitespace-pre-wrap font-serif">
                                          {act.descripcion}
                                        </p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Closing Prayer */}
                                  {rep.oracionFin && (
                                    <div className="mt-8 border-t border-stone-200 pt-4 font-sans text-[11px] text-stone-600">
                                      <p><span className="font-extrabold text-stone-900">ORACION DE CLAUSURA:</span> {rep.oracionFin}</p>
                                    </div>
                                  )}

                                  {/* Signature block */}
                                  <div className="mt-12 pt-8 grid grid-cols-2 gap-8 text-center font-sans border-t border-stone-100/30">
                                    <div className="space-y-1">
                                      <div className="border-t border-stone-300 pt-1.5 text-stone-850 font-black text-[10px]">
                                        CARLOS BRIGNETTI CARVAJAL
                                      </div>
                                      <div className="text-stone-400 text-[8px] uppercase font-black tracking-widest">
                                        Pastor
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="border-t border-stone-300 pt-1.5 text-stone-850 font-black text-[10px]">
                                        ALICIA ROJO BISHOP
                                      </div>
                                      <div className="text-stone-400 text-[8px] uppercase font-black tracking-widest">
                                        Secretaria de Iglesia
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. CHRONOLOGICAL LIST OF RESOLUTIONS (Original tables) */}
                  {actasViewMode === "tabla" && (
                    <div className="space-y-6">
                      {sortedYears.map(year => (
                        <div key={year} className="space-y-4 text-left">
                          <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-1 mt-4">
                            <span className="text-lg font-black text-primary font-mono">{year}</span>
                            <span className="text-[10px] text-outline font-bold tracking-wider">RESOLUCIONES REGISTRADAS</span>
                          </div>

                          {Object.keys(groupedActs[year]).map(month => {
                            const key = `${year}-${month}`;
                            const isExpanded = expandedGroups[key];
                            const actsInGroup = groupedActs[year][month];

                            return (
                              <div key={month} className="bg-white rounded-xl border border-outline-variant/50 overflow-hidden shadow-sm transition-all hover:bg-surface-container-low/10">
                                
                                {/* Accordion Trigger Head */}
                                <button 
                                  onClick={() => toggleGroup(key)}
                                  className="w-full p-4 flex items-center justify-between text-left focus:outline-none select-none bg-surface-container-low/15 border-b border-outline-variant/20 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-primary" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-primary" />
                                    )}
                                    <span className="font-bold text-primary text-sm">{month} de {year}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-secondary-fixed text-primary">
                                    {actsInGroup.length} resoluciones
                                  </span>
                                </button>

                                {/* Accordion Content Table */}
                                {isExpanded && (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left font-sans text-xs">
                                      <thead className="bg-[#f8fafc] text-[9px] text-on-surface-variant font-extrabold uppercase border-b border-outline-variant/20">
                                        <tr>
                                          <th className="px-5 py-2.5">Voto</th>
                                          <th className="px-5 py-2.5">Tipo Junta</th>
                                          <th className="px-5 py-2.5">Acuerdo Oficial / Extracto</th>
                                          <th className="px-5 py-2.5 text-center">Acceso Google Drive</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-outline-variant/15">
                                        {actsInGroup.map((act) => (
                                          <tr key={act.voto} className="hover:bg-primary-container/[0.01]">
                                            <td className="px-5 py-3 font-semibold text-secondary whitespace-nowrap">{act.voto}</td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                act.tipo === "Regular" 
                                                  ? "bg-tertiary-fixed text-on-tertiary-fixed font-black border border-outline-variant/10"
                                                  : act.tipo === "Extraordinaria" 
                                                  ? "bg-secondary-fixed text-primary font-black"
                                                  : "bg-[#ffe2c4] text-[#a45300] font-black"
                                              }`}>
                                                {act.tipo === "Regular" ? "Regular (Ord.)" : act.tipo}
                                              </span>
                                            </td>
                                            <td className="px-5 py-3">
                                              <p className="font-extrabold text-primary leading-snug">{act.titulo || "Acuerdo Votado"}</p>
                                              <p className="text-[11px] text-stone-600 leading-normal mt-1 italic whitespace-pre-wrap">{act.descripcion}</p>
                                              <p className="text-[10px] text-outline mt-1 font-semibold">Fecha sesión: {act.fecha}</p>
                                            </td>
                                            <td className="px-5 py-3 text-center whitespace-nowrap">
                                              <a 
                                                href={act.linkDrive || "https://drive.google.com"}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100/70 border border-green-200/50 rounded transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
                                                title="Abrir acta oficial original guardada en Google Drive"
                                              >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-mono">Ver en Google Drive</span>
                                              </a>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {sortedYears.length === 0 && (
                        <div className="bg-white p-12 text-center rounded-2xl border border-outline-variant/60">
                          <p className="text-sm font-bold text-on-surface-variant">No se encontraron actas de junta coincidentes en esta categoría.</p>
                          <button 
                            onClick={() => setSearchAct("")}
                            className="text-xs text-secondary underline font-bold mt-2 cursor-pointer"
                          >
                            Limpiar filtros de búsqueda
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {actasViewMode === "extractor" && (
                    <div className="space-y-6 text-left">
                      {/* Short Links by Year Folder */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 p-4 border border-amber-200/60 rounded-xl animate-fade-in">
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FolderOpen className="w-4 h-4 text-amber-700" />
                          Accesos Directos a Carpetas Compartidas de Google Drive por Año
                        </h4>
                        <p className="text-[11px] text-amber-800/80 mb-3 leading-relaxed">
                          Haga clic en cualquiera de los enlaces para acceder a los archivos originales, actas firmadas de junta de la Iglesia guardadas de forma segura en Google Drive para cada año fiscal:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <a 
                            href="https://drive.google.com/drive/folders/placeholder-drive-folder-id-2024?usp=drive_link" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-amber-200/70 text-xs flex items-center justify-between font-bold group shadow-sm transition-colors cursor-pointer"
                          >
                            <span className="text-slate-800">📂 Archivo Histórico 2024</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-700 transition-colors" />
                          </a>
                          <a 
                            href="https://drive.google.com/drive/folders/placeholder-drive-folder-id-2025?usp=drive_link" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-white hover:bg-slate-50 p-2.5 rounded-lg border border-amber-200/70 text-xs flex items-center justify-between font-bold group shadow-sm transition-colors cursor-pointer"
                          >
                            <span className="text-slate-800">📂 Archivo Histórico 2025</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-700 transition-colors" />
                          </a>
                          <a 
                            href="https://drive.google.com/drive/folders/placeholder-drive-folder-id-2026?usp=drive_link" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="bg-amber-55 hover:bg-amber-100/30 p-2.5 rounded-lg border border-amber-400/80 text-xs flex items-center justify-between font-bold group shadow-sm transition-colors cursor-pointer"
                          >
                            <span className="text-slate-800">📂 Gestión Activa 2026</span>
                            <ExternalLink className="w-3 h-3 text-amber-600 transition-colors" />
                          </a>
                        </div>
                      </div>

                      {/* Main extractor workspace */}
                      <div className="bg-white p-5 rounded-xl border border-outline-variant/60 shadow-sm space-y-4">
                        <div>
                          <h3 className="font-extrabold text-[#112435] text-sm">Extractor Digital de Votos e Indexación de Acuerdos</h3>
                          <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                            Esta herramienta procesa los borradores o actas cargadas en Drive, detectando de forma automatizada las resoluciones (votos) y permitiendo vincularlas directamente con las propuestas de voto activas del sistema para su actualización de estado instantánea en la base de datos de la iglesia.
                          </p>
                        </div>

                        {/* Top: simulate from folder choice */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-5 space-y-1.5 text-left font-sans">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[#112435] block">
                              Cargar Archivo desde Carpeta Google Drive
                            </label>
                            <select
                              value={selectedSimulatedAct}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedSimulatedAct(val);
                                if (val === "2024") {
                                  setExtractorInputText(`IGLESIA ADVENTISTA LOS CREADORES - JUNTA DIRECTIVA ORDINARIA N° 11-2024\nFecha: 15 de noviembre de 2024\nLugar: Templo Los Creadores N° 0280, Temuco.\nApertura: Pr. Alberto R. con oracion.\n\nVOTO 2024 – 089: ADQUISICIÓN DE PROYECTOR MULTIMEDIA DE ALTA LUMINOSIDAD\nVOTADO aprobar la compra de un proyector multimedia Epson PowerLite de 4000 lúmenes para el salón principal del templo, con el fin de optimizar las presentaciones y sermones de Escuela Sabática y Cultos Divinos. Costo total estimado: $385.000. Financiamiento: Fondo de Comunicaciones.\n\nVOTO 2024 – 090: SISTEMA DE CALEFACCIÓN SALA DE CONQUISTADORES\nVOTADO instalar un calefactor infrarrojo de bajo consumo en el salón posterior de reuniones del Club de Conquistadores Los Creadores. Presupuesto total de instalación: $120.000 con cargo al fondo de mejoras edilicias eclesiásticas.`);
                                } else if (val === "2025") {
                                  setExtractorInputText(`IGLESIA ADVENTISTA LOS CREADORES - SESIÓN EXTRAORDINARIA DE JUNTA DIRECTIVA\nFecha: 14 de junio de 2025\nLugar: Salón de Eventos y vía Zoom.\nPreside: Pr. Carlos B. Oración inicial: Hna. Teresa C.\n\nVOTO 2025 – 052: ADQUISICIÓN DE INSTRUMENTOS MUSICALES - MINISTERIO DE ALABANZA\nVOTADO adquirir un juego de micrófonos inalámbricos Shure (4 unidades) y una caja de inyección directa activa Whirlwind para el coro y ministerio de música de la iglesia. Valor de compra: $290.000 con cargo a fondos extraordinarios del departamento de música.\n\nVOTO 2025 – 053: MEJORAMIENTO DEL ACCESO PEATONAL AL TEMPLO DE LA JUNTA\nVOTADO realizar reparaciones estructurales en la rampa exterior de acceso y colocación de cinta antideslizante con acabado de alta visibilidad para mayor seguridad de adultos mayores. Costo de materiales: $95.000.`);
                                } else if (val === "2026") {
                                  setExtractorInputText(`IGLESIA ADVENTISTA LOS CREADORES - JUNTA DIRECTIVA ORDINARIA N° 03-2026\nFecha: 22 de marzo de 2026\nLugar: Sala de Juntas y vía Teams.\nPreside: Pr. Carlos B. Oración inicial por José M.\n\nVOTO 2026 – 057: REPOSICIÓN DE LUMINARIAS CON TECNOLOGÍA LED EN PARQUEO\nVOTADO autorizar la modernización del sistema de iluminación del estacionamiento de la iglesia, instalando 6 focos leds solares de 100W con sensor de movimiento, para garantizar la seguridad de jóvenes y conquistadores. Valor de insumos: $180.000 - Financiamiento: Tesorería general fondo preventivo.`);
                                } else {
                                  setExtractorInputText("");
                                }
                              }}
                              className="w-full text-xs p-2 rounded-lg border border-outline bg-white outline-none cursor-pointer font-semibold text-slate-800"
                            >
                              <option value="">-- Seleccionar Acta Compartida de Drive --</option>
                              <option value="2024">📂 Acta 15-Nov-2024 (2 acuerdos redactados) - Folder 2024</option>
                              <option value="2025">📂 Acta 14-Jun-2025 (2 acuerdos redactados) - Folder 2025</option>
                              <option value="2026">📂 Acta 22-Mar-2026 (1 acuerdo redactado) - Folder 2026</option>
                            </select>
                          </div>
                          <div className="md:col-span-7 space-y-1.5 font-sans text-[11px] text-[#112435] leading-normal flex flex-col justify-end text-left">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-stone-500 font-medium font-sans">
                              <span className="font-extrabold text-slate-800">💡 Instrucción de Sintaxis:</span> El analizador digital asocia párrafos que utilicen la fórmula <strong className="text-amber-800">"VOTO AÑO – NÚMERO: TÍTULO"</strong> seguido del texto explícito de la resolución que comience con <strong className="text-amber-800">"VOTADO..."</strong>.
                            </div>
                          </div>
                        </div>

                        {/* Raw textarea */}
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-black uppercase tracking-wider text-[#112435] block font-sans">
                            Borrador del Texto del Acta
                          </label>
                          <textarea
                            value={extractorInputText}
                            onChange={(e) => setExtractorInputText(e.target.value)}
                            placeholder="Copie y pegue aquí el borrador o texto del acta de junta, o elija un documento pre-cargado de arriba..."
                            className="w-full h-40 text-xs p-3 rounded-lg border border-outline font-mono leading-relaxed bg-slate-50 focus:bg-white outline-none focus:border-[#112435] transition-all"
                          />
                        </div>

                        {/* Action buttons list */}
                        <div className="flex gap-2.5 items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setExtractorInputText("");
                              setExtractedVotes([]);
                              setSelectedSimulatedAct("");
                              setExtractorSuccessMsg("");
                            }}
                            className="px-4 py-2 text-xs border border-outline rounded-lg text-slate-600 hover:bg-slate-100 transition-colors uppercase font-bold text-[10px] cursor-pointer"
                          >
                            Limpiar Espacio
                          </button>
                          
                          <button
                            type="button"
                            disabled={!extractorInputText.trim() || extractorIsRunning}
                            onClick={() => {
                              if (!extractorInputText.trim()) return;
                              setExtractorIsRunning(true);
                              setExtractorStep(1);
                              setExtractedVotes([]);
                              setExtractorSuccessMsg("");

                              // Animation loop simulation
                              setTimeout(() => {
                                setExtractorStep(2);
                                setTimeout(() => {
                                  setExtractorStep(3);
                                  setTimeout(() => {
                                    const votesList: any[] = [];
                                    const text = extractorInputText;
                                    
                                    // Parse routine
                                    const matches = [...text.matchAll(/VOTO\s+(\d{4}\s*[–-]\s*\d+):\s*([^\n]+)/gi)];
                                    const parts = text.split(/VOTO\s+\d{4}\s*[–-]\s*\d+:/gi);
                                    
                                    matches.forEach((m, idx) => {
                                      const votoCode = m[1].trim();
                                      const tituloVal = m[2].trim().replace(/^-+/, "").trim();
                                      let rawDesc = parts[idx + 1] || "";
                                      let descriptionVal = rawDesc.split(/VOTO/gi)[0].trim();
                                      
                                      let actYear = 2026;
                                      const yearMatch = votoCode.match(/^(\d{4})/);
                                      if (yearMatch) actYear = parseInt(yearMatch[1], 10);
                                      
                                      let actMonth = "Mayo";
                                      if (text.toLowerCase().includes("noviembre")) actMonth = "Noviembre";
                                      else if (text.toLowerCase().includes("junio")) actMonth = "Junio";
                                      else if (text.toLowerCase().includes("marzo")) actMonth = "Marzo";
                                      else if (text.toLowerCase().includes("diciembre")) actMonth = "Diciembre";

                                      let actDateVal = `${actYear}-05-15`;
                                      if (actMonth === "Noviembre") actDateVal = `${actYear}-11-15`;
                                      else if (actMonth === "Junio") actDateVal = `${actYear}-06-14`;
                                      else if (actMonth === "Marzo") actDateVal = `${actYear}-03-22`;
                                      else if (actMonth === "Diciembre") actDateVal = `${actYear}-12-10`;

                                      votesList.push({
                                        voto: votoCode,
                                        titulo: tituloVal,
                                        descripcion: descriptionVal,
                                        fecha: actMonth === "Noviembre" ? "15 de noviembre de " + actYear : actMonth === "Junio" ? "14 de junio de " + actYear : actMonth === "Marzo" ? "22 de marzo de " + actYear : "24 de mayo de " + actYear,
                                        tipo: text.toLowerCase().includes("extraordinaria") ? "Extraordinaria" : "Regular",
                                        firmadoPor: "Pr. Carlos B.",
                                        peso: `${(Math.random() * 1.5 + 1.0).toFixed(1)} MB`,
                                        year: actYear,
                                        month: actMonth,
                                        dateVal: actDateVal,
                                        linkDrive: "https://drive.google.com/drive/folders/placeholder-drive-folder-id?usp=drive_link",
                                        lugar: "Los Creadores N° 0280 - Temuco",
                                        participantes: "Carlos B., Alicia R., José M., Roberto M., Teresa C.",
                                        oracionInicio: "Pr. Carlos B.",
                                        linkedProposalId: ""
                                      });
                                    });

                                    // Fallback if no matching standard headings
                                    if (votesList.length === 0) {
                                      votesList.push({
                                        voto: "2026 – EXT01",
                                        titulo: "ACUERDO DIGITAL AD-HOC EXTRAÍDO",
                                        descripcion: text.length > 250 ? text.substring(0, 250) + "..." : text,
                                        fecha: "24 de mayo de 2026",
                                        tipo: "Regular",
                                        firmadoPor: "Pr. Carlos B.",
                                        peso: "1.1 MB",
                                        year: 2026,
                                        month: "Mayo",
                                        dateVal: "2026-05-24",
                                        linkDrive: "https://drive.google.com/drive/folders/placeholder-drive-folder-id?usp=drive_link",
                                        lugar: "Los Creadores N° 0280 - Temuco",
                                        participantes: "Carlos B., Alicia R., José M.",
                                        oracionInicio: "Pr. Carlos B.",
                                        linkedProposalId: ""
                                      });
                                    }

                                    setExtractedVotes(votesList);
                                    setExtractorIsRunning(false);
                                    setExtractorStep(0);
                                  }, 800);
                                }, 700);
                              }, 600);
                            }}
                            className={`px-5 py-2 text-xs rounded-lg uppercase tracking-wider font-extrabold flex items-center gap-1.5 cursor-pointer shadow transition-all ${
                              !extractorInputText.trim()
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                : extractorIsRunning
                                ? "bg-amber-500 text-white cursor-wait animate-pulse"
                                : "bg-amber-600 hover:bg-amber-505 text-white"
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                            {extractorIsRunning ? "Analizando Acta..." : "Extraer Acuerdos Registrados"}
                          </button>
                        </div>
                      </div>

                      {/* Extractor Loader Animation */}
                      {extractorIsRunning && (
                        <div className="bg-[#112435] border border-[#112435] text-white p-6 rounded-xl flex flex-col items-center justify-center space-y-3.5 shadow-xl animate-fade-in font-sans">
                          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                          <div className="space-y-1 text-center">
                            <p className="font-extrabold text-xs text-white uppercase tracking-wider">Lectura de Borrador e Indexador de Junta</p>
                            <p className="text-[10px] text-slate-300 font-mono tracking-widest animate-pulse">
                              {extractorStep === 1 && "⏳ CONFIGURANDO CANAL DRIVE API SECURE..."}
                              {extractorStep === 2 && "⏳ DESCOMPRIMIENDO CONTENIDOS COMPARTIDOS DE GOOGLE DRIVE..."}
                              {extractorStep === 3 && "⏳ SEGMENTANDO PATRONES 'VOTO O VOLUNTADES' Y COMPILANDO..."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Extracted Results list */}
                      {extractedVotes.length > 0 && !extractorIsRunning && (
                        <div className="space-y-4 animate-fade-in text-left font-sans">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {extractedVotes.length} {extractedVotes.length === 1 ? "Acuerdo Identificado" : "Acuerdos Identificados"} en el Acta
                            </span>
                            <span className="text-[10px] text-green-700 font-extrabold bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                              ✓ Indexación Previa Lista
                            </span>
                          </div>

                          <div className="space-y-4 font-sans">
                            {extractedVotes.map((item, idx) => {
                              // Filter pending proposals that could be linked with this vote
                              const pendingProposals = boardVotos.filter(
                                v => v.estado === "Pendiente" || v.estado === "Observado"
                              );

                              return (
                                <div key={idx} className="bg-white rounded-xl border-l-4 border-l-amber-500 border border-outline-variant/60 shadow-sm p-4 text-left space-y-3 hover:shadow transition-shadow">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-amber-700 font-extrabold font-mono bg-amber-50 px-2 py-0.5 rounded">
                                        VOTO {item.voto}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-semibold">
                                        {item.fecha} ({item.tipo})
                                      </span>
                                    </div>
                                    <div className="text-right text-[10px] text-stone-500 font-medium">
                                      Secretaría: <span className="text-slate-800 font-bold">{item.firmadoPor}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                      <div className="sm:col-span-4 text-[10px] font-black uppercase text-[#112435] flex items-center">
                                        Título del Acuerdo
                                      </div>
                                      <input 
                                        type="text"
                                        value={item.titulo}
                                        onChange={(e) => {
                                          const copy = [...extractedVotes];
                                          copy[idx].titulo = e.target.value;
                                          setExtractedVotes(copy);
                                        }}
                                        className="sm:col-span-8 text-xs p-1.5 rounded border border-outline bg-transparent w-full font-bold text-primary select-all"
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                      <div className="sm:col-span-4 text-[10px] font-black uppercase text-[#112435] flex items-center">
                                        Texto Oficial Resolutivo
                                      </div>
                                      <textarea 
                                        value={item.descripcion}
                                        onChange={(e) => {
                                          const copy = [...extractedVotes];
                                          copy[idx].descripcion = e.target.value;
                                          setExtractedVotes(copy);
                                        }}
                                        className="sm:col-span-8 text-xs p-1.5 rounded border border-outline bg-transparent w-full h-16 leading-relaxed italic text-stone-600 select-all font-sans"
                                      />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 font-sans">
                                      <div className="sm:col-span-4 text-[10px] font-black uppercase text-[#112435] flex items-center bg-slate-50 px-1.5 py-1 rounded">
                                        🔗 Vincular con Propuesta Activa
                                      </div>
                                      <div className="sm:col-span-8 space-y-1 font-sans">
                                        <select
                                          value={item.linkedProposalId || ""}
                                          onChange={(e) => {
                                            const copy = [...extractedVotes];
                                            copy[idx].linkedProposalId = e.target.value;
                                            setExtractedVotes(copy);
                                          }}
                                          className="text-xs p-1.5 rounded border border-slate-300 w-full bg-slate-50 font-semibold text-slate-800 outline-none cursor-pointer"
                                        >
                                          <option value="">-- No vincular a ninguna propuesta (Guardar solo como acuerdo histórico) --</option>
                                          {pendingProposals.map(prop => (
                                            <option key={prop.id} value={prop.id}>
                                              📌 [{prop.departamento}] - Por {prop.solicitante}: "{prop.descripcion.substring(0, 50)}..."
                                            </option>
                                          ))}
                                        </select>
                                        <p className="text-[9px] text-gray-500 leading-snug">
                                          Al realizar el enlace, la propuesta de voto se marcará automáticamente como <strong className="text-emerald-700">Aprobado</strong>, registrando el código reglamentario del acuerdo.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Save & write action */}
                          <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
                            <div className="text-left space-y-0.5 font-sans">
                              <h4 className="font-extrabold text-[#112435] text-xs uppercase tracking-wider">¿Confirmar inscripción en la Base de Datos?</h4>
                              <p className="text-[10px] text-sky-700 font-medium leading-relaxed">Las resoluciones se insertarán directamente en el Libro de Actas (Firestore) y las mociones enlazadas se actualizarán sincrónicamente.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                extractedVotes.forEach(item => {
                                  const { linkedProposalId, ...actaData } = item;
                                  
                                  // Call callback to add BoardActa
                                  onAddBoardActa({
                                    voto: actaData.voto,
                                    fecha: actaData.fecha,
                                    tipo: actaData.tipo,
                                    titulo: actaData.titulo,
                                    descripcion: actaData.descripcion,
                                    firmadoPor: actaData.firmadoPor,
                                    peso: actaData.peso,
                                    year: actaData.year,
                                    month: actaData.month,
                                    dateVal: actaData.dateVal,
                                    linkDrive: actaData.linkDrive,
                                    lugar: actaData.lugar,
                                    participantes: actaData.participantes,
                                    oracionInicio: actaData.oracionInicio
                                  });

                                  // Update proposal
                                  if (linkedProposalId) {
                                    const propToUpdate = boardVotos.find(p => p.id === linkedProposalId);
                                    if (propToUpdate) {
                                      onEditBoardVoto({
                                        ...propToUpdate,
                                        estado: "Aprobado",
                                        observaciones: `Aprobado por resolución unánime en Junta Directiva, formalizado en Voto de Acta Nº ${actaData.voto} (${actaData.fecha}).`
                                      });
                                    }
                                  }
                                });

                                setExtractorSuccessMsg(`¡Operación completada con éxito! Se han registrado ${extractedVotes.length} nuevas resoluciones en el Libro Oficial de Actas y se han actualizado e indexado los votos/mociones vinculados.`);
                                setExtractedVotes([]);
                                setExtractorInputText("");
                                setSelectedSimulatedAct("");
                              }}
                              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold uppercase rounded-lg text-[10px] tracking-widest cursor-pointer shadow transition-colors whitespace-nowrap"
                            >
                              Indexar y Registrar Resoluciones
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Success message banner */}
                      {extractorSuccessMsg && (
                        <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-left flex items-start gap-3 shadow-md animate-fade-in font-sans">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-[#112435] text-xs uppercase tracking-wider">Indexación de Acuerdos Finalizada</p>
                            <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">{extractorSuccessMsg}</p>
                            <button
                              onClick={() => {
                                setExtractorSuccessMsg("");
                                setActasViewMode("tabla");
                              }}
                              className="text-[10px] text-[#112435] font-black underline hover:text-stone-900 uppercase tracking-widest block pt-2.5 cursor-pointer"
                            >
                              Ir a la Lista de Acuerdos a Verificarlos →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-[#ebeef1]/45 p-4 rounded-xl border border-outline-variant/30 text-xs text-left text-on-surface-variant leading-relaxed select-none font-medium">
                    <p className="font-bold text-primary flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-secondary shrink-0" />
                      Auditoría e Integridad de Junta (Art 12.3)
                    </p>
                    <p className="text-[11px]">
                      Las actas guardadas aquí están enlazadas a carpetas de almacenamiento compartido en la nube de Google Drive. La secretaria de junta sube las actas certificadas directamente a estas carpetas vinculando el enlace provisto para mantener la transparencia e integridad documental de la Iglesia.
                    </p>
                  </div>

                  </div>
                )}

              </div>
            )}

          </motion.div>
        )}

        {/* VIEW 3: TREASURY BALANCES (Same structure as Actas) */}
        {subTab === "balances" && (
          <motion.div 
            key="balances-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-left"
          >
            {!isBoardMember ? (
              <div className="bg-white rounded-2xl border border-error/20 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-md">
                <div className="w-16 h-16 bg-error-container/25 text-error rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8 font-black" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-primary">Acceso Denegado: Contenido Restringido</h3>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-extrabold text-error">Art. 13 - Balances y Finanzas Confidenciales</p>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed max-w-md mx-auto">
                  La revisión de los balances de tesorería mensuales y anuales corresponde a información financiera de carácter sensible. Solo los oficiales autorizados de Junta Directiva o del equipo de Auditoria tienen acceso reglamentario.
                </p>
                <div className="bg-[#ffe8e8] text-[#c0392b] p-3 rounded-lg text-xs font-bold">
                  Sometido a normativas de Auditoría Financiera de la Asociación Adventista de Iglesia.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Form: upload and link balances */}
                {mode === "upload_balance" && (
                  <div className="col-span-12 lg:col-span-12 max-w-xl mx-auto w-full space-y-6">
                    <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-5 sm:p-6 space-y-4">
                    <div className="select-none">
                      <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider text-green-700">Registrar Balance de Tesorería</h3>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Enlazar balance mensual o anual guardado en carpetas compartidas de Google Drive</p>
                    </div>

                    <form onSubmit={handleRegisterBalance} className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Código de Balance / Folio</label>
                        <input 
                          type="text" 
                          placeholder="e.g. BAL-2026-MAYO"
                          value={newBalanceId}
                          onChange={(e) => setNewBalanceId(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none font-bold text-primary"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Periodo Mensual</label>
                          <select 
                            value={newBalancePeriod}
                            onChange={(e) => setNewBalancePeriod(e.target.value)}
                            className="w-full bg-white border border-outline-variant p-2 rounded-lg outline-none font-semibold text-primary cursor-pointer"
                          >
                            <option value="Enero">Enero</option>
                            <option value="Febrero">Febrero</option>
                            <option value="Marzo">Marzo</option>
                            <option value="Abril">Abril</option>
                            <option value="Mayo 2026">Mayo</option>
                            <option value="Junio">Junio</option>
                            <option value="Julio">Julio</option>
                            <option value="Agosto">Agosto</option>
                            <option value="Septiembre">Septiembre</option>
                            <option value="Octubre">Octubre</option>
                            <option value="Noviembre">Noviembre</option>
                            <option value="Diciembre">Diciembre</option>
                            <option value="Consolidado Anual">Consolidado Anual</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-on-surface-variant uppercase tracking-wider">Año Fiscal</label>
                          <input 
                            type="number"
                            value={newBalanceYear}
                            onChange={(e) => setNewBalanceYear(Number(e.target.value))}
                            className="w-full bg-white border border-outline-variant p-2 rounded-lg outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Enlace Compartido Google Drive</label>
                        <input 
                          type="url" 
                          placeholder="https://drive.google.com/file/d/..."
                          value={newBalanceLinkDrive}
                          onChange={(e) => setNewBalanceLinkDrive(e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg p-2.5 outline-none text-primary font-semibold"
                          required
                        />
                      </div>

                      {/* Google Drive Upload Zone for Balances */}
                      <div className="space-y-1 bg-green-50/70 p-3 rounded-xl border border-green-200/50">
                        <span className="font-bold text-[9px] text-[#2c3e50] uppercase tracking-wider block">📁 Carga Directa (Guarda en Google Drive de Tesorería)</span>
                        <div className="border border-dashed border-green-300 rounded-lg p-3 text-center bg-white hover:bg-green-50/20 transition-colors relative cursor-pointer">
                          <input 
                            type="file" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const name = e.target.files[0].name;
                                const mockUrl = `https://drive.google.com/file/d/balance_uploaded_${Date.now()}/view`;
                                setNewBalanceLinkDrive(mockUrl);
                                alert(`Se guardó el archivo mensual "${name}" en la carpeta de Google Drive de Tesorería.\nSe ha enlazado automáticamente.`);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <FileUp className="w-5 h-5 mx-auto text-green-600 mb-1" />
                          <p className="text-[9px] text-slate-600 font-medium">Arrastra el archivo de balance o haz clic para subir</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider">Descripción / Auditoría Rápida</label>
                        <textarea 
                          placeholder="Indicar breve detalle del saldo, ingresos vs gastos reportados o estado de fondos..."
                          value={newBalanceDesc}
                          onChange={(e) => setNewBalanceDesc(e.target.value)}
                          className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none min-h-[70px] resize-none leading-relaxed text-primary"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-green-700 text-white font-extrabold rounded-lg hover:bg-green-850 transition-all shadow flex items-center justify-center gap-1 text-[11px]"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar Balance Financiero
                      </button>
                    </form>
                  </div>
                  
                  <div className="p-4 bg-tertiary-fixed text-primary rounded-xl text-xs space-y-1 shadow-inner border border-outline-variant/30 select-none">
                    <span className="font-black block uppercase tracking-wider">🛡️ CONTROL DE ACCESO DRIVE:</span>
                    <p className="text-[11px] leading-relaxed">
                      Por políticas de la asociación, asegúrate deque el enlace provisto para el balance tenga los permisos de lectura configurados correctamente al grupo de la junta para evitar incidentes técnicos en las revisiones.
                    </p>
                  </div>
                  </div>
                )}

                {/* Right Column: Balances archive grouped identically as Actas ("misma estructura") */}
                {mode === "balances" && (
                  <div className="col-span-12 lg:col-span-12 space-y-6">
                  
                  {/* Search and control filter head */}
                  <div className="bg-white p-5 rounded-2xl border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-left select-none">
                      <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider">Consulta de Balances de Tesorería</h3>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Historial integrado de balances mensuales con visualizador satelital de Google Drive</p>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Filtrar balances..."
                        value={searchBalance}
                        onChange={(e) => setSearchBalance(e.target.value)}
                        className="pl-8 pr-4 py-1.5 text-xs rounded-full border border-outline bg-transparent select-all outline-none focus:border-secondary w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <a 
                      href="https://drive.google.com/drive/folders/1X6yFVXYMswUOdIhwLyE1a3Y1OP2uHlw1?usp=drive_link" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-green-200 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Carpeta Drive Balances (Tesorería)
                    </a>
                  </div>

                  {/* Grouped Chronological Accordion List */}
                  {sortedBalanceYears.map(year => (
                    <div key={year} className="space-y-4 text-left">
                      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-1 mt-4">
                        <span className="text-lg font-black text-primary font-mono">{year}</span>
                        <span className="text-[10px] text-outline font-bold tracking-wider">REGISTRO FINANCIERO ANUAL</span>
                      </div>

                      {Object.keys(groupedBalances[year]).map(month => {
                        const key = `bal-${year}-${month}`;
                        const isExpanded = expandedGroups[key];
                        const balsInGroup = groupedBalances[year][month];

                        return (
                          <div key={month} className="bg-white rounded-xl border border-outline-variant/50 overflow-hidden shadow-sm transition-all hover:bg-surface-container-low/10">
                            
                            {/* Accordion Trigger Head */}
                            <button 
                              onClick={() => toggleGroup(key)}
                              className="w-full p-4 flex items-center justify-between text-left focus:outline-none select-none bg-emerald-50/20 border-b border-outline-variant/20"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-emerald-850" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-emerald-850" />
                                )}
                                <span className="font-bold text-primary text-sm">Balances de {month} de {year}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-250">
                                {balsInGroup.length} balances
                              </span>
                            </button>

                            {/* Accordion Content Table */}
                            {isExpanded && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left font-sans text-xs">
                                  <thead className="bg-[#f8fafc] text-[9px] text-on-surface-variant font-extrabold uppercase border-b border-outline-variant/20">
                                    <tr>
                                      <th className="px-5 py-2.5">Folio / Code</th>
                                      <th className="px-5 py-2.5">Periodo</th>
                                      <th className="px-5 py-2.5">Detalles del Balance</th>
                                      <th className="px-5 py-2.5">Subido Por</th>
                                      <th className="px-5 py-2.5 text-center">Acceso Enlace Drive</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant/15">
                                    {balsInGroup.map((bal) => (
                                      <tr key={bal.id} className="hover:bg-primary-container/[0.01]">
                                        <td className="px-5 py-3 font-semibold text-emerald-700 whitespace-nowrap">{bal.id}</td>
                                        <td className="px-5 py-3 font-bold text-primary whitespace-nowrap">{bal.periodo}</td>
                                        <td className="px-5 py-3">
                                          <p className="font-extrabold text-[#112435] leading-snug">{bal.descripcion}</p>
                                          <p className="text-[10px] text-outline mt-0.5">Fecha Carga: {bal.fecha}</p>
                                        </td>
                                        <td className="px-5 py-3 text-on-surface-variant font-medium whitespace-nowrap">{bal.creadoPor}</td>
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                          <a 
                                            href={bal.linkDrive}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors inline-flex items-center gap-1 font-bold text-[10px]"
                                            title="Abrir Balance Excel/PDF original en Google Drive"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-[9px] font-mono">Abrir en Drive</span>
                                          </a>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {sortedBalanceYears.length === 0 && (
                    <div className="bg-white p-12 text-center rounded-2xl border border-outline-variant/60">
                      <p className="text-sm font-bold text-on-surface-variant">No se encontraron balances ingresados.</p>
                      <button 
                        onClick={() => setSearchBalance("")}
                        className="text-xs text-emerald-900 underline font-bold mt-2"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}

                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-xs text-left text-on-surface-variant leading-relaxed select-none">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Sincronización Transparente con Google Drive
                    </p>
                    <p className="text-[11px] text-[#2c3e50]">
                      Este módulo integra la estructura de monitoreo de auditoría de iglesia, enlazando directamente las planillas de balances subidas por la tesorería local en Google Drive. No se copian archivos locales redundantes, garantizando consistencia central corporativa en la nube.
                    </p>
                  </div>

                </div>
                )}

              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 4: SOLICITUD DE VOTOS (Visible for normal leaders) */}
        {subTab === "votos_solicitud" && (
          <VotosSolicitudView 
            currentUser={currentUser}
            boardVotos={boardVotos}
            onAddBoardVoto={onAddBoardVoto}
            votosPlazoLimite={votosPlazoLimite}
          />
        )}

        {/* VIEW 5: GESTIÓN DE VOTOS (Secretary Administration) */}
        {subTab === "votos_gestion" && (
          <VotosGestionView 
            currentUser={currentUser}
            boardVotos={boardVotos}
            onUpdateBoardVotoStatus={onUpdateBoardVotoStatus}
            onEditBoardVoto={onEditBoardVoto}
            votosPlazoLimite={votosPlazoLimite}
            onUpdateVotosPlazoLimite={onUpdateVotosPlazoLimite}
            onAddBoardVoto={onAddBoardVoto}
          />
        )}

        {/* VIEW 6: VOTOS APROBADOS DE JUNTA (Strictly for Pastores / Elders) */}
        {subTab === "votos_aprobados" && (
          <VotosAprobadosView 
            currentUser={currentUser}
            boardVotos={boardVotos}
            votosPlazoLimite={votosPlazoLimite}
          />
        )}

        {/* VIEW 4: GESTIÓN DE VOTOS & AGENDA GENERATOR (LEGACY DISABLED) */}
        {subTab === "votos" && false && (
          <motion.div 
            key="votos-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-left"
          >
            {/* WORKSPACE FOR GESTION DE VOTOS */}
            
            {/* 1. Statistics & Deadline Config bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white p-5 rounded-2xl border border-outline-variant/60 shadow-sm">
              <div className="md:col-span-8 space-y-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase rounded-full">Consolidación de Sesión</span>
                <h3 className="font-sans text-base font-black text-primary">Plazo de Envío y Cronograma de Agenda</h3>
                <p className="text-xs text-on-surface-variant">
                  La secretaría unifica las propuestas ingresadas por directores antes de generar la Agenda Oficial. 
                  Los directores deben enviar sus propuestas antes del plazo definitivo.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-secondary" />
                    Plazo de Solicitud: <span className="font-mono text-blue-700 font-extrabold ml-1">Miércoles, {new Date(votosPlazoLimite).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) || votosPlazoLimite}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    Junta Directiva Correspondiente: <span className="font-mono text-purple-700 font-extrabold ml-1">Domingo Sucesivo</span>
                  </div>
                </div>
              </div>

              {/* Deadline configure form (Visible for Secretaría/Pastor/Elder) */}
              <div className="md:col-span-4 bg-tertiary-fixed text-primary p-4 rounded-xl space-y-2 border border-outline-variant/20 self-stretch flex flex-col justify-center">
                {canAdministrateVotes ? (
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="font-extrabold text-[10px] uppercase text-primary tracking-wider block">✍️ Configurar Fecha Límite (Secretaría)</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="date"
                        value={newDeadLineInput}
                        onChange={(e) => setNewDeadLineInput(e.target.value)}
                        className="p-1 px-2 border border-primary/20 bg-white font-semibold text-primary outline-none focus:border-secondary text-xs rounded-lg flex-1"
                      />
                      <button 
                        onClick={() => {
                          if (!newDeadLineInput) return;
                          onUpdateVotosPlazoLimite(newDeadLineInput);
                          triggerMockEmail(
                            "directores-junta@ejemplo.com",
                            "Aviso: Nuevo plazo de entrega para Solicitud de Votos",
                            `Estimados Oficiales, la secretaria ha establecido una nueva fecha límite para recibir propuestas de junta: Miércoles, ${newDateFormatted(newDeadLineInput)}. Por favor envíen con anticipación.`
                          );
                          alert(`¡Plazo límite actualizado a ${newDeadLineInput}!\nSe ha notificado automáticamente por email a todos los directores.`);
                        }}
                        className="py-1 px-3 bg-secondary text-white font-extrabold text-[11px] rounded-lg hover:bg-secondary/90 transition-all shadow"
                      >
                        Aplicar
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600 italic">Fecha tope en la cual los directores envían solicitudes.</p>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <span className="font-black text-xs text-primary uppercase block">Estado del Sistema</span>
                    <p className="text-[10px] text-on-surface-variant font-medium">Recepción activa para directores de departamentos.</p>
                    <span className="inline-block px-2.5 py-0.5 bg-green-200 text-green-950 font-mono text-[10px] font-black rounded-lg">● ABIERTO</span>
                  </div>
                )}
              </div>
            </div>

            {/* Helper function wrapper inside template */}
            {(() => {
              const approvedCount = boardVotos.filter(v => v.estado === "Aprobado").length;
              const pendingCount = boardVotos.filter(v => v.estado === "Pendiente").length;
              const obsCount = boardVotos.filter(v => v.estado === "Observado").length;
              return null;
            })()}

            {/* Main grid dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form Column: Enviar Solicitud */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* 2. Proposal Submission Form */}
                <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="select-none">
                    <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider text-blue-600">Crear Solicitud de Voto</h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">Los líderes registran sus requerimientos para la Junta Directiva.</p>
                  </div>

                  <form onSubmit={handleRegisterVoteRequest} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Departamento Solicitante</label>
                      <select 
                        value={newVotoDept}
                        onChange={(e) => setNewVotoDept(e.target.value)}
                        className="w-full bg-white border border-outline-variant p-2 rounded-lg outline-none font-semibold text-primary cursor-pointer text-xs"
                      >
                        <option value="Ministerio Joven">Ministerio Joven</option>
                        <option value="Ministerio Infantil">Ministerio Infantil</option>
                        <option value="ADRA / Acción Social">ADRA / Acción Social</option>
                        <option value="Diaconado / Infraestructura">Diaconado / Infraestructura</option>
                        <option value="Música y Audio Visual">Música y Audio Visual</option>
                        <option value="Evangelismo y Misión">Evangelismo y Misión</option>
                        <option value="Ministerio de la Mujer">Ministerio de la Mujer</option>
                        <option value="Conquistadores y Aventureros">Conquistadores y Aventureros</option>
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
                        className="w-full bg-slate-50 border border-outline-variant rounded-lg p-2 outline-none text-slate-500 text-xs font-bold"
                        readOnly
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Enlace de Documento de Drive (Opcional)</label>
                      <input 
                        type="url" 
                        placeholder="https://drive.google.com/file/d/..."
                        value={newVotoLinkDrive}
                        onChange={(e) => setNewVotoLinkDrive(e.target.value)}
                        className="w-full bg-white border border-outline-variant rounded-lg p-2.5 outline-none text-primary text-xs"
                      />
                      <p className="text-[10px] text-gray-500 italic">Link a la moción escrita, catálogo, cotización o justificativo.</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-on-surface-variant uppercase tracking-wider block">Descripción / Detalle de la Propuesta</label>
                        <span className="text-[9px] text-[#2e86c1] font-black uppercase bg-sky-50 px-1 border border-sky-200 rounded">Mandatorio: PROPONE</span>
                      </div>
                      
                      <textarea 
                        placeholder="PROPONE la realización del concierto misionero el día..."
                        value={newVotoDesc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewVotoDesc(val);
                        }}
                        className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none min-h-[90px] resize-none leading-relaxed text-primary text-xs font-semibold"
                        required
                      />
                      <p className="text-[9px] text-gray-500 leading-snug">
                        💡 **Regla de Redacción**: Las propuestas deben estructurarse de forma afirmativa y comenzar necesariamente con la expresión **PROPONE** seguido inmediatamente de lo solicitado para su respectiva redacción final en las actas de junta.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 text-white font-extrabold rounded-lg hover:bg-blue-700 transition-all shadow flex items-center justify-center gap-1.5 text-[11px]"
                    >
                      <Plus className="w-3.5 h-3.5" /> Enviar Propuesta a Secretaría
                    </button>
                  </form>
                </div>

                {/* Email simulator preview log cabinet */}
                <div className="bg-slate-900 text-slate-300 border border-slate-800 p-4 rounded-2xl text-xs space-y-2 select-none text-left">
                  <span className="font-extrabold text-[10px] text-slate-400 block uppercase tracking-wide">📨 CONEXION SMTP INTEGRADO (Email Logs)</span>
                  <div className="space-y-1.5 h-20 overflow-y-auto font-mono text-[9px] text-slate-400 divide-y divide-slate-800">
                    {emailLogs.length === 0 ? (
                      <p className="text-slate-500 italic pt-6 text-center">No se han disparado correos todavía.</p>
                    ) : (
                      emailLogs.map((log, id) => (
                        <p key={id} className="pt-1.5 first:pt-0 text-slate-300">{log}</p>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* List and Agenda preview column */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 3. Subview Selector: Solicitudes Recibidas vs Live Agenda Preview */}
                <div className="bg-white p-4 rounded-2xl border border-outline-variant/60 shadow-sm">
                  
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-xl border border-outline-variant/30 text-xs">
                    <button 
                      onClick={() => {
                        // Clear edits
                        setVotoEditingId(null);
                        setVotoObservingId(null);
                      }}
                      className="py-2.5 font-extrabold text-primary rounded-lg text-center flex items-center justify-center gap-2 bg-white shadow-sm border border-outline-variant/10"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Todas las Solicitudes ({filteredVotos.length})
                    </button>
                    <button 
                      onClick={() => {
                        // Trick to scroll or visualize
                        const el = document.getElementById("agenda-sheet");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="py-2.5 font-bold text-[#475569] hover:bg-slate-100 rounded-lg text-center flex items-center justify-center gap-2 transition-colors"
                    >
                      <HardDriveDownload className="w-3.5 h-3.5 text-purple-600" /> Agenda Generada Word (.docx)
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mt-4 select-none">
                    <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider flex items-center gap-1">
                      Propuestas Ingresadas para la Sesión 
                    </h3>
                    <div className="relative w-full sm:w-52">
                      <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Filtrar por depto, líder, etc..."
                        value={searchVoto}
                        onChange={(e) => setSearchVoto(e.target.value)}
                        className="pl-7 pr-3 py-1 text-[11px] rounded-full border border-outline bg-transparent select-all outline-none focus:border-secondary w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Inline Editing Form */}
                {votoEditingId && (
                  <div className="bg-blue-50 border-2 border-blue-200 p-5 rounded-2xl space-y-4 text-xs">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-blue-900 uppercase">✏️ Editar Solicitud de Voto (Secretaría)</h4>
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
                          className="w-full bg-white border border-outline p-2 rounded-lg outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Enlace Documento Drive (Opcional)</label>
                        <input 
                          type="text" 
                          value={votoEditingLink} 
                          onChange={(e) => setVotoEditingLink(e.target.value)}
                          className="w-full bg-white border border-outline p-2 rounded-lg outline-none mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Texto Propuesta (Debe empezar con PROPONE)</label>
                      <textarea 
                        value={votoEditingDesc} 
                        onChange={(e) => setVotoEditingDesc(e.target.value)}
                        className="w-full bg-white border border-outline p-2 rounded-lg outline-none mt-1 min-h-[80px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => setVotoEditingId(null)} className="px-3 py-1.5 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-305">
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

                            // Send Email
                            triggerMockEmail(
                              updated.solicitanteEmail || "lider@ejemplo.com",
                              "Propuesta de Voto Corrección por Secretaría",
                              `Su propuesta "${updated.descripcion}" ha sido editada reglamentariamente por secretaría para congruencia de estilo a: "${votoEditingDesc}".`
                            );

                            alert("¡Propuesta de voto actualizada con éxito!");
                          }
                          setVotoEditingId(null);
                        }}
                        className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                )}

                {/* List Container of individual Votos */}
                <div className="space-y-4">
                  {filteredVotos.map((v) => {
                    const isObservingThis = votoObservingId === v.id;
                    return (
                      <div 
                        key={v.id} 
                        className={`bg-white rounded-2xl border p-5 shadow-sm transition-all text-left space-y-3.5 relative overflow-hidden ${
                          v.estado === "Aprobado" 
                            ? "border-green-200 hover:border-green-300" 
                            : v.estado === "Observado"
                            ? "border-amber-200 hover:border-amber-300"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Status absolute right tag */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
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

                        {/* Proposal Card Header */}
                        <div className="flex gap-2 items-start text-xs pr-20 select-none">
                          <div className={`p-1.5 rounded-xl ${
                            v.estado === "Aprobado" ? "bg-green-50 text-green-600" : v.estado === "Observado" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-blue-600"
                          }`}>
                            <FileCode className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-extrabold text-[#112435] text-xs block">{v.departamento}</span>
                            <span className="text-[10px] text-gray-400 font-bold">Solicitado por: <span className="text-secondary font-black">{v.solicitante}</span> &bull; Enviado: {v.fechaEnvio}</span>
                          </div>
                        </div>

                        {/* Proposal Body (PROPONE) */}
                        <div className="text-xs bg-[#f8fafc] p-3 rounded-xl border border-slate-150 relative">
                          <p className="font-black text-primary leading-relaxed whitespace-pre-wrap">{v.descripcion}</p>
                          
                          {/* Attached Drive doc link helper */}
                          {v.linkDriveDoc && (
                            <div className="mt-2 text-right">
                              <a 
                                href={v.linkDriveDoc}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-primary font-bold transition-colors"
                              >
                                <ExternalLink className="w-3 h-3 text-blue-600" />
                                Ver Documento Moción en Drive
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Observation comment (If Observado) */}
                        {v.estado === "Observado" && v.observaciones && (
                          <div className="bg-amber-50 border border-amber-250 p-2.5 rounded-xl text-[11px] text-amber-950 font-medium">
                            <span className="font-black uppercase tracking-wider text-[9px] text-amber-800 block mb-0.5">⚠️ Observación de Secretaría:</span>
                            "{v.observaciones}"
                          </div>
                        )}

                        {/* INLINE OBSERVATION ENTRY BOX */}
                        {isObservingThis && (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 space-y-2 mt-2 text-xs">
                            <label className="font-black text-amber-950 uppercase text-[9px] block">Motivo / Requerimiento de Observación</label>
                            <input 
                              type="text"
                              value={votoObservacionesInput}
                              onChange={(e) => setVotoObservacionesInput(e.target.value)}
                              placeholder="e.g. Falta detallar presupuesto o cotización de equipamiento científico..."
                              className="w-full bg-white border border-amber-300 rounded-lg p-2 outline-none text-slate-800 focus:border-amber-500"
                            />
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => setVotoObservingId(null)} 
                                className="px-2.5 py-1 bg-slate-200 rounded text-slate-700 font-bold"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={() => {
                                  if (!votoObservacionesInput.trim()) {
                                    alert("Por favor ingresa un motivo de observación.");
                                    return;
                                  }
                                  onUpdateBoardVotoStatus(v.id, "Observado", votoObservacionesInput);
                                  
                                  // Send email notificator
                                  triggerMockEmail(
                                    v.solicitanteEmail || "lider@ejemplo.com",
                                    "⚠️ OBSERVADA: Solicitud de Voto Junta Directiva",
                                    `Estimado Director, su solicitud de voto para junta fue observada con la siguiente anotación: "${votoObservacionesInput}". Por favor corríjala.`
                                  );

                                  alert(`Solicitud marcada como observada. Notificación con descripción de observación enviada al oficial solicitante.`);
                                  setVotoObservingId(null);
                                  setVotoObservacionesInput("");
                                }} 
                                className="px-3.5 py-1 bg-amber-600 text-white font-extrabold rounded"
                              >
                                Guardar Observación
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ACTION PANEL (Only for Secretaries / Pastors / Elders) */}
                        {canAdministrateVotes && !votoEditingId && (
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 select-none flex-wrap gap-2">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">Gestión Administrativa:</span>
                            <div className="flex gap-1.5 flex-wrap">
                              
                              {v.estado !== "Aprobado" && (
                                <button 
                                  onClick={() => {
                                    onUpdateBoardVotoStatus(v.id, "Aprobado");
                                    
                                    // Mail notification
                                    triggerMockEmail(
                                      v.solicitanteEmail || "lider@ejemplo.com",
                                      "✓ APROBADA: Propuesta recomendada para Junta Directiva",
                                      `Felicitaciones, su voto "${v.descripcion.substring(0, 30)}..." fue debidamente APROBADO por secretaría e ingresado para la agenda dominical.`
                                    );

                                    alert("¡Voto aprobado exitosamente! Agregado a la agenda oficial e informada por correo.");
                                  }}
                                  className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg flex items-center gap-1 transition-all border border-green-200/50"
                                >
                                  <Check className="w-3 h-3" /> Aprobar e Indexar
                                </button>
                              )}

                              {v.estado !== "Observado" && !isObservingThis && (
                                <button 
                                  onClick={() => {
                                    setVotoObservingId(v.id);
                                    setVotoObservacionesInput("");
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg flex items-center gap-1 transition-all border border-amber-200/50"
                                >
                                  <Ban className="w-3 h-3" /> Observar Propuesta
                                </button>
                              )}

                              <button 
                                onClick={() => {
                                  setVotoEditingId(v.id);
                                  setVotoEditingDesc(v.descripcion);
                                  setVotoEditingDept(v.departamento);
                                  setVotoEditingLink(v.linkDriveDoc || "");
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-205 text-primary font-bold rounded-lg flex items-center gap-1 transition-all border border-outline-variant/30"
                              >
                                <Edit2 className="w-3 h-3 text-blue-600" /> Corregir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredVotos.length === 0 && (
                    <div className="bg-white p-12 text-center rounded-2xl border border-outline-variant/60">
                      <p className="text-sm font-bold text-on-surface-variant">No se encontraron solicitudes ingresadas en este momento.</p>
                    </div>
                  )}
                </div>

                {/* 4. REAL DOCUMENT AGENDA GENERATOR (Preview & Word DOCX Exporter) */}
                <div id="agenda-sheet" className="mt-8 space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-outline-variant/60 shadow-md text-left space-y-6">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/20 pb-4">
                      <div>
                        <h3 className="font-sans text-sm font-black text-primary uppercase tracking-wider">Generador de Agenda Oficial de Junta</h3>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">Visor pre-impresión unificado con exportador directo a Microsoft Word (.docx (.doc))</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={handleExportAgendaDoc}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-750 text-white font-black text-xs rounded-xl hover:shadow-lg hover:scale-[1.02] flex items-center gap-1.5 transition-all shadow cursor-pointer"
                          title="Genera y descarga un archivo MS Word con las propuestas recopiladas de la agenda."
                        >
                          <Download className="w-3.5 h-3.5" /> Word (.docx)
                        </button>
                        <button 
                          onClick={printAgendaToPDF}
                          className="px-4 py-2.5 bg-red-650 hover:bg-red-700 text-white font-black text-xs rounded-xl hover:shadow-lg hover:scale-[1.02] flex items-center gap-1.5 transition-all shadow cursor-pointer"
                          title="Generar la Agenda Oficial de Junta para el Pastor y Primer Anciano en formato PDF"
                        >
                          <FileText className="w-3.5 h-3.5" /> Agenda Pastor & Elder (.pdf)
                        </button>
                      </div>
                    </div>

                    {/* Interactive review panel (Pastor and Elder authorization) */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50/40 p-4 rounded-xl border border-purple-200/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs select-none">
                      <div className="space-y-1">
                        <span className="font-black text-purple-900 uppercase text-[9px] tracking-wide block">🕵️ ACCESO REVISORES AUTORIZADOS:</span>
                        <p className="text-[11px] text-slate-700">
                          El primer anciano de iglesia y el pastor consejero validan y firman digitalmente los acuerdos preliminares antes de ser votados por junta completa.
                        </p>
                        <div className="flex gap-4 pt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-green-700">
                            <CheckCircle className="w-4 h-4 text-green-600 animate-pulse" /> Pastor Distrital: [Validado y Autorizado]
                          </span>
                          <span className="flex items-center gap-1 font-bold text-purple-700">
                            <CheckCircle className="w-4 h-4 text-purple-600 animate-pulse" /> Primer Anciano: [Leído y Conforme]
                          </span>
                        </div>
                      </div>

                      {isPastorOrElder && (
                        <button 
                          onClick={() => {
                            alert("¡Agenda de Junta oficialmente visada y aprobada por la consejería eclesiástica! Se ha despachado una notificación de conformidad a secretaría.");
                            triggerMockEmail(
                              "secretaria@ejemplo.com",
                              "✓ Aprobación de Agenda: Pastor & Primer Anciano",
                              `La agenda propuesta ha sido visada satisfactoriamente por el pastor distrital y el primer anciano, autorizando la convocatoria plenaria.`
                            );
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] rounded-lg transition-colors border border-purple-500 shadow-sm"
                        >
                          ✓ Validar y Firmar Agenda preliminar
                        </button>
                      )}
                    </div>

                    {/* Document Sheet Layout preview */}
                    <div className="border border-slate-300 shadow-inner rounded-xl p-6 sm:p-10 max-w-2xl mx-auto bg-white text-slate-900 border-t-8 border-t-primary select-text relative font-serif">
                      
                      {/* Internal IASD Logo header */}
                      <div className="text-center font-sans space-y-1.5 border-b-2 border-primary pb-5">
                        <div className="text-lg font-black text-primary tracking-wide">IGLESIA ADVENTISTA DEL SÉPTIMO DÍA</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Distrito Los Creadores &bull; Campo Sur de Iglesia</div>
                        <div className="text-xs text-red-700 font-extrabold bg-red-100/40 inline-block px-3 py-0.5 rounded border border-red-200/50">CONFIDENCIAL - PARA USO INTERNO DE LA JUNTA</div>
                      </div>

                      <div className="space-y-6 pt-6 font-sans text-xs">
                        <div className="text-center">
                          <h4 className="text-sm font-black text-primary uppercase tracking-wide">AGENDA PRELIMINAR PARA LA REUNION DE JUNTA DIRECTIVA ORDINARIA</h4>
                          <span className="text-[10px] text-gray-500 italic font-mono block mt-1">Convocada para el Domingo subsiguiente al término de Solicitudes</span>
                        </div>

                        {/* Meeting Metadata sheet box */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] leading-relaxed font-mono">
                          <strong>FECHA LÍMITE RECEPCIÓN:</strong> {votosPlazoLimite}<br />
                          <strong>CONVOCADO POR:</strong> Pr. Pastor Demo (Presidencia de Junta)<br />
                          <strong>REGISTRADO POR:</strong> {currentUser.name} (Secretaría de Actas)<br />
                          <strong>HORA SUGERIDA:</strong> 09:00 AM (Salón Principal / Zoom alternativo)<br />
                        </div>

                        <div className="space-y-4">
                          
                          {/* Part 1 */}
                          <div>
                            <span className="font-extrabold uppercase text-[#1a365d] border-b border-slate-200 block pb-0.5 mb-1.5">I. Apertura y Devocional Preliminar</span>
                            <ul className="list-decimal list-inside text-gray-700 pl-2 leading-relaxed space-y-0.5 text-[11px]">
                              <li>Lectura de Agenda preliminar, enmiendas y aprobación de la tabla.</li>
                              <li>Devocional e intercesión general de consagración de directores.</li>
                              <li>Alineación de objetivos de la junta plenaria.</li>
                            </ul>
                          </div>

                          {/* Part 2 - Interactive Approved Proposals */}
                          <div>
                            <span className="font-extrabold uppercase text-[#1a365d] border-b border-slate-200 block pb-0.5 mb-1.5">II. Tabla de Propuestas Sometidas a Voto</span>
                            
                            {boardVotos.filter(v => v.estado === "Aprobado").length === 0 ? (
                              <p className="text-slate-400 italic text-[11px] py-4 text-center">No hay ninguna propuesta de voto aprobada e indexada en la agenda en este momento.</p>
                            ) : (
                              <div className="space-y-3 pt-1 pl-1">
                                {Array.from(new Set(boardVotos.filter(v => v.estado === "Aprobado").map(v => v.departamento))).map(dept => (
                                  <div key={dept} className="space-y-1.5">
                                    <span className="text-blue-700 font-extrabold text-[10px] uppercase block tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-100">&bull; {dept}</span>
                                    <div className="pl-3 space-y-2">
                                      {boardVotos.filter(v => v.estado === "Aprobado" && v.departamento === dept).map((v, index) => (
                                        <div key={v.id} className="text-[11px] leading-relaxed border-l-2 border-slate-400 pl-2">
                                          <p className="font-black text-gray-900">{v.descripcion}</p>
                                          <p className="text-[9px] text-gray-500 italic block mt-0.5">Propuesto por: {v.solicitante} &bull; Folio: {v.id.substring(0, 8)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Part 3 */}
                          <div>
                            <span className="font-extrabold uppercase text-[#1a365d] border-b border-slate-200 block pb-0.5 mb-1.5">III. Asuntos varios, Clausura y Oración Cierre</span>
                            <ul className="list-decimal list-inside text-gray-700 pl-2 leading-relaxed space-y-0.5 text-[11px]">
                              <li>Retroalimentación ejecutiva de pastores y secretarios.</li>
                              <li>Calendarización preliminar de proyectos futuros.</li>
                              <li>Oración final congregacional por oficiales activos.</li>
                            </ul>
                          </div>

                        </div>

                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
