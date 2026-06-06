/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BankAccount, BankTransaction, User } from "../types";
import { 
  Landmark, DollarSign, Plus, Trash2, History, TrendingUp, TrendingDown, 
  HelpCircle, Calendar, AlertCircle, Edit, Check, X, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConciliacionBancariaViewProps {
  currentUser: User;
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
  onAddBankTransaction: (tx: BankTransaction) => void;
  onDeleteBankTransaction: (txId: string) => void;
}

export const ConciliacionBancariaView: React.FC<ConciliacionBancariaViewProps> = ({
  currentUser,
  bankAccounts,
  bankTransactions,
  onUpdateBankAccounts,
  onAddBankTransaction,
  onDeleteBankTransaction
}) => {
  // Local state for the new transaction form
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<"Ingreso" | "Gasto">("Ingreso");
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || "ba-1");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Diezmos");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Editing direct balances states
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const isTesoreroOAsistente = currentUser.roles.some(r => 
    r.toLowerCase().includes("tesorero") || 
    r.toLowerCase().includes("asistente")
  );

  const handleStartEdit = (b: BankAccount) => {
    if (!isTesoreroOAsistente) return;
    setEditingBankId(b.id);
    setEditVal(b.balance.toString());
  };

  const handleSaveEdit = (id: string) => {
    const numeric = parseInt(editVal);
    if (!isNaN(numeric) && numeric >= 0) {
      const updated = bankAccounts.map(b => b.id === id ? { ...b, balance: numeric } : b);
      onUpdateBankAccounts(updated);
    }
    setEditingBankId(null);
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }
    if (!description.trim()) {
      alert("Por favor ingrese una descripción.");
      return;
    }

    const newTx: BankTransaction = {
      id: "bt-" + Date.now(),
      date,
      type,
      bankId,
      amount: parsedAmount,
      description: description.trim(),
      category: category
    };

    onAddBankTransaction(newTx);

    // Update bank balance accordingly
    const targetAccount = bankAccounts.find(b => b.id === bankId);
    if (targetAccount) {
      const balanceOffset = type === "Ingreso" ? parsedAmount : -parsedAmount;
      const updated = bankAccounts.map(b => 
        b.id === bankId 
          ? { ...b, balance: Math.max(0, b.balance + balanceOffset) } 
          : b
      );
      onUpdateBankAccounts(updated);
    }

    // Reset Form
    setAmount("");
    setDescription("");
    setShowAddForm(false);
  };

  const handleDelete = (txId: string) => {
    // Revert the balance change before deleting
    const tx = bankTransactions.find(t => t.id === txId);
    if (tx) {
      const targetAccount = bankAccounts.find(b => b.id === tx.bankId);
      if (targetAccount) {
        // if was "Ingreso", deleting it decreases balance. if was "Gasto", deleting increases balance.
        const balanceOffset = tx.type === "Ingreso" ? -tx.amount : tx.amount;
        const updated = bankAccounts.map(b => 
          b.id === tx.bankId 
            ? { ...b, balance: Math.max(0, b.balance + balanceOffset) } 
            : b
        );
        onUpdateBankAccounts(updated);
      }
    }
    onDeleteBankTransaction(txId);
  };

  const totalSumOfBanks = bankAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-2xl font-black text-[#1552a6] font-sans">Control de Cuentas Bancarias y Caja</h2>
          <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">
            Gestión de Saldos, Ingresos y Gastos de Tesorería General
          </p>
        </div>

        {isTesoreroOAsistente && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-[#1552a6] text-white rounded-xl text-xs font-bold hover:bg-[#114285] transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {showAddForm ? "Cerrar Formulario" : "Registrar Flujo Bancario"}
          </button>
        )}
      </div>

      {/* Main Alert Info */}
      <div className="bg-[#eef4fc] border border-[#1552a6]/15 rounded-2xl p-4.5 flex gap-3.5 items-start">
        <ShieldCheck className="w-6 h-6 text-[#1552a6] shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-black text-[#1552a6] uppercase tracking-wide">Conciliación Activa del Tesorero</p>
          <p className="text-xs text-slate-700 font-semibold leading-relaxed">
            La <strong className="text-[#1552a6] font-extrabold">Caja Fija</strong> se calcula de manera automatizada y transparente basándose en la <strong className="font-extrabold">Suma de los saldos bancarios activos</strong>. Puede simular y ajustar cada saldo directamente haciendo clic sobre el monto de la cuenta respectiva.
          </p>
        </div>
      </div>

      {/* Grid of Balances & Caja Fija calculation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Banco Itaú Card */}
        {bankAccounts.map((b) => {
          const isEditing = editingBankId === b.id;
          return (
            <div 
              key={b.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/95 shadow-sm hover:border-[#1552a6]/25 transition-all flex flex-col justify-between min-h-[140px] relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{b.name}</span>
                <Landmark className="w-5 h-5 text-slate-300" />
              </div>

              <div className="my-3">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold text-lg">$</span>
                    <input 
                      type="number"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-base font-black font-mono text-slate-800 outline-none focus:border-[#1552a6]"
                      autoFocus
                    />
                    <button 
                      onClick={() => handleSaveEdit(b.id)}
                      className="p-1 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEditingBankId(null)}
                      className="p-1 text-red-500 bg-red-50 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => handleStartEdit(b)}
                    className={`flex items-baseline gap-1 cursor-pointer group ${isTesoreroOAsistente ? "hover:text-[#1552a6]" : ""}`}
                    title={isTesoreroOAsistente ? "Haga clic para editar el saldo" : ""}
                  >
                    <span className="text-2xl font-black text-slate-800 tracking-tight font-sans">
                      ${b.balance.toLocaleString("es-CL")}
                    </span>
                    {isTesoreroOAsistente && (
                      <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5" />
                    )}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <span>Estado:</span>
                <span className="text-emerald-600 font-bold uppercase tracking-widest">• Activo y Sincronizado</span>
              </div>
            </div>
          );
        })}

        {/* Caja Fija (Suma of everything) */}
        <div className="bg-[#1552a6] p-5 rounded-2xl border border-blue-900/10 shadow-md text-white flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8 pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-blue-200 font-black uppercase tracking-widest">Caja Fija (Suma de Cuentas)</span>
            <DollarSign className="w-5 h-5 text-blue-200" />
          </div>

          <div className="my-3">
            <h4 className="text-3xl font-black tracking-tight font-sans">
              ${totalSumOfBanks.toLocaleString("es-CL")}
            </h4>
            <p className="text-[9px] text-blue-200/90 font-semibold mt-1">
              Fórmula: Itaú (${(bankAccounts.find(b=>b.id==="ba-1")?.balance || 0).toLocaleString("es-CL")}) + Falabella (${(bankAccounts.find(b=>b.id==="ba-2")?.balance || 0).toLocaleString("es-CL")})
            </p>
          </div>

          <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span>Suma de los bancos</span>
          </div>
        </div>

      </div>

      {/* Add movement Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
          >
            <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#1552a6]" />
              Nuevo Registro de Flujo en Banco
            </h3>

            <form onSubmit={handleCreateTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Type: Ingreso / Gasto */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setType("Ingreso")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      type === "Ingreso" 
                        ? "bg-emerald-500 text-white shadow-sm" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Ingreso (+)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType("Gasto")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      type === "Gasto" 
                        ? "bg-red-500 text-white shadow-sm" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Gasto (-)
                  </button>
                </div>
              </div>

              {/* Bank Account Selection */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Cuenta de Destino/Origen</label>
                <select 
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1552a6]"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Monto ($ CLP)</label>
                <input 
                  type="number"
                  placeholder="Ej: 150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold font-mono text-slate-850 outline-none focus:border-[#1552a6]"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Concepto / Glosa de transacción</label>
                <input 
                  type="text"
                  placeholder="Ej: Depósito de diezmos o reparación de ventanas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-705 outline-none focus:border-[#1552a6]"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#1552a6]"
                >
                  <option value="Diezmos">Diezmos</option>
                  <option value="Ofrendas">Ofrendas de Culto</option>
                  <option value="Presupuesto de Actividad">Presupuesto de Actividad</option>
                  <option value="Aseo y Mantenimiento">Aseo y Mantenimiento</option>
                  <option value="Remuneraciones">Materiales e Impresiones</option>
                  <option value="Otros">Gastos Varios</option>
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Fecha de Registro</label>
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-705 outline-none focus:border-[#1552a6]"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="md:col-span-2 flex items-end justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm"
                >
                  Confirmar Registro
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History of Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1552a6]" />
            <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">Historial de Operaciones de Caja</h3>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2.5 py-0.5 rounded-full">
            {bankTransactions.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead className="bg-[#fcfdfe] text-[9px] text-slate-400 uppercase tracking-wider font-black border-b border-slate-100 select-none">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Cuenta Bancaria</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Glosa / Concepto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-right">Monto</th>
                {isTesoreroOAsistente && <th className="px-5 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
              {bankTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-bold">
                    No se han registrado transacciones bancarias o de caja.
                  </td>
                </tr>
              ) : (
                bankTransactions.map((tx) => {
                  const targetBank = bankAccounts.find(b => b.id === tx.bankId);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-3 text-slate-500">{tx.date}</td>
                      <td className="px-5 py-3">
                        <span className="text-[#1552a6] font-bold">{targetBank?.name || "Banco Desconocido"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          tx.type === "Ingreso" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-red-50 text-red-500 border border-red-100"
                        }`}>
                          {tx.type === "Ingreso" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-xs truncate text-[11px] font-bold text-slate-800" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{tx.category}</td>
                      <td className="px-5 py-3 text-right font-mono font-extrabold text-slate-900">
                        ${tx.amount.toLocaleString("es-CL")}
                      </td>
                      {isTesoreroOAsistente && (
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded bg-slate-100 hover:bg-neutral-100 transition-colors"
                            title="Eliminar este movimiento y deshacer su impacto en el saldo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
