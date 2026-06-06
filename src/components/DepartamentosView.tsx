/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Department, User, Cargo, BankTransaction, FundRequest } from "../types";
import { 
  FolderGit2, Plus, Search, DollarSign, ArrowUpRight, 
  Trash2, Edit3, Check, X, ShieldCheck, ChevronRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DepartamentosProps {
  departments: Department[];
  onCreateDepartment: (dept: Department) => void;
  onAdjustBudget: (id: string, amount: number) => void;
  onUpdateDepartment?: (dept: Department) => void;
  currentUser?: User;
  mode?: "view" | "edit";
  cargos?: Cargo[];
  categories?: string[];
  categoryColors?: Record<string, string>;
  bankTransactions?: BankTransaction[];
  fundRequests?: FundRequest[];
}

export const DepartamentosView: React.FC<DepartamentosProps> = ({
  departments,
  onCreateDepartment,
  onAdjustBudget,
  onUpdateDepartment,
  currentUser,
  mode = "view",
  cargos = [],
  categories = ["Administración", "Sociedad de Jóvenes", "Cursos y Materiales", "Recursos y Proyectos", "Ahorros Cuenta A", "Escuela Sabática Pequeños", "Actividades de Aventureros"],
  categoryColors = {},
  bankTransactions = [],
  fundRequests = []
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeDeptId, setActiveDeptId] = useState("");
  const [showAllDepts, setShowAllDepts] = useState(true);

  // Determine if the user is a global administrative officer/auditor
  const isGlobalManager = (currentUser?.roles.some(r => 
    r.toLowerCase().includes("tesorero central") || 
    r.toLowerCase().includes("pastor") || 
    r.toLowerCase().includes("anciano") ||
    r.toLowerCase().includes("secretar") ||
    r.toLowerCase().includes("asistente")
  ) || (currentUser && currentUser.roles.some(roleName => {
    const matchedCargo = cargos.find(c => c.name.toLowerCase() === roleName.toLowerCase());
    return matchedCargo?.permissions.includes("ver_todos_departamentos");
  }))) ?? true;

  // Filter departments (funds) related to the user's assigned departments (formerly categories)
  const matchedDepts = (isGlobalManager && showAllDepts) 
    ? departments 
    : departments.filter(d => currentUser?.departments.includes(d.category));

  // --- NEW FUND STATE ---
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState(categories[0] || "Administración");
  const [newAllocated, setNewAllocated] = useState(""); // Representing tope/budgetAllocated
  const [newAssignedPercentage, setNewAssignedPercentage] = useState("10");
  const [newInitialBudget, setNewInitialBudget] = useState("");

  // --- EDIT FUND STATE ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDeptId, setEditDeptId] = useState("");
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCategory, setEditCategory] = useState(categories[0] || "Administración");
  const [editAssignedPercentage, setEditAssignedPercentage] = useState("");
  const [editTope, setEditTope] = useState("");
  const [editInitialBudget, setEditInitialBudget] = useState("");
  const [editDirector, setEditDirector] = useState("");

  // Filter depts
  const filteredDepts = matchedDepts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.director.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetVal = parseFloat(newAllocated);
    const initialVal = parseFloat(newInitialBudget || newAllocated);
    const assignedPctVal = parseFloat(newAssignedPercentage || "10");

    if (!newName || !newCode || isNaN(budgetVal) || budgetVal <= 0) {
      alert("Por favor rellene los campos y el tope con un valor correcto.");
      return;
    }

    const newDeptObj: Department = {
      id: "dep-" + (departments.length + 1),
      name: newName,
      code: newCode.toUpperCase(),
      category: newCategory,
      director: "Sin Asignar", // Se asocia desde la gestión de usuarios
      tesorero: "Ricardo Salas",
      budgetAllocated: budgetVal,
      budgetUsed: 0,
      percentageUsed: 0,
      assignedPercentage: assignedPctVal,
      initialBudget: initialVal
    };

    onCreateDepartment(newDeptObj);
    alert(`¡Fondo de Tesorería "${newName}" registrado con éxito!`);
    
    // Reset Form
    setNewName("");
    setNewCode("");
    setNewAllocated("");
    setNewAssignedPercentage("10");
    setNewInitialBudget("");
    setShowCreateModal(false);
  };

  const handleOpenEdit = (d: Department) => {
    setEditDeptId(d.id);
    setEditName(d.name);
    setEditCode(d.code);
    setEditCategory(d.category || "Sociedad");
    setEditAssignedPercentage(d.assignedPercentage !== undefined ? String(d.assignedPercentage) : "10");
    setEditTope(String(d.budgetAllocated));
    setEditInitialBudget(d.initialBudget !== undefined ? String(d.initialBudget) : String(d.budgetAllocated));
    setEditDirector(d.director || "Sin Asignar");
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const topeVal = parseFloat(editTope);
    const initBudgetVal = parseFloat(editInitialBudget);
    const pctVal = parseFloat(editAssignedPercentage);

    if (!editName || !editCode || isNaN(topeVal) || isNaN(initBudgetVal) || isNaN(pctVal)) {
      alert("Por favor rellene todos los campos con valores correctos.");
      return;
    }

    if (onUpdateDepartment) {
      const orig = departments.find(d => d.id === editDeptId);
      if (orig) {
        const ratio = Math.round((orig.budgetUsed / topeVal) * 100);
        onUpdateDepartment({
          ...orig,
          name: editName,
          code: editCode.toUpperCase(),
          category: editCategory,
          assignedPercentage: pctVal,
          budgetAllocated: topeVal,
          initialBudget: initBudgetVal,
          percentageUsed: ratio
        });
        alert(`¡Fondo de Tesorería "${editName}" actualizado con éxito!`);
        setShowEditModal(false);
      }
    } else {
      onAdjustBudget(editDeptId, topeVal - (departments.find(d => d.id === editDeptId)?.budgetAllocated || 0));
      setShowEditModal(false);
    }
  };

  const totalAllocatedSum = matchedDepts.reduce((acc, d) => acc + d.budgetAllocated, 0);
  const totalUsedSum = matchedDepts.reduce((acc, d) => acc + d.budgetUsed, 0);

  return (
    <div className="space-y-6 text-left">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>ADMINISTRACIÓN</span>
            <span>/</span>
            <span className="text-secondary font-bold">FONDOS DE TESORERÍA</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-bold text-primary">
              {mode === "view" ? "Planilla de Fondos de Tesorería" : "Gestión de Fondos de Tesorería (Edición)"}
            </h1>
            {(!isGlobalManager || mode === "view") && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-tertiary/10 text-tertiary">
                VISTA SOLO LECTURA
              </span>
            )}
          </div>
        </div>

        {/* Create button (Strictly for administrators in edit mode) */}
        {isGlobalManager && mode === "edit" && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow select-none"
          >
            <Plus className="w-4 h-4" /> Registrar Fondo
          </button>
        )}
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
        
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-container/40 flex items-center justify-center text-primary">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider">Fondos Registrados</p>
            <p className="text-2xl font-black text-primary font-sans mt-0.5">0{departments.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider">Presupuesto Total Iglesia</p>
            <p className="text-2xl font-black text-primary font-mono mt-0.5">${totalAllocatedSum.toLocaleString("es-CL")}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-wider">Presupuesto Utilizado Total</p>
            <p className="text-2xl font-black text-primary font-mono mt-0.5">${totalUsedSum.toLocaleString("es-CL")}</p>
          </div>
        </div>

      </div>

      {/* Dynamic toggle list restriction for Managers (Pastor, Primer Anciano, Tesorero, Secretaria, Ancianos, Tesorero Asistente) */}
      {isGlobalManager && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-[#eef4fc]/45 border border-[#1552a6]/10 shadow-sm select-none gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1552a6] shrink-0" />
            <div>
              <p className="text-xs font-black text-[#1552a6] tracking-wide leading-none">Acceso Oficial de Todos los Departamentos</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">Como rol directivo oficial, puedes alternar el alcance visual para auditar todos los fondos.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-bold shrink-0">
            <button 
              type="button"
              onClick={() => setShowAllDepts(true)}
              className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider border cursor-pointer transition-all ${
                showAllDepts 
                  ? "bg-[#1552a6] text-white border-[#1552a6]" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Todos los Fondos
            </button>
            <button 
              type="button"
              onClick={() => setShowAllDepts(false)}
              className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider border cursor-pointer transition-all ${
                !showAllDepts 
                  ? "bg-[#1552a6] text-white border-[#1552a6]" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Solo Mis Asignados ({currentUser?.departments?.length || 0})
            </button>
          </div>
        </div>
      )}

      {/* Search Filter input on depts lists */}
      <div className="relative select-all">
        <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Filtrar por nombre, siglas, departamento (grupo) o director del fondo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 h-12 rounded-xl border border-outline-variant/80 bg-white text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all font-medium"
        />
      </div>

      {/* Grid rendering Cards list */}
      <section className="flex flex-col gap-4">
        {filteredDepts.map((d) => {
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

          // Calculate department outstanding (pending) advances (fondos por rendir)
          const pendingAdvances = fundRequests
            .filter(r => r.department === d.name && r.status === "Aprobada" && r.cerrado !== true)
            .reduce((sum, r) => sum + r.amount, 0);

          // Total fund budget of the department (Presupuesto inicial + Ingresos - Adelantos pendientes)
          const totalPresupuestoFondo = departInitial + incomesSum - pendingAdvances;
          const topeMensual = d.budgetAllocated;

          // Dynamic budget of the fund according to incomes, expenses, and pending advances
          const dynamicFundBudget = departInitial + incomesSum - d.budgetUsed - pendingAdvances;

          // "si el monto del presupuesto del departamento es mayor al tope mensual lo 'disponible' es el tope mensual y si es menor al tope mensual lo 'disponible' es el presupuesto"
          // We subtract d.budgetUsed to find the remaining available portion for both cases.
          let availBudgetSim = 0;
          if (totalPresupuestoFondo > topeMensual) {
            availBudgetSim = topeMensual - d.budgetUsed;
          } else {
            availBudgetSim = totalPresupuestoFondo - d.budgetUsed;
          }
          availBudgetSim = Math.max(0, availBudgetSim);

          const deptColor = categoryColors[d.category] || "#2563eb";
          
          return (
            <div 
              key={d.id} 
              className="bg-white rounded-2xl border border-outline-variant/65 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-all gap-6 relative overflow-hidden"
            >
              {/* Left-Accent Color bar corresponding to Department */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5" 
                style={{ backgroundColor: deptColor }}
              />

              {/* Badge representing Category */}
              <div 
                className="absolute top-0 right-0 p-1 px-4 text-[9px] font-black uppercase tracking-widest rounded-bl-xl select-none" 
                title="Departamento (Grupo)"
                style={{ 
                  backgroundColor: `${deptColor}15`,
                  color: deptColor,
                  borderLeft: `1px solid ${deptColor}15`,
                  borderBottom: `1px solid ${deptColor}15`
                }}
              >
                {d.category || "General"}
              </div>

              {/* Info text section */}
              <div className="flex-1 min-w-[200px] space-y-2">
                <div>
                  <span className="text-[10px] font-black font-mono text-secondary uppercase tracking-widest">{d.code}</span>
                  <h4 className="text-base font-black text-primary leading-tight mt-0.5">{d.name}</h4>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Líder: <span className="font-bold text-primary">{d.director}</span>
                  </p>
                </div>
                
                {/* Additional Attributes Grid */}
                <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant font-medium select-none">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-outline block">Porcentaje Asig.</span>
                    <span className="font-bold text-primary font-mono">{d.assignedPercentage ?? 10}%</span>
                  </div>
                  <div className="border-l border-outline-variant/30 pl-4">
                    <span className="text-[9px] uppercase font-bold text-outline block">Presupuesto Inicial</span>
                    <span className="font-bold text-primary font-mono">${departInitial.toLocaleString("es-CL")}</span>
                  </div>
                  <div className="border-l border-outline-variant/30 pl-4">
                    <span className="text-[9px] uppercase font-bold text-outline block" title="Suma de Presupuesto Inicial + Ingresos - Egresos - Fondos por Rendir">Presupuesto del Fondo</span>
                    <span className="font-bold text-[#1552a6] font-mono">${dynamicFundBudget.toLocaleString("es-CL")}</span>
                  </div>
                </div>
              </div>

              {/* Progress and budget bar state ratio */}
              <div className="flex-1 min-w-[250px] space-y-1.5 self-center select-none mt-2 md:mt-0">
                <div className="flex justify-between items-baseline text-xs font-semibold">
                  <span className="text-on-surface-variant">Ejecutado:</span>
                  <span className="text-primary font-mono">${d.budgetUsed.toLocaleString("es-CL")} / <span className="text-outline font-normal">Tope ${d.budgetAllocated.toLocaleString("es-CL")}</span></span>
                </div>
                <div className="w-full bg-[#f1f4f7] h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(d.percentageUsed, 100)}%`,
                      backgroundColor: deptColor
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-outline font-semibold">
                  <span>{d.percentageUsed}% utilizado</span>
                  <span className="font-black" style={{ color: deptColor }}>Disponible: ${availBudgetSim.toLocaleString("es-CL")}</span>
                </div>
              </div>

              {/* Card button triggers */}
              <div className="flex shrink-0 w-full md:w-32 items-center justify-end select-none border-t md:border-t-0 border-outline-variant/15 pt-4 md:pt-0 mt-2 md:mt-0">
                {isGlobalManager && mode === "edit" ? (
                  <button 
                    onClick={() => handleOpenEdit(d)}
                    className="w-full py-2 border border-outline-variant/60 rounded-lg hover:bg-surface-container-low font-bold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-[10px] text-outline font-bold flex items-center justify-center gap-1 bg-surface-container-low rounded-lg text-primary select-none">
                    <ShieldCheck className="w-3.5 h-3.5 text-tertiary shrink-0" /> Solo Lectura
                  </div>
                )}
              </div>

            </div>
          );
        })}
        {filteredDepts.length === 0 && (
          <p className="text-center p-12 text-on-surface-variant font-medium">No se encontraron fondos de tesorería con el criterio especificado.</p>
        )}
      </section>

      {/* POPUP MODAL: CREATE DEPARTMENT */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-outline-variant/40 z-10 block text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="w-5 h-5 text-secondary shrink-0" /> Registrar Fondo de Tesorería
                </h4>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Fondo</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Fondo Operaciones"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold" 
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Siglas / Código</label>
                    <input 
                      type="text" 
                      placeholder="e.g. FORD_OP"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none uppercase font-mono font-bold" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Departamento (Grupo)</label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-semibold cursor-pointer"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Porcentaje Asignado (%)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15"
                      min="0"
                      max="100"
                      value={newAssignedPercentage}
                      onChange={(e) => setNewAssignedPercentage(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold font-mono text-primary" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Presupuesto Inicial ($)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50000"
                      value={newInitialBudget}
                      onChange={(e) => setNewInitialBudget(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold font-mono text-primary" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Tope / Límite de Gasto ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50000"
                    value={newAllocated}
                    onChange={(e) => setNewAllocated(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-black text-primary font-mono" 
                    required
                  />
                </div>

                <div className="p-3 bg-[#f8fafc] border border-outline-variant/30 rounded-lg text-[11px] text-on-surface-variant font-medium">
                  💡 <span className="font-bold text-primary">Nota sobre el Director:</span> El Director se asigna y vincula directamente desde el panel de <span className="font-semibold text-primary">Gestión de Usuarios</span> para optimizar la seguridad e integridad de roles.
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow-md select-none mt-2"
                >
                  Registrar Fondo de Tesorería
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: EDIT DEPARTMENT ATTRIBUTES */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-outline-variant/40 z-10 block text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-5 h-5 text-secondary shrink-0" /> Editar Fondo de Tesorería
                </h4>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Fondo</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Fondo Operaciones"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold" 
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Siglas / Código</label>
                    <input 
                      type="text" 
                      placeholder="e.g. FORD_OP"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none uppercase font-mono font-bold" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Departamento (Grupo)</label>
                    <select 
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-semibold cursor-pointer"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Porcentaje Asignado (%)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 15"
                      min="0"
                      max="100"
                      value={editAssignedPercentage}
                      onChange={(e) => setEditAssignedPercentage(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold font-mono text-primary" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Presupuesto Inicial ($)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50000"
                      value={editInitialBudget}
                      onChange={(e) => setEditInitialBudget(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold font-mono text-primary" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Tope / Límite de Gasto ($)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50000"
                    value={editTope}
                    onChange={(e) => setEditTope(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-black text-primary font-mono" 
                    required
                  />
                </div>

                <div className="p-3 bg-secondary-fixed/30 border border-secondary/15 rounded-lg text-[11px] text-on-surface-variant space-y-1 select-none">
                  <div className="flex gap-1.5 items-center font-bold text-primary">
                    <ShieldCheck className="w-3.5 h-3.5 text-secondary" /> Director Responsable
                  </div>
                  <p className="text-on-surface">Director actual: <span className="font-extrabold text-primary">{editDirector}</span></p>
                  <p className="text-[10px] text-outline leading-tight mt-0.5">⚠️ El director se asocia exclusivamente desde la pestaña de <b>Gestión de Usuarios</b> al asignar departamentos en el panel de perfiles.</p>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow-md select-none mt-2"
                >
                  Guardar Cambios
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
