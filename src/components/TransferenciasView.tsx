/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Department, Transfer, User, Cargo, BankTransaction, FundRequest } from "../types";
import { 
  Landmark, ArrowRight, HelpCircle, TrendingUp, History, Info, Send, 
  CheckCircle2, Sliders, ChevronDown, Check, X, AlertTriangle, Edit2, 
  PlusCircle, RefreshCw, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TransferenciasViewProps {
  departments: Department[];
  transfers: Transfer[];
  onAddTransfer: (transfer: Transfer) => void;
  onUpdateDeptBalance: (deptId: string, amount: number) => void;
  currentUser?: User;
  mode?: "request" | "manage";
  cargos?: Cargo[];
  onUpdateTransferFields?: (id: string, fields: Partial<Transfer>) => void;
  bankTransactions?: BankTransaction[];
  fundRequests?: FundRequest[];
}

export const TransferenciasView: React.FC<TransferenciasViewProps> = ({
  departments,
  transfers,
  onAddTransfer,
  onUpdateDeptBalance,
  currentUser,
  mode = "request",
  cargos = [],
  onUpdateTransferFields,
  bankTransactions = [],
  fundRequests = []
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

  // Filter departments assigned to the user
  const userAssignedDepts = departments.filter(d => 
    currentUser?.departments.includes(d.name) || 
    currentUser?.departments.includes(d.category) ||
    currentUser?.departments.includes(d.code)
  );

  // If none explicitly match or they are a global manager, allow selecting from all departments as origin
  const finalOriginDepts = (isGlobalManager || userAssignedDepts.length === 0) ? departments : userAssignedDepts;

  // Transfers to display
  const matchedTransfers = transfers;

  // Local Form state
  const [originId, setOriginId] = useState(() => finalOriginDepts[0]?.id || "dep-1");
  const [destinationId, setDestinationId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTransferAmount, setLastTransferAmount] = useState(0);

  // Treasurer's direct creation toggle
  const [showDirectForm, setShowDirectForm] = useState(false);

  // Edit states
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [editOriginId, setEditOriginId] = useState("");
  const [editDestinationId, setEditDestinationId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");

  // Observation states
  const [observingTransfer, setObservingTransfer] = useState<Transfer | null>(null);
  const [observationInput, setObservationInput] = useState("");

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      const userDepts = departments.filter(d => 
        currentUser.departments.includes(d.name) || 
        currentUser.departments.includes(d.category) ||
        currentUser.departments.includes(d.code)
      );
      const initialOriginList = (isGlobalManager || userDepts.length === 0) ? departments : userDepts;
      if (initialOriginList.length > 0) {
        setOriginId(initialOriginList[0].id);
      }
    }
  }, [currentUser, departments, isGlobalManager]);

  // Filter state
  const [filterState, setFilterState] = useState<string>("todos");
  
  // Find currently selected origin department to display its balance
  const selectedOrigin = departments.find(d => d.id === originId);

  const getDynamicAvailableBudget = (d: Department | undefined) => {
    if (!d) return 0;
    const departInitial = d.initialBudget !== undefined ? d.initialBudget : d.budgetAllocated;
    
    // Calculate department specific incomes
    const percentage = d.assignedPercentage ?? 10;
    let incomesSum = 0;
    bankTransactions.forEach(tx => {
      if (tx.type === "Ingreso") {
        const matched = tx.category.toLowerCase().includes(d.name.toLowerCase()) ||
                        tx.description.toLowerCase().includes(d.name.toLowerCase()) ||
                        tx.category.toLowerCase().includes(d.category.toLowerCase());
        if (matched) {
          incomesSum += tx.amount;
        } else if (tx.category.toLowerCase().includes("ofrenda") || tx.category.toLowerCase().includes("diezmo") || tx.category.toLowerCase().includes("generales") || tx.category.toLowerCase().includes("colecta")) {
          incomesSum += Math.round(tx.amount * (percentage / 100));
        }
      }
    });

    // Calculate pending/outstanding advances
    const pendingAdvances = fundRequests
      .filter(r => r.department === d.name && r.status === "Aprobada" && r.cerrado !== true)
      .reduce((sum, r) => sum + r.amount, 0);

    const totalPresupuestoFondo = departInitial + incomesSum - pendingAdvances;
    const topeMensual = d.budgetAllocated;

    // "si el monto del presupuesto del departamento es mayor al tope mensual lo 'disponible' es el tope mensual y si es menor al tope mensual lo 'disponible' es el presupuesto"
    // We subtract d.budgetUsed to find the remaining available portion for both cases.
    let availableBudgetSim = 0;
    if (totalPresupuestoFondo > topeMensual) {
      availableBudgetSim = topeMensual - d.budgetUsed;
    } else {
      availableBudgetSim = totalPresupuestoFondo - d.budgetUsed;
    }
    return Math.max(0, availableBudgetSim);
  };

  const budgetAvailable = selectedOrigin ? getDynamicAvailableBudget(selectedOrigin) : 0;

  // Handle submit (Request or direct complete)
  const handleSubmit = (e: React.FormEvent, isDirectCompleted = false) => {
    e.preventDefault();
    const transferValue = parseFloat(amount);
    
    if (isNaN(transferValue) || transferValue <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }
    if (transferValue > budgetAvailable) {
      alert("La transferencia excede el saldo disponible del departamento de origen.");
      return;
    }
    if (!destinationId) {
      alert("Por favor elija un departamento de destino.");
      return;
    }
    if (destinationId === originId) {
      alert("El departamento de destino no puede ser igual al de origen.");
      return;
    }

    const destDept = departments.find(d => d.id === destinationId);
    
    // Status depends on whether director requested or treasurer processed directly
    const targetStatus = isDirectCompleted ? "Completada" : "Pendiente";

    // Create new transfer
    const newTx: Transfer = {
      id: "tr-" + (transfers.length + 10),
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      origin: selectedOrigin?.name || "Origen",
      originSub: isDirectCompleted ? "Acreditado Directo" : "Fondo Operativo",
      destination: destDept?.name || "Destino",
      destinationSub: "Traspaso de Saldo",
      amount: transferValue,
      status: targetStatus,
      reason: reason,
      acmsStatus: "Pendiente"
    };

    onAddTransfer(newTx);
    
    // If completed directly, update budgets immediately!
    if (isDirectCompleted) {
      onUpdateDeptBalance(originId, transferValue); // subtracted from origin
      onUpdateDeptBalance(destinationId, -transferValue); // added to destination
    }

    setLastTransferAmount(transferValue);
    setShowSuccess(true);
    
    // Reset Form
    setAmount("");
    setReason("");
    setShowDirectForm(false);
  };

  // List calculations
  const totalTransferredThisMonth = matchedTransfers
    .filter(t => t.status === "Completada")
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingCount = matchedTransfers.filter(t => t.status === "Pendiente").length;

  const filteredTransfers = matchedTransfers.filter(t => {
    if (filterState === "todos") return true;
    return t.status.toLowerCase() === filterState.toLowerCase();
  });

  // Action methods for treasurer
  const handleApprove = (tx: Transfer) => {
    if (!onUpdateTransferFields) return;

    // Apply balance update
    const origDept = departments.find(d => d.name === tx.origin);
    const destDept = departments.find(d => d.name === tx.destination);

    if (origDept && destDept) {
      // Validate budget
      const origAvailable = origDept.budgetAllocated - origDept.budgetUsed;
      if (tx.amount > origAvailable) {
        alert(`Advertencia: El departamento de origen "${tx.origin}" no posee saldo suficiente ($${origAvailable.toLocaleString("es-CL")}) para proceder.`);
        return;
      }
      onUpdateDeptBalance(origDept.id, tx.amount); // subtract
      onUpdateDeptBalance(destDept.id, -tx.amount); // add
    }

    onUpdateTransferFields(tx.id, { status: "Completada" });
    alert("✓ Transferencia aprobada con éxito. Los saldos de los correspondientes departamentos han sido modificados.");
  };

  const handleReject = (tx: Transfer) => {
    if (!onUpdateTransferFields) return;
    if (confirm(`¿Está seguro de rechazar esta solicitud de transferencia por $${tx.amount.toLocaleString("es-CL")}?`)) {
      onUpdateTransferFields(tx.id, { status: "Rechazada" });
    }
  };

  const handleOpenObserve = (tx: Transfer) => {
    setObservingTransfer(tx);
    setObservationInput("");
  };

  const submitObservation = () => {
    if (!observingTransfer || !onUpdateTransferFields || !observationInput.trim()) return;
    
    onUpdateTransferFields(observingTransfer.id, {
      status: "Observada",
      reason: `${observingTransfer.reason} (OBS: ${observationInput.trim()})`
    });
    setObservingTransfer(null);
    alert("La transferencia ha sido marcada como 'Observada' con el motivo.");
  };

  const handleOpenEdit = (tx: Transfer) => {
    const origDept = departments.find(d => d.name === tx.origin);
    const destDept = departments.find(d => d.name === tx.destination);

    setEditingTransfer(tx);
    setEditOriginId(origDept?.id || "");
    setEditDestinationId(destDept?.id || "");
    setEditAmount(tx.amount.toString());
    setEditReason(tx.reason);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransfer || !onUpdateTransferFields) return;

    const val = parseFloat(editAmount);
    if (isNaN(val) || val <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }

    const origDept = departments.find(d => d.id === editOriginId);
    const destDept = departments.find(d => d.id === editDestinationId);

    if (!origDept || !destDept) {
      alert("Por favor seleccione departamentos válidos.");
      return;
    }

    onUpdateTransferFields(editingTransfer.id, {
      origin: origDept.name,
      destination: destDept.name,
      amount: val,
      reason: editReason
    });

    setEditingTransfer(null);
    alert("La solicitud de transferencia ha sido editada con éxito.");
  };

  return (
    <div className="space-y-6" id="panel-transferencias">

      {/* Header */}
      <div className="border-b border-slate-100 pb-4 select-none">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
          <span>TESORERÍA GENERAL</span>
          <span>/</span>
          <span className="text-blue-600">
            {mode === "request" ? "SOLICITUD DE TRANSFERENCIAS" : "SISTEMA DE GESTIÓN Y AUDITORÍA"}
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight mt-1">
          {mode === "request" 
            ? "Solicitudes de Transferencia de Fondos" 
            : "Central de Conciliación y Aprobación de Fondos"}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {mode === "request"
            ? "Módulo oficial para que los Directores soliciten o realicen compensaciones presupuestarias entre ministerios."
            : "Panel administrativo interactivo para auditar, sancionar, observar, rechazar y liquidar traspasos presupuestarios."}
        </p>
      </div>

      {/* Treasurer Creator Banner */}
      {mode === "manage" && (
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-600" /> Operaciones Directas del Tesorero
            </h3>
            <p className="text-xxs text-slate-500 font-medium">
              ¿Deseas realizar o asentar un ajuste de presupuesto directo de manera autoritativa sin pasar por aprobación?
            </p>
          </div>
          <button
            onClick={() => setShowDirectForm(!showDirectForm)}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all rounded-xl shadow-sm cursor-pointer shrink-0"
          >
            {showDirectForm ? "Cerrar Formulario" : "Generar Transferencia Directa"}
          </button>
        </div>
      )}

      {/* Treasurer Collapsible Form or Regular Request Form Container */}
      <AnimatePresence>
        {((mode === "request") || (mode === "manage" && showDirectForm)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5">
              <div className="flex items-center gap-3 select-none">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Landmark className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                    {mode === "manage" ? "Registrar Ajuste / Traspaso Directo" : "Presentar Nueva Solicitud Traspaso"}
                  </h3>
                  <p className="text-xxs text-slate-500 font-semibold">
                    {mode === "manage" ? "Afecta saldos de forma inmediata respetando contabilidad oficial" : "Enviará una solicitud que deberá ser sancionada por la mesa de junta"}
                  </p>
                </div>
              </div>

              {/* Form nested */}
              <form onSubmit={(e) => handleSubmit(e, mode === "manage")} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Department origin */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Departamento Origen</label>
                  <div className="relative">
                    <select
                      value={originId}
                      onChange={(e) => setOriginId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none cursor-pointer focus:bg-white focus:ring-1 focus:ring-blue-600"
                    >
                      {finalOriginDepts.map((d) => {
                        const realAvail = getDynamicAvailableBudget(d);
                        return (
                          <option key={d.id} value={d.id}>
                            {d.name} (${realAvail.toLocaleString("es-CL")} disp.)
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Destination */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Departamento Destino</label>
                  <div className="relative">
                    <select
                      value={destinationId}
                      onChange={(e) => setDestinationId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none cursor-pointer focus:bg-white focus:ring-1 focus:ring-blue-600"
                      required
                    >
                      <option value="">Seleccione destino...</option>
                      {departments.filter(d => d.id !== originId).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block font-sans">Monto a Transferir ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Motivo / Justificación</label>
                  <input
                    type="text"
                    placeholder="Escriba la razón de este cambio..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* Button */}
                <div className="col-span-1 md:col-span-2">
                  <button
                    type="submit"
                    className="w-full text-center h-10 rounded-xl font-black text-xxs uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow transition-all cursor-pointer"
                  >
                    {mode === "manage" ? "Registrar Directo" : "Enviar Solicitud"}
                  </button>
                </div>
              </form>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Bento stats row / Full width or top depending on mode */}
        <div className="lg:col-span-12 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none">Monto Traspasado (Aprobado)</p>
                <p className="text-lg font-black font-mono text-slate-900 mt-1">
                  $ {totalTransferredThisMonth.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <History className="w-5 h-5 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none">Traspasos Pendientes de Voto</p>
                <p className="text-lg font-black font-sans text-slate-900 mt-1">
                  {pendingCount < 10 ? `0${pendingCount}` : pendingCount} Solicitudes
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none">Presupuesto Registrado</p>
                <p className="text-lg font-black font-sans text-slate-900 mt-1">
                  Activo Contable Real
                </p>
              </div>
            </div>

          </div>

          {/* Transfers Table List and search/filter controls */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 select-none">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Libro Auxiliar de Traspasos Internos</h3>
              
              {/* Table filtering */}
              <div className="flex items-center gap-1.5 bg-slate-200/60 rounded-xl p-1 w-fit border border-slate-350">
                {["Todos", "Pendiente", "Completada", "Observada", "Rechazada"].map((st) => (
                  <button 
                    key={st}
                    onClick={() => setFilterState(st === "Todos" ? "todos" : st)}
                    className={`px-3 py-1 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                      filterState.toLowerCase() === (st === "Todos" ? "todos" : st).toLowerCase()
                        ? "bg-white text-slate-900 shadow-sm font-black" 
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {st === "Completada" ? "Completos" : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3">Fecha / ID</th>
                    <th className="px-5 py-3">Departamento Emisor (Origen)</th>
                    <th className="px-5 py-3">Departamento Receptor (Destino)</th>
                    <th className="px-5 py-3 text-right">Importe</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-center">Detalle / Comentario</th>
                    {mode === "manage" && <th className="px-5 py-3 text-right">Sanción Auditora (Acciones)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTransfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 block">{tx.date}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{tx.id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-black text-slate-900 block">{tx.origin}</span>
                        <span className="text-[9px] bg-indigo-50/80 text-indigo-800 border border-indigo-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mt-1 inline-block">{tx.originSub}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-black text-slate-900 block">{tx.destination}</span>
                        <span className="text-[9px] bg-emerald-50/80 text-emerald-800 border border-emerald-150 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mt-1 inline-block">{tx.destinationSub}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black text-slate-900 text-sm">
                        $ {tx.amount.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          tx.status === "Completada" 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : tx.status === "Pendiente" 
                            ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                            : tx.status === "Observada"
                            ? "bg-sky-100 text-sky-800 border border-sky-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            tx.status === "Completada" ? "bg-emerald-500" : tx.status === "Pendiente" ? "bg-amber-500" : tx.status === "Observada" ? "bg-sky-500" : "bg-rose-500"
                          }`}></span>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600 max-w-[200px]">
                        <p className="line-clamp-2" title={tx.reason}>{tx.reason}</p>
                      </td>
                      
                      {/* ACTION COLUMN FOR TREASURER CONTROL */}
                      {mode === "manage" && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {tx.status === "Pendiente" && (
                              <>
                                <button
                                  onClick={() => handleApprove(tx)}
                                  className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 hover:text-emerald-850 cursor-pointer transition-all"
                                  title="Aprobar Traspaso de Fondos"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenObserve(tx)}
                                  className="p-1.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-700 hover:bg-sky-100 hover:text-sky-850 cursor-pointer transition-all"
                                  title="Observar Solicitud de Traspaso"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReject(tx)}
                                  className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-100 hover:text-rose-850 cursor-pointer transition-all"
                                  title="Rechazar Traspaso"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer transition-all"
                              title="Editar Detalle de Traspaso"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* ACMS Link status */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateTransferFields) {
                                  const nextStatus = (tx.acmsStatus || "Pendiente") === "Pendiente" ? "Ingresado" : "Pendiente";
                                  onUpdateTransferFields(tx.id, { acmsStatus: nextStatus });
                                }
                              }}
                              className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border transition-all ${
                                tx.acmsStatus === "Ingresado"
                                  ? "bg-purple-150 text-[#301934] border-purple-300"
                                  : "bg-slate-100 hover:bg-slate-205 text-slate-700 border-slate-200"
                              }`}
                              title="Cambiar estado en planilla central ACMS"
                            >
                              ACMS: {tx.acmsStatus || "Pendiente"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan={mode === "manage" ? 7 : 6} className="text-center p-12 text-slate-400 font-bold">
                        No se encontraron transferencias con este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </section>

        </div>

      </div>

      {/* Observation Modal */}
      <AnimatePresence>
        {observingTransfer && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setObservingTransfer(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl z-20 space-y-4"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Observar Solicitud de Fondos</h4>
                <p className="text-[11px] text-slate-500 font-medium">Escriba una anotación o instrucción aclaratoria para el director que rinde: ({observingTransfer.id})</p>
              </div>
              <textarea
                value={observationInput}
                onChange={(e) => setObservationInput(e.target.value)}
                rows={3}
                placeholder="Indique qué comprobante o justificación falta..."
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
                required
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setObservingTransfer(null)}
                  className="flex-1 h-10 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-black uppercase tracking-wider text-xxs transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitObservation}
                  disabled={!observationInput.trim()}
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black uppercase tracking-wider text-xxs transition-all disabled:opacity-50"
                >
                  Guardar Observación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editing Modal */}
      <AnimatePresence>
        {editingTransfer && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setEditingTransfer(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl p-6 max-w-xl w-full border border-slate-200 shadow-2xl z-20 space-y-4"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">Editar Solicitud de Traspaso Presupuestario</h4>
                <p className="text-[11px] text-slate-500 font-semibold">Corrija montos o destinos antes de procesar el libro contable ordinario o registrar la transferencia.</p>
              </div>

              <form onSubmit={submitEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 uppercase">Origen</label>
                    <div className="relative">
                      <select
                        value={editOriginId}
                        onChange={(e) => setEditOriginId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 uppercase">Destino</label>
                    <div className="relative">
                      <select
                        value={editDestinationId}
                        onChange={(e) => setEditDestinationId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-900 outline-none"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase">Monto ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-950 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase">Justificación</label>
                    <input
                      type="text"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-950 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTransfer(null)}
                    className="flex-1 h-10 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-black uppercase tracking-wider text-xxs transition-all"
                  >
                    Salir sin guardar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-wider text-xxs transition-all"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs"
              onClick={() => setShowSuccess(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-2xl flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 shadow-inner text-emerald-600 animate-bounce">
                <CheckCircle2 className="w-10 h-10 shrink-0" />
              </div>
              
              <h4 className="text-lg font-black text-slate-950 mb-2 uppercase tracking-wide">¡Procesado Exitosomente!</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                La transferencia de fondos por valor de <span className="font-extrabold text-blue-600">${lastTransferAmount.toLocaleString("es-CL")}</span> se ha asentado exitosamente en el registro contable maestro.
              </p>
              
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full h-11 bg-slate-950 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xxs rounded-xl transition-all shadow cursor-pointer"
              >
                Cerrar Notificación
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
