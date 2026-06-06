/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash2, Edit3, Check, X, SlidersHorizontal, Sliders, Landmark, FileText, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GestionListasProps {
  expenseCategories: string[];
  bankList: string[];
  documentTypes: string[];
  onUpdateExpenseCategories: (newList: string[]) => void;
  onUpdateBankList: (newList: string[]) => void;
  onUpdateDocumentTypes: (newList: string[]) => void;
}

export const GestionListasConfig: React.FC<GestionListasProps> = ({
  expenseCategories,
  bankList,
  documentTypes,
  onUpdateExpenseCategories,
  onUpdateBankList,
  onUpdateDocumentTypes,
}) => {
  // Input states for adding new options
  const [newCategory, setNewCategory] = useState("");
  const [newBank, setNewBank] = useState("");
  const [newDocType, setNewDocType] = useState("");

  // Edit states
  const [editCategoryIndex, setEditCategoryIndex] = useState<number | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");

  const [editBankIndex, setEditBankIndex] = useState<number | null>(null);
  const [editBankValue, setEditBankValue] = useState("");

  const [editDocIndex, setEditDocIndex] = useState<number | null>(null);
  const [editDocValue, setEditDocValue] = useState("");

  // Category Add
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategory.trim();
    if (!clean) return;
    if (expenseCategories.includes(clean)) {
      alert("Esta categoría de gasto ya existe.");
      return;
    }
    onUpdateExpenseCategories([...expenseCategories, clean]);
    setNewCategory("");
  };

  // Category Edit Save
  const handleSaveCategory = (index: number) => {
    const clean = editCategoryValue.trim();
    if (!clean) return;
    if (expenseCategories.includes(clean) && expenseCategories.indexOf(clean) !== index) {
      alert("Esta categoría ya existe.");
      return;
    }
    const updated = [...expenseCategories];
    updated[index] = clean;
    onUpdateExpenseCategories(updated);
    setEditCategoryIndex(null);
  };

  // Category Delete
  const handleDeleteCategory = (index: number) => {
    if (confirm(`¿Estás seguro de eliminar "${expenseCategories[index]}" de las categorías de gastos?`)) {
      const updated = expenseCategories.filter((_, i) => i !== index);
      onUpdateExpenseCategories(updated);
    }
  };

  // Bank Add
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBank.trim();
    if (!clean) return;
    if (bankList.includes(clean)) {
      alert("Este banco ya existe.");
      return;
    }
    onUpdateBankList([...bankList, clean]);
    setNewBank("");
  };

  // Bank Edit Save
  const handleSaveBank = (index: number) => {
    const clean = editBankValue.trim();
    if (!clean) return;
    if (bankList.includes(clean) && bankList.indexOf(clean) !== index) {
      alert("Este banco ya existe en la lista.");
      return;
    }
    const updated = [...bankList];
    updated[index] = clean;
    onUpdateBankList(updated);
    setEditBankIndex(null);
  };

  // Bank Delete
  const handleDeleteBank = (index: number) => {
    if (confirm(`¿Estás seguro de eliminar el banco "${bankList[index]}" de la lista desplegable?`)) {
      const updated = bankList.filter((_, i) => i !== index);
      onUpdateBankList(updated);
    }
  };

  // Doc Type Add
  const handleAddDocType = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDocType.trim();
    if (!clean) return;
    if (documentTypes.includes(clean)) {
      alert("Este tipo de documento ya existe.");
      return;
    }
    onUpdateDocumentTypes([...documentTypes, clean]);
    setNewDocType("");
  };

  // Doc Type Edit Save
  const handleSaveDocType = (index: number) => {
    const clean = editDocValue.trim();
    if (!clean) return;
    if (documentTypes.includes(clean) && documentTypes.indexOf(clean) !== index) {
      alert("Este tipo de documento ya existe.");
      return;
    }
    const updated = [...documentTypes];
    updated[index] = clean;
    onUpdateDocumentTypes(updated);
    setEditDocIndex(null);
  };

  // Doc Type Delete
  const handleDeleteDocType = (index: number) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${documentTypes[index]}" de los tipos de documentos?`)) {
      const updated = documentTypes.filter((_, i) => i !== index);
      onUpdateDocumentTypes(updated);
    }
  };

  return (
    <div className="space-y-6" id="panel-listas-config">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-6 sm:p-7 rounded-2xl shadow border border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black uppercase tracking-wider">Configuración de Listas Desplegables</h2>
            <p className="text-xs text-slate-400 font-medium max-w-xl">
              Configura y personaliza las opciones predefinidas de los formularios de rendición y solicitudes. Agrega, edita o elimina categorías de gastos, instituciones bancarias habilitadas y tipos de documentos (boletas, facturas, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. CATEGORIAS DE GASTOS */}
        <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
              <LayoutGrid className="w-5 h-5 text-[#2563eb]" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Categorías de Gastos</h4>
                <p className="text-[10px] text-outline">Rubros de justificación presupuestaria</p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {expenseCategories.map((cat, index) => (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/80 hover:bg-slate-100/60 transition-all text-xs font-semibold text-primary"
                  >
                    {editCategoryIndex === index ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          className="flex-1 bg-white border border-[#ccd2da] px-2 py-1 rounded text-xs text-primary font-bold focus:outline-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategory(index)}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditCategoryIndex(null)}
                          className="p-1 text-rose-600 bg-rose-50 rounded hover:bg-rose-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate">{cat}</span>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditCategoryIndex(index);
                              setEditCategoryValue(cat);
                            }}
                            className="p-1 text-[#222c3c] hover:bg-white rounded transition-colors"
                            title="Editar opción"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(index)}
                            className="p-1 text-[#b3261e] hover:bg-rose-50 rounded transition-colors"
                            title="Eliminar opción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Form to add */}
          <form onSubmit={handleAddCategory} className="pt-3 border-t border-outline-variant/30 flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-slate-50 border border-outline-variant p-2 rounded-lg text-xs font-semibold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-primary"
              required
            />
            <button
              type="submit"
              className="px-3 bg-primary text-white rounded-lg hover:bg-primary-container transition-all flex items-center justify-center shadow"
              title="Añadir opción"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* 2. BANCOS PARA TRANSFERENCIAS */}
        <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
              <Landmark className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Bancos para Transferencias</h4>
                <p className="text-[10px] text-outline">Entidades bancarias operativas</p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {bankList.map((b, index) => (
                  <motion.div
                    key={b}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/80 hover:bg-slate-100/60 transition-all text-xs font-semibold text-primary"
                  >
                    {editBankIndex === index ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editBankValue}
                          onChange={(e) => setEditBankValue(e.target.value)}
                          className="flex-1 bg-white border border-[#ccd2da] px-2 py-1 rounded text-xs text-primary font-bold focus:outline-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveBank(index)}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditBankIndex(null)}
                          className="p-1 text-rose-600 bg-rose-50 rounded hover:bg-rose-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate">{b}</span>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditBankIndex(index);
                              setEditBankValue(b);
                            }}
                            className="p-1 text-[#222c3c] hover:bg-white rounded transition-colors"
                            title="Editar opción"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBank(index)}
                            className="p-1 text-[#b3261e] hover:bg-rose-50 rounded transition-colors"
                            title="Eliminar opción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Form to add */}
          <form onSubmit={handleAddBank} className="pt-3 border-t border-outline-variant/30 flex gap-2">
            <input
              type="text"
              placeholder="Nuevo banco..."
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              className="flex-1 bg-slate-50 border border-outline-variant p-2 rounded-lg text-xs font-semibold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-[#4f46e5]"
              required
            />
            <button
              type="submit"
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center justify-center shadow"
              title="Añadir opción"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* 3. TIPOS DE DOCUMENTOS */}
        <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
              <FileText className="w-5 h-5 text-teal-600" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-primary">Tipos de Documentos</h4>
                <p className="text-[10px] text-outline">Soportes y justiciativos válidos</p>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {documentTypes.map((dt, index) => (
                  <motion.div
                    key={dt}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/80 hover:bg-slate-100/60 transition-all text-xs font-semibold text-primary"
                  >
                    {editDocIndex === index ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={editDocValue}
                          onChange={(e) => setEditDocValue(e.target.value)}
                          className="flex-1 bg-white border border-[#ccd2da] px-2 py-1 rounded text-xs text-primary font-bold focus:outline-indigo-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveDocType(index)}
                          className="p-1 text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditDocIndex(null)}
                          className="p-1 text-rose-600 bg-rose-50 rounded hover:bg-rose-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate">{dt}</span>
                        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditDocIndex(index);
                              setEditDocValue(dt);
                            }}
                            className="p-1 text-[#222c3c] hover:bg-white rounded transition-colors"
                            title="Editar opción"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocType(index)}
                            className="p-1 text-[#b3261e] hover:bg-rose-50 rounded transition-colors"
                            title="Eliminar opción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Form to add */}
          <form onSubmit={handleAddDocType} className="pt-3 border-t border-outline-variant/30 flex gap-2">
            <input
              type="text"
              placeholder="Nuevo tipo doc..."
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              className="flex-1 bg-slate-50 border border-outline-variant p-2 rounded-lg text-xs font-semibold text-primary outline-none focus:bg-white focus:ring-1 focus:ring-teal-600"
              required
            />
            <button
              type="submit"
              className="px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-all flex items-center justify-center shadow"
              title="Añadir opción"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
