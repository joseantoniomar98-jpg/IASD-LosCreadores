/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Department, FundRequest, User, Cargo } from "../types";
import { 
  FileText, CheckCircle2, ChevronRight, HelpCircle, Bell, ArrowLeft, 
  Info, Send, AlertTriangle, Landmark, Eye, Check, X, ShieldAlert,
  ArrowUpRight, ListCollapse, PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SolicitudesProps {
  departments: Department[];
  fundRequests: FundRequest[];
  onAddRequest: (req: FundRequest) => void;
  onUpdateRequestStatus: (id: string, status: "Aprobada" | "Observada" | "Rechazada", obs?: string) => void;
  onToggleFundRequestClosed?: (id: string, cerrado: boolean) => void;
  currentUser?: User;
  mode?: "resumen" | "gestion" | "nueva";
  cargos?: Cargo[];
  bankList?: string[];
}

export const SolicitudesView: React.FC<SolicitudesProps> = ({
  departments,
  fundRequests,
  onAddRequest,
  onUpdateRequestStatus,
  onToggleFundRequestClosed,
  currentUser,
  mode = "resumen",
  cargos = [],
  bankList = [
    "Banco Estado",
    "Banco de Chile",
    "Banco Santander",
    "Banco BCI",
    "Banco Itaú",
    "Banco Falabella",
    "Banco Scotiabank",
    "Banco Security",
    "Banco BICE"
  ]
}) => {
  // Determine if the user is a global administrative officer/auditor
  const isGlobalManager = (currentUser?.roles.some(r => 
    r.toLowerCase().includes("tesorero") || 
    r.toLowerCase().includes("pastor") || 
    r.toLowerCase().includes("anciano") ||
    r.toLowerCase().includes("secretar") ||
    r.toLowerCase().includes("asistente")
  ) || (currentUser && currentUser.roles.some(roleName => {
    const matchedCargo = cargos.find(c => c.name.toLowerCase() === roleName.toLowerCase());
    return matchedCargo?.permissions.includes("ver_todos_departamentos");
  }))) ?? true;

  // Filter departments (funds) related to the user's assigned departments (formerly categories)
  const matchedDepts = isGlobalManager 
    ? departments 
    : departments.filter(d => currentUser?.departments.includes(d.category));

  // Requests in user's departments (funds)
  const matchedRequests = isGlobalManager
    ? fundRequests
    : fundRequests.filter(r => {
        const dObj = departments.find(d => d.name === r.department);
        return dObj && currentUser?.departments.includes(dObj.category);
      });

  // Navigation: "crear" (Form) or "bandeja" (Review Board)
  const [subTab, setSubTab] = useState<"crear" | "bandeja" >(() => mode === "nueva" ? "crear" : "bandeja");

  React.useEffect(() => {
    setSubTab(mode === "nueva" ? "crear" : "bandeja");
  }, [mode]);

  // --- NEW REQUEST FORM STATE ---
  const [selectedDeptId, setSelectedDeptId] = useState(matchedDepts[0]?.id || "dep-2");
  const [applicant, setApplicant] = useState(currentUser?.name || "Juan Pérez");
  const [amount, setAmount] = useState("");
  const [boardVote, setBoardVote] = useState("");
  const [description, setDescription] = useState("");
  const [recipientType, setRecipientType] = useState<"director" | "otra_persona">("director");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRut, setRecipientRut] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [bank, setBank] = useState("");
  const [accountType, setAccountType] = useState("Cuenta Corriente");
  const [accountNumber, setAccountNumber] = useState("");
  
  // Feedback modals
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- REVIEW BOARD STATE ---
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [adminComment, setAdminComment] = useState("");
  
  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const currentDeptUsedReal = selectedDept ? selectedDept.budgetUsed : 0;
  const currentDeptAllocatedReal = selectedDept ? selectedDept.budgetAllocated : 1;
  const availableBudgetReal = selectedDept ? (selectedDept.budgetAllocated - selectedDept.budgetUsed) : 0;

  // Filter state for status tabs
  const [filterState, setFilterState] = useState<"todos" | "Pendiente" | "Aprobada" | "Observada" | "Rechazada">("todos");

  // Dynamic filtered fund requests of matching departments
  const filteredRequests = React.useMemo(() => {
    if (filterState === "todos") return matchedRequests;
    return matchedRequests.filter(r => r.status === filterState);
  }, [matchedRequests, filterState]);

  // Selected request on backend
  const activeReq = filteredRequests.find(r => r.id === selectedReqId) || filteredRequests[0];

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setApplicant(currentUser.name);
      const userDepts = isGlobalManager 
        ? departments 
        : departments.filter(d => currentUser.departments.includes(d.category));
      if (userDepts.length > 0) {
        setSelectedDeptId(userDepts[0].id);
      }
    }
  }, [currentUser, departments]);

  // Submit Handler
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const reqVal = parseFloat(amount);
    if (isNaN(reqVal) || reqVal <= 0) {
      alert("Por favor ingrese un monto a solicitar válido.");
      return;
    }

    if (reqVal > 100000 && !boardVote.trim()) {
      alert("⚠️ ALERTA DE TOPE: Para solicitudes superiores a $100.000 CLP es obligatorio registrar una Referencia a Voto de Junta.");
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const selectedDeptObj = departments.find(d => d.id === selectedDeptId);
      
      const newReq: FundRequest = {
        id: "REQ-2024-0" + (fundRequests.length + 42),
        department: selectedDeptObj?.name || "Administración",
        applicant: applicant,
        amount: reqVal,
        boardVote: boardVote || "Sin Voto",
        description: description,
        expectedDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
        recipientType: recipientType,
        recipientName: recipientType === "director" ? applicant : recipientName,
        recipientRut: recipientRut,
        recipientEmail: recipientEmail,
        bank: bank || "Banco Central",
        accountType: accountType,
        accountNumber: accountNumber || "9999 1111 2222",
        status: "Pendiente",
        isException: reqVal > 100000
      };

      onAddRequest(newReq);
      setSelectedReqId(newReq.id); // set active
      setIsSubmitting(false);
      setShowCreatedModal(true);

      // Reset
      setAmount("");
      setBoardVote("");
      setDescription("");
      setRecipientName("");
      setRecipientRut("");
      setRecipientEmail("");
      setBank("");
      setAccountNumber("");
    }, 1000);
  };

  // Perform approve / deny actions
  const handleUpdateStatus = (status: "Aprobada" | "Observada" | "Rechazada") => {
    if (!activeReq) return;
    onUpdateRequestStatus(activeReq.id, status, adminComment);
    setAdminComment("");
    alert(`La solicitud ${activeReq.id} ha sido cambiada al estado: ${status}`);
  };

  // Stats calcs for dashboard pending items
  const totalOutstanding = matchedRequests
    .filter(r => r.status === "Pendiente")
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingCount = matchedRequests.filter(r => r.status === "Pendiente").length;

  const totalAllocatedRequestsAmount = matchedRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">

      {/* Header bar and sub-switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>GESTIÓN DE SOLICITUDES</span>
            <span>/</span>
            <span className="text-secondary font-bold">
              {mode === "resumen" && "RESUMEN FONDOS"}
              {mode === "gestion" && "GESTIÓN DE FONDOS"}
              {mode === "nueva" && "NUEVA SOLICITUD"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            {mode === "resumen" && "Resumen Fondos por Rendir"}
            {mode === "gestion" && "Gestión de Fondos por Rendir (Tesorero)"}
            {mode === "nueva" && "Nueva Solicitud de Fondos"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {mode === "resumen" && "Visualiza la planilla consolidada y estados vigentes de tus adelantos de caja."}
            {mode === "gestion" && "Autorizar y registrar adelantos de fondos solicitados por los directores de departamentos."}
            {mode === "nueva" && "Complete el formulario formal indicando el monto y el voto de junta que faculta el adelanto."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: APPROVED BOARD / ALL OVERVIEW */}
        {subTab === "bandeja" && (
          <motion.div 
            key="bandeja-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Stats Overview Bento block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
              
              <div className="bg-white p-6 rounded-2xl border border-outline-variant/65 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">TOTAL POR RENDIR</span>
                  <Landmark className="w-4 h-4 text-primary" />
                </div>
                <h4 className="text-2xl font-black text-primary font-mono">${totalAllocatedRequestsAmount.toLocaleString("es-CL")}</h4>
                <div className="flex items-center gap-1 mt-2 text-on-tertiary-container bg-tertiary/10 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <span>{ matchedRequests.length } Solicitudes Totales</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-outline-variant/65 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">PENDIENTES HOY</span>
                  <Info className="w-4 h-4 text-secondary" />
                </div>
                <h4 className="text-2xl font-black text-secondary font-mono">0{ pendingCount }</h4>
                <p className="text-[10px] text-on-surface-variant font-medium mt-1">Esperando dictamen formal</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-outline-variant/65 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">EJECUCIÓN DEL LÍMITE</span>
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-2xl font-black text-primary font-sans">64%</h4>
                  <span className="text-[9px] text-on-surface-variant font-bold uppercase">De tope trimestral</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: "64%" }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-outline-variant/65 shadow-sm border-l-4 border-l-error">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">ALERTAS DE PLAZO</span>
                  <AlertTriangle className="w-4 h-4 text-error" />
                </div>
                <h4 className="text-2xl font-black text-error font-mono">03</h4>
                <p className="text-[10px] text-error font-extrabold mt-1">Fondos adelantados &gt; 15 días sin rendir</p>
              </div>

            </div>

            {/* Bento Split: Left side pending requests list, Right side details card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column Table */}
              <div className="lg:col-span-12 xl:col-span-7 bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-5 border-b border-outline-variant/35 bg-surface-container-low/20 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Solicitudes en Espera de Veredicto</h3>
                    
                    {/* Status filter toggle */}
                    <div className="flex flex-wrap items-center gap-1 bg-slate-150/80 rounded-xl p-1 border border-outline-variant/20 select-none">
                      {["Todos", "Pendiente", "Aprobada", "Observada", "Rechazada"].map((st) => (
                        <button 
                          key={st}
                          type="button"
                          onClick={() => setFilterState(st === "Todos" ? "todos" : st as any)}
                          className={`px-2.5 py-1 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all ${
                            filterState.toLowerCase() === (st === "Todos" ? "todos" : st).toLowerCase()
                              ? "bg-white text-slate-900 shadow-sm font-black border border-slate-200" 
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {st === "Aprobada" ? "Apro" : st === "Pendiente" ? "Pend" : st === "Observada" ? "Obs" : st === "Rechazada" ? "Rech" : st}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-[#f8fafc] text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                        <tr className="border-b border-outline-variant/30">
                          <th className="px-5 py-3">Fondo / Motivo</th>
                          <th className="px-5 py-3">Solicitante</th>
                          <th className="px-5 py-3 text-right">Monto</th>
                          <th className="px-5 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/25 text-xs">
                        {filteredRequests.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant font-medium text-xs bg-slate-50">
                              No hay solicitudes con este estado.
                            </td>
                          </tr>
                        ) : (
                          filteredRequests.map((req) => (
                            <tr 
                              key={req.id}
                              onClick={() => setSelectedReqId(req.id)}
                              className={`cursor-pointer transition-colors ${
                                selectedReqId === req.id 
                                  ? "bg-secondary-fixed/30 border-l-4 border-l-secondary font-bold" 
                                  : "hover:bg-surface-container-low/40"
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex flex-col text-left">
                                  <span className="font-extrabold text-primary flex items-center gap-1.5 flex-wrap">
                                    {req.department}
                                    {req.isException && (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">
                                        Excepción
                                      </span>
                                    )}
                                    {req.cerrado && (
                                      <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">
                                        Cerrado
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant truncate max-w-[200px] mt-0.5">{req.description}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 font-semibold text-primary">{req.applicant}</td>
                              <td className="px-5 py-4 text-right font-mono font-bold text-primary">
                                ${req.amount.toLocaleString("es-CL")}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  req.status === "Pendiente" 
                                    ? "bg-secondary-container/20 text-secondary"
                                    : req.status === "Aprobada" 
                                    ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                    : "bg-error-container text-error"
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="p-4 bg-[#f8fafc] border-t border-outline-variant/30 flex justify-between items-center text-xs text-on-surface-variant">
                  <span>Mostrando {filteredRequests.length} solicitudes (de {matchedRequests.length} filtradas de {fundRequests.length} totales)</span>
                  <span className="font-bold text-secondary">Filtro: {filterState === "todos" ? "Todos" : filterState}</span>
                </div>
              </div>

              {/* Right Column Detailed card with action controls */}
              <div className="lg:col-span-5 space-y-6">
                
                {activeReq ? (
                  <div className="bg-white rounded-2xl border border-outline-variant/60 p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] font-black text-secondary tracking-widest uppercase block">Detalle de Solicitud</span>
                        <h3 className="text-xl font-black text-primary font-sans mt-1">{activeReq.id}</h3>
                      </div>
                      <span className="bg-error-container text-on-error-container px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider shrink-0 select-none">
                        Voto junta: {activeReq.boardVote}
                      </span>
                    </div>

                    {activeReq.isException && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2 mb-4 text-left shadow-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block uppercase text-[9px] tracking-wider text-amber-900 mb-0.5">⚠️ Solicitud de Excepción (Art. 6.3)</span>
                          <span className="leading-relaxed">Este fondo solicitado excede el tope mensual ordinario de $100.000 CLP. La aprobación requiere validación manual y consentimiento expreso del Tesorero Central.</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 mb-6">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Solicitante</p>
                          <p className="text-sm font-extrabold text-primary mt-1">{activeReq.applicant}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Monto Solicitado</p>
                          <p className="text-lg font-black text-error font-mono mt-0.5">${activeReq.amount.toLocaleString("es-CL")}</p>
                        </div>
                      </div>

                      <div className="border-t border-outline-variant/30 pt-3">
                        <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Destino de los Fondos</p>
                        <p className="text-xs text-on-surface bg-surface-container-low p-3 rounded-lg mt-1.5 italic leading-relaxed">
                          "{activeReq.description}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/30 pt-3 text-xs">
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Fecha Requerida</p>
                          <p className="font-extrabold text-primary mt-1">{activeReq.expectedDate}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Destinatario</p>
                          <p className="font-extrabold text-primary mt-1">{activeReq.recipientName}</p>
                        </div>
                      </div>

                      {/* Banking detail board */}
                      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/60 shadow-inner">
                        <div className="flex items-center gap-2 mb-3">
                          <Landmark className="w-4 h-4 text-primary shrink-0" />
                          <p className="text-[10px] font-black uppercase text-primary tracking-wider">Datos Bancarios para Transferencia</p>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                            <span className="text-on-surface-variant">Nombre Beneficiario:</span>
                            <span className="font-extrabold text-primary">{activeReq.recipientName}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                            <span className="text-on-surface-variant">RUT:</span>
                            <span className="font-extrabold text-primary font-mono">{activeReq.recipientRut || "No especificado"}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                            <span className="text-on-surface-variant">Correo:</span>
                            <span className="font-extrabold text-primary">{activeReq.recipientEmail || "No especificado"}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                            <span className="text-on-surface-variant">Banco:</span>
                            <span className="font-extrabold text-primary">{activeReq.bank}</span>
                          </div>
                          <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                            <span className="text-on-surface-variant">Tipo de Cuenta:</span>
                            <span className="font-extrabold text-primary">{activeReq.accountType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Nº Cuenta:</span>
                            <span className="font-mono font-extrabold text-primary tracking-wider">{activeReq.accountNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Observations box */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Observaciones / Comentarios de Tesorería</label>
                        <input 
                          type="text" 
                          placeholder="Escriba observaciones o detalles si es necesario..."
                          value={adminComment}
                          onChange={(e) => setAdminComment(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-secondary focus:bg-white"
                        />
                      </div>

                    </div>

                    {/* Quick approvals panel buttons */}
                    {activeReq.status === "Pendiente" && mode !== "resumen" ? (
                      <div className="space-y-3">
                        <button 
                          onClick={() => handleUpdateStatus("Aprobada")}
                          className="w-full bg-primary hover:bg-primary-container text-white py-3 rounded-xl font-bold transition-all transform active:scale-98 flex items-center justify-center gap-2 text-sm shadow-md"
                        >
                          <CheckCircle2 className="w-4 h-4 text-tertiary-fixed-dim" />
                          Aprobar y Transferir Fondos
                        </button>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <button 
                            onClick={() => handleUpdateStatus("Observada")}
                            className="bg-[#ebeef1] hover:bg-surface-container-high text-primary py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Observar
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus("Rechazada")}
                            className="bg-error-container text-on-error-container hover:bg-error/15 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 border border-error/20"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-xl text-center font-bold text-xs select-none ${
                          activeReq.status === "Aprobada" 
                            ? "bg-tertiary-fixed text-on-tertiary-fixed" 
                            : activeReq.status === "Observada"
                            ? "bg-secondary-fixed text-primary"
                            : "bg-error-container text-error"
                        }`}>
                          Esta solicitud ya fue resuelta con estado: {activeReq.status.toUpperCase()}
                        </div>
                        {activeReq.status === "Aprobada" && mode !== "resumen" && onToggleFundRequestClosed && (
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-150 text-center select-none">
                            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 block mb-1">Cierre Administrativo del Fondo</span>
                            <p className="text-[10px] text-emerald-700/80 mb-2.5 leading-relaxed">
                              {activeReq.cerrado 
                                ? "Este adelanto de dinero ya ha sido rendido y CERRADO reglamentariamente." 
                                : "Marcar como CERRADO una vez que el líder de departamento haya cargado todas las boletas justificadas."
                              }
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                onToggleFundRequestClosed(activeReq.id, !activeReq.cerrado);
                              }}
                              className={`w-full py-2 rounded-xl text-[11px] font-black transition-all shadow-sm ${
                                activeReq.cerrado
                                  ? "bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.01]"
                              }`}
                            >
                              {activeReq.cerrado ? "🔓 Reabrir Adelanto de Fondos" : "🔒 Marcar como Cerrado"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-center p-8 bg-white border rounded-2xl text-on-surface-variant font-medium">
                    No hay solicitudes pendientes en este momento.
                  </div>
                )}

                {/* Additional department health context card */}
                <div className="bg-white rounded-2xl border border-outline-variant/60 p-5 shadow-sm">
                  <h3 className="font-sans text-xs font-bold text-primary mb-3 uppercase tracking-wider">Salud de Presupuesto del Fondo</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-on-surface-variant">Presupuesto Asignado</span>
                      <span className="text-primary font-mono">$12,000,000</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-on-surface-variant">Ejecutado (Incluy. Solicitud)</span>
                      <span className="text-primary font-mono">$8,450,000</span>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div className="bg-tertiary-fixed-dim h-full rounded-full transition-all" style={{ width: "70%" }}></div>
                    </div>
                    <p className="text-[10px] text-on-tertiary-fixed-variant bg-tertiary-fixed-dim/15 p-2 rounded-lg italic">
                      * El Ministerio de Jóvenes se encuentra dentro de los márgenes previstos para el segundo trimestre.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* VIEW 2: CREATE APPLICATION FORM */}
        {subTab === "crear" && (
          <motion.div 
            key="crear-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Alert progress budget banner (Mockup 2 Style) */}
            <div className="p-4 rounded-xl bg-tertiary-fixed-dim/20 border border-on-tertiary-container/20 flex items-start gap-4 shadow-sm select-none">
              <span className="material-symbols-outlined text-on-tertiary-container mt-1 font-bold">account_balance_wallet</span>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-on-tertiary-container">Presupuesto Disponible vs. Tope Mensual</h3>
                <p className="text-xs text-on-surface-variant mt-0.5 mb-2.5">
                  Control de gastos para el fondo seleccionado respecto a su límite mensual asignado para prevenir déficits.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex-1 h-3 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-on-tertiary-container transition-all duration-700" style={{ width: "65%" }}></div>
                  </div>
                  <div className="text-right whitespace-nowrap shrink-0">
                    <span className="text-xs font-black text-on-tertiary-container block">
                      ${availableBudgetReal.toLocaleString("es-CL")} disponibles
                    </span>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      de un tope de ${currentDeptAllocatedReal.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Creator Sheet Form */}
            <form onSubmit={handleCreateRequest} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
              
              {/* Section 1: Solicitud Details */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                  <Info className="w-5 h-5 text-secondary shrink-0" />
                  <h2 className="text-base font-black text-primary uppercase tracking-wider">Información de la Solicitud</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Department select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Fondo de Tesorería</label>
                    <select 
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                    >
                      {matchedDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Applicant name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Solicitante</label>
                    <input 
                      type="text" 
                      value={applicant}
                      onChange={(e) => setApplicant(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                      placeholder="Nombre del director solicitante"
                      required
                    />
                  </div>

                  {/* Amount to request */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Monto a Solicitar</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
                      <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-surface border border-outline-variant rounded-lg p-3 pl-8 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-bold"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {parseFloat(amount) > 100000 && (
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 text-left">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold uppercase text-[9px] tracking-wide block text-amber-900">⚠️ Alerta de Excepción (Art. 6.3)</span>
                          <span className="leading-relaxed">El monto ingresado supera el tope mensual ordinario de $100.000 CLP. La solicitud se procesará como una Solicitud de Excepción que requiere aprobación del Tesorero Central.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Board vote approval reference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Referencia a Voto de Junta {parseFloat(amount) > 100000 ? "(Obligatorio)" : "(Opcional)"}
                    </label>
                    <input 
                      type="text" 
                      value={boardVote}
                      onChange={(e) => setBoardVote(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                      placeholder="Ej: Voto 2024-089"
                      required={parseFloat(amount) > 100000}
                    />
                  </div>

                  {/* Description / comment */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descripción o Comentarios</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none min-h-[100px] resize-y text-primary font-medium"
                      placeholder="Detalles adicionales sobre el uso, víveres o traslados solicitados..."
                      required
                    />
                  </div>

                </div>
              </section>

              {/* Section 2: Transfer Destination Data */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                  <Landmark className="w-5 h-5 text-secondary shrink-0" />
                  <h2 className="text-base font-black text-primary uppercase tracking-wider">Datos de Transferencia Bancaria</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Recipient Radio selectors */}
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Destinatario de la Transferencia</label>
                    <div className="flex gap-6 mt-1 select-none">
                      <label className="flex items-center gap-2 cursor-pointer bg-surface px-4 py-2 rounded-lg hover:bg-[#ebeef1] transition-colors border border-outline-variant/30">
                        <input 
                          type="radio" 
                          name="destinatario_tipo" 
                          value="director"
                          checked={recipientType === "director"}
                          onChange={() => {
                            setRecipientType("director");
                            setRecipientName(applicant);
                          }}
                          className="w-4 h-4 text-secondary border-outline-variant focus:ring-secondary" 
                        />
                        <span className="text-xs font-bold text-primary">Director</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-surface px-4 py-2 rounded-lg hover:bg-[#ebeef1] transition-colors border border-outline-variant/30">
                        <input 
                          type="radio" 
                          name="destinatario_tipo" 
                          value="otra_persona"
                          checked={recipientType === "otra_persona"}
                          onChange={() => {
                            setRecipientType("otra_persona");
                            setRecipientName("");
                          }}
                          className="w-4 h-4 text-secondary border-outline-variant focus:ring-secondary" 
                        />
                        <span className="text-xs font-bold text-primary">Otra persona / Entidad</span>
                      </label>
                    </div>
                  </div>

                  {/* Recipient Name */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nombre del Beneficiario</label>
                    <input 
                      type="text" 
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                      placeholder="Nombre completo o razón social de la entidad de destino"
                      required
                    />
                  </div>

                  {/* Recipient Identifiers (RUT Chile standard or generic) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-sans">RUT / Cédula de Identidad</label>
                    <input 
                      type="text" 
                      value={recipientRut}
                      onChange={(e) => setRecipientRut(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                      placeholder="12.345.678-9"
                      required
                    />
                  </div>

                  {/* Recipient Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium"
                      placeholder="ejemplo@correo.com"
                      required
                    />
                  </div>

                  {/* Bank name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Banco</label>
                    <select 
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium cursor-pointer"
                      required
                    >
                      <option value="">-- Seleccione Entidad Financiera --</option>
                      {bankList.map((bName) => (
                        <option key={bName} value={bName}>{bName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account type select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tipo de Cuenta</label>
                    <select 
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium cursor-pointer"
                    >
                      <option>Cuenta Corriente</option>
                      <option>Cuenta de Ahorros</option>
                      <option>Cuenta Vista</option>
                      <option>Vale Vista / Cheque</option>
                    </select>
                  </div>

                  {/* Account number input */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Número de Cuenta / CLABE</label>
                    <input 
                      type="text" 
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:ring-1 focus:ring-secondary transition-all outline-none text-primary font-medium tracking-wider text-clip font-mono"
                      placeholder="0000 0000 0000 0000"
                      required
                    />
                  </div>

                </div>
              </section>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-4 border-t border-outline-variant/30 pt-6">
                <button 
                  type="button"
                  onClick={() => setSubTab("bandeja")}
                  className="px-6 py-3 font-semibold text-xs text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all select-none"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-secondary text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 select-none disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                  {isSubmitting ? "Procesando..." : "Enviar Solicitud"}
                </button>
              </div>

            </form>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Success Notification creation alert overlay modal */}
      <AnimatePresence>
        {showCreatedModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
              onClick={() => setShowCreatedModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4 border border-outline-variant/30 z-10"
            >
              <div className="w-16 h-16 bg-tertiary/10 text-tertiary rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce text-center">
                <CheckCircle2 className="w-10 h-10 shrink-0" />
              </div>
              <h2 className="text-xl font-sans font-black text-primary">Solicitud Enviada</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Tu solicitud de fondos ha sido procesada exitosamente y está pendiente de aprobación por la Tesorería en la bandeja principal de control.
              </p>
              <button 
                onClick={() => {
                  setShowCreatedModal(false);
                  setSubTab("bandeja"); // switch to review list to see it
                }}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-container transition-all shadow select-none"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
