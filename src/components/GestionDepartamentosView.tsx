/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Department } from "../types";
import { Plus, Search, Trash2, Edit3, FolderOpen, AlertTriangle, Layers, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GestionDepartamentosProps {
  categories: string[];
  departments: Department[];
  categoryColors?: Record<string, string>;
  onAddCategory: (category: string) => void;
  onUpdateCategory: (oldCat: string, newCat: string) => void;
  onDeleteCategory: (category: string) => void;
  onUpdateCategoryColor?: (catName: string, color: string) => void;
}

export const GestionDepartamentosView: React.FC<GestionDepartamentosProps> = ({
  categories,
  departments,
  categoryColors = {},
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateCategoryColor,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [editingCatName, setEditingCatName] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter categories by search
  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count funds (departments/sub-accounts) belonging to each category
  const getFundsCountForCategory = (catName: string) => {
    return departments.filter((d) => d.category === catName).length;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    if (categories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) {
      alert("Ya existe un departamento con este nombre.");
      return;
    }

    onAddCategory(cleanName);
    setNewCatName("");
    setShowCreateModal(false);
    alert(`¡Departamento "${cleanName}" creado con éxito!`);
  };

  const handleStartEdit = (catName: string) => {
    setEditingCatName(catName);
    setEditingValue(catName);
  };

  const handleSaveEdit = (oldCat: string) => {
    const cleanValue = editingValue.trim();
    if (!cleanValue) return;

    if (cleanValue.toLowerCase() === oldCat.toLowerCase()) {
      setEditingCatName("");
      return;
    }

    if (
      categories.some(
        (c) => c.toLowerCase() === cleanValue.toLowerCase() && c.toLowerCase() !== oldCat.toLowerCase()
      )
    ) {
      alert("Ya existe otro departamento con este nombre.");
      return;
    }

    onUpdateCategory(oldCat, cleanValue);
    setEditingCatName("");
    alert(`¡Departamento actualizado de "${oldCat}" a "${cleanValue}" con éxito!`);
  };

  const handleDeleteClick = (catName: string) => {
    const fundsCount = getFundsCountForCategory(catName);
    if (fundsCount > 0) {
      alert(
        `No se puede eliminar el departamento "${catName}" porque tiene ${fundsCount} fondo(s) de tesorería asociados. Por favor reasigne o elimine los fondos primero.`
      );
      return;
    }

    if (
      confirm(
        `¿Está seguro de que desea eliminar el departamento "${catName}"? Esta acción no se puede deshacer.`
      )
    ) {
      onDeleteCategory(catName);
      alert(`Departamento "${catName}" eliminado con éxito.`);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>CONFIGURACIÓN</span>
            <span>/</span>
            <span className="text-secondary font-bold">DEPARTAMENTOS</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-2xl font-bold text-primary">
              Gestión de Departamentos (Categorías de Fondos)
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestione las categorías globales o "Departamentos" que agrupan a los diferentes Fondos de Tesorería.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Crear Departamento
        </button>
      </div>

      {/* Info Warning Alert */}
      <div className="p-4 rounded-xl bg-[#eef4fc]/60 border border-[#1552a6]/10 text-xs font-medium text-slate-700 space-y-1">
        <div className="flex items-center gap-2 text-[#1552a6] font-black uppercase text-[10px] tracking-wider">
          <Layers className="w-4 h-4" /> Relación Estructural
        </div>
        <p className="leading-relaxed">
          Los <strong className="text-primary font-black">Departamentos</strong> listados aquí representan el nivel organizativo superior al que se asocian los usuarios del sistema. Cada departamento contiene uno o más <strong className="text-secondary font-bold">Fondos de Tesorería</strong> (los cuales disponen de presupuestos asignados, límites de gasto y ejecuciones financieras). Al actualizar el nombre de un departamento, este cambio se propagará automáticamente a todos los fondos y usuarios vinculados de forma transparente.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative select-all">
        <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar un departamento por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 h-11 rounded-xl border border-outline-variant/85 bg-white text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all font-medium"
        />
      </div>

      {/* Categories Table/List */}
      <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-100 text-[10px] text-outline font-black uppercase tracking-wider select-none">
                <th className="px-6 py-4">Nombre del Departamento</th>
                <th className="px-6 py-4">Color de Resaltado</th>
                <th className="px-6 py-4">Fondos de Tesorería Asociados</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 font-medium">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-bold">
                    No se encontraron departamentos con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, idx) => {
                  const fundsCount = getFundsCountForCategory(cat);
                  const isEditing = editingCatName === cat;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 maxWidth-[300px]">
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="bg-white border border-outline px-2.5 py-1.5 rounded-lg text-xs outline-none font-bold text-primary flex-1 focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(cat)}
                              className="p-1.5 bg-emerald-500 hover:bg-emerald-650 text-white rounded-lg transition-colors cursor-pointer"
                              title="Guardar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCatName("")}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-[#1552a6]" />
                            <span className="font-extrabold text-[#1552a6] text-sm">{cat}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={categoryColors[cat] || "#2563eb"}
                            onChange={(e) => onUpdateCategoryColor?.(cat, e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-outline-variant/30 p-0 bg-transparent shrink-0 outline-none"
                            title="Cambiar color del departamento"
                          />
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide"
                            style={{ 
                              backgroundColor: `${categoryColors[cat] || "#2563eb"}15`, 
                              color: categoryColors[cat] || "#2563eb" 
                            }}
                          >
                            {categoryColors[cat] || "#2563eb"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 select-none">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                            fundsCount > 0
                              ? "bg-emerald-100/70 text-emerald-700"
                              : "bg-amber-100/70 text-amber-700"
                          }`}
                        >
                          {fundsCount} {fundsCount === 1 ? "fondo" : "fondos"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isEditing && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar nombre"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/40 backdrop-blur-xs"
              onClick={() => setShowCreateModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-outline-variant/60 shadow-2xl p-6 md:p-8 w-full max-w-md relative z-10"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5 select-none">
                <h4 className="text-base font-black text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <Plus className="w-4 h-4 text-secondary shrink-0" /> Crear Departamento
                </h4>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase font-extrabold tracking-wider block">
                    Nombre del Departamento
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ministerio de Música"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white border border-outline-variant/80 p-3 rounded-xl text-xs sm:text-sm outline-none font-extrabold text-primary focus:ring-1 focus:ring-primary"
                    required
                    autoFocus
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] leading-relaxed text-slate-500 font-bold select-none">
                  💡 Este departamento se convertirá en un grupo organizativo seleccionable para agregar fondos de tesorería y enlazar usuarios directivos.
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-container transition-all shadow-md select-none mt-2 cursor-pointer"
                >
                  Confirmar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
