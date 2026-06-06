/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Meeting, Department, User } from "../types";
import { 
  Calendar, CheckCircle, Eye, Edit3, Trash2, HelpCircle, 
  Search, EyeOff, AlertCircle, RefreshCw, Layers, Plus, 
  MapPin, Clock, Bookmark, Sparkles, Filter, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDepartmentColorClasses } from "../utils";

interface GestionEventosProps {
  meetings: Meeting[];
  departments: Department[];
  categories: string[];
  currentUser: User;
  onUpdateEvent: (updated: Meeting) => void;
  onDeleteEvent: (id: string) => void;
  onAddEvent: (newEvent: Meeting) => void;
}

export const GestionEventosSecretariaView: React.FC<GestionEventosProps> = ({
  meetings,
  departments,
  categories,
  currentUser,
  onUpdateEvent,
  onDeleteEvent,
  onAddEvent,
}) => {
  const [subTab, setSubTab] = useState<"solicitudes" | "aprobados">("solicitudes");
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for Editing
  const [editingEvent, setEditingEvent] = useState<Meeting | null>(null);
  
  // State for Direct Creative Form
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [directTitle, setDirectTitle] = useState("");
  const [directDate, setDirectDate] = useState("");
  const [directTime, setDirectTime] = useState("");
  const [directDuration, setDirectDuration] = useState("");
  const [directLocation, setDirectLocation] = useState("");
  const [directOrganizer, setDirectOrganizer] = useState("Todos");
  const [directParticipants, setDirectParticipants] = useState<string[]>(["Todos"]);
  const [directDesc, setDirectDesc] = useState("");

  // Edit fields state
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editOrganizer, setEditOrganizer] = useState("Todos");
  const [editParticipants, setEditParticipants] = useState<string[]>(["Todos"]);
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<"Pendiente" | "Aprobado" | "Observado">("Pendiente");

  // Filtering Meetings
  const filtered = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Solicitudes (Pendiente, Observado)
  const solicitudes = filtered.filter(m => m.status === "Pendiente" || m.status === "Observado");

  // Aprobados o creados por Secretaría (Aprobado)
  const aprobados = filtered.filter(m => m.status === "Aprobado");

  // Handle Edit Action Load
  const handleStartEdit = (evt: Meeting) => {
    setEditingEvent(evt);
    setEditTitle(evt.title);
    setEditDate(evt.date);
    setEditTime(evt.time);
    setEditDuration(evt.duration);
    setEditLocation(evt.location);
    setEditOrganizer(evt.organizer || evt.department || "Todos");
    setEditParticipants(evt.participants || ["Todos"]);
    setEditDesc(evt.description || "");
    setEditStatus(evt.status);
  };

  const handleToggleDirectParticipant = (deptName: string) => {
    if (deptName === "Todos") {
      if (directParticipants.includes("Todos")) {
        setDirectParticipants([]);
      } else {
        setDirectParticipants(["Todos"]);
      }
    } else {
      let next = directParticipants.filter(p => p !== "Todos");
      if (next.includes(deptName)) {
        next = next.filter(p => p !== deptName);
      } else {
        next.push(deptName);
      }
      setDirectParticipants(next);
    }
  };

  const handleToggleEditParticipant = (deptName: string) => {
    if (deptName === "Todos") {
      if (editParticipants.includes("Todos")) {
        setEditParticipants([]);
      } else {
        setEditParticipants(["Todos"]);
      }
    } else {
      let next = editParticipants.filter(p => p !== "Todos");
      if (next.includes(deptName)) {
        next = next.filter(p => p !== deptName);
      } else {
        next.push(deptName);
      }
      setEditParticipants(next);
    }
  };

  // Submit edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!editTitle || !editDate || !editTime || !editDuration || !editLocation) {
      alert("Por favor rellena los campos obligatorios (*) antes de guardar.");
      return;
    }

    const finalParticipants = editParticipants.length > 0 ? editParticipants : [editOrganizer];

    const updated: Meeting = {
      ...editingEvent,
      title: editTitle,
      date: editDate,
      time: editTime,
      duration: editDuration,
      location: editLocation,
      department: editOrganizer,
      organizer: editOrganizer,
      participants: finalParticipants,
      description: editDesc.trim() || undefined,
      status: editStatus
    };

    onUpdateEvent(updated);
    setEditingEvent(null);
    alert(`Evento "${editTitle}" actualizado con éxito.`);
  };

  // Direct Creation Handlers
  const handleCreateDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTitle || !directDate || !directTime || !directDuration || !directLocation) {
      alert("Por favor rrellene todas las variables obligatorias.");
      return;
    }

    const finalParticipants = directParticipants.length > 0 ? directParticipants : [directOrganizer];

    const newEvt: Meeting = {
      id: "evt-sec-" + Date.now(),
      title: directTitle,
      date: directDate,
      time: directTime,
      duration: directDuration,
      location: directLocation,
      department: directOrganizer,
      organizer: directOrganizer,
      participants: finalParticipants,
      description: directDesc.trim() || undefined,
      status: "Aprobado" // Directed created by secretaría are automatically approved
    };

    onAddEvent(newEvt);
    setShowDirectForm(false);
    
    // reset fields
    setDirectTitle("");
    setDirectDate("");
    setDirectTime("");
    setDirectDuration("");
    setDirectLocation("");
    setDirectOrganizer("Todos");
    setDirectParticipants(["Todos"]);
    setDirectDesc("");
    
    alert(`Evento "${newEvt.title}" programado y publicado de forma automática en el calendario.`);
  };

  // Fast approvals directly on layout
  const handleQuickStatusChange = (evt: Meeting, status: "Aprobado" | "Observado") => {
    const updated: Meeting = {
      ...evt,
      status
    };
    onUpdateEvent(updated);
    alert(`Estado del evento cambiado a: "${status}"`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 select-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline font-medium uppercase tracking-wider">
            <span>Portal de Secretaría</span>
            <span>/</span>
            <span className="text-secondary font-bold">Gestión de Eventos y Calendario</span>
          </div>
          <h1 className="text-2xl font-black text-primary mt-1">
            Revisión y Aprobación de Plan de Actividades
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Aprueba o sugiere modificaciones (observar) sobre eventos propuestos por directores de departamentos, o crea eventos directos autorizados.
          </p>
        </div>
        
        <button 
          onClick={() => setShowDirectForm(true)}
          className="px-4 py-2 bg-[#1552a6] hover:bg-[#124285] text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow"
        >
          <Plus className="w-4 h-4" /> Crear Evento Directo
        </button>
      </div>

      {/* Tab Selectors and Search filter bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-2 select-none">
        <div className="flex bg-[#f1f5f9] p-1 rounded-xl">
          <button 
            onClick={() => setSubTab("solicitudes")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              subTab === "solicitudes" 
                ? "bg-white text-[#1552a6] shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Solicitudes Pendientes ({solicitudes.length})
          </button>
          <button 
            onClick={() => setSubTab("aprobados")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              subTab === "aprobados" 
                ? "bg-white text-[#1552a6] shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Eventos Aprobados ({aprobados.length})
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-outline absolute left-3 w-4 h-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, lugar, depto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs rounded-lg border border-outline bg-white font-medium outline-none focus:border-secondary w-full"
          />
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: SOLICITUDES DE EVENTOS (Pendiente/Observado) */}
        {subTab === "solicitudes" && (
          <motion.div 
            key="solicitudes-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {solicitudes.length === 0 ? (
              <div className="bg-white border rounded-2xl p-16 text-center select-none max-w-md mx-auto my-8">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-extrabold text-primary text-base">Sin Solicitudes Pendientes</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  No hay propuestas de eventos esperando moderación. Los directores recibirán notificaciones en su portal al crear nuevas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {solicitudes.map((sol) => (
                  <div 
                    key={sol.id}
                    className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-3">
                        <div className="px-2.5 py-1 bg-[#1552a6]/10 text-[#1552a6] rounded-lg text-[10px] font-black uppercase tracking-wider select-none">
                          {sol.department}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider select-none ${
                          sol.status === "Pendiente" 
                            ? "bg-amber-50 text-amber-700 border border-amber-200" 
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {sol.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-sans text-base font-black text-primary leading-tight hover:text-[#1552a6] cursor-pointer" onClick={() => handleStartEdit(sol)}>
                          {sol.title}
                        </h3>
                        <p className="text-[11px] text-outline font-semibold mt-1">Solicitud ID: {sol.id}</p>
                      </div>

                      <div className="space-y-2 text-xs font-semibold text-on-surface-variant select-none bg-slate-50 p-3 rounded-lg border border-outline-variant/15">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                          <span>Fecha: {sol.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                          <span>Inicio: {sol.time} | Duración: {sol.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                          <span>Ubicación: {sol.location}</span>
                        </div>
                      </div>

                      {sol.description && (
                        <div className="text-[11px] text-outline italic font-medium pt-1 line-clamp-3 leading-normal border-t border-dashed border-outline-variant/20">
                          "{sol.description}"
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5 mt-5 pt-4 border-t border-outline-variant/15">
                      <button 
                        onClick={() => handleQuickStatusChange(sol, "Aprobado")}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 leading-none shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleQuickStatusChange(sol, "Observado")}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 leading-none shadow-sm"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Observar
                      </button>
                      <button 
                        onClick={() => handleStartEdit(sol)}
                        className="p-2 border border-outline-variant/60 rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer transition-all"
                        title="Editar detalles de propuesta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: EVENTOS APROBADOS Y CREADOS POR SECRETARÍA */}
        {subTab === "aprobados" && (
          <motion.div 
            key="aprobados-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {aprobados.length === 0 ? (
              <div className="bg-white border rounded-2xl p-16 text-center select-none max-w-md mx-auto my-8">
                <EyeOff className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-extrabold text-primary text-base">Sin Eventos Programados</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  No hay actividades aprobadas en el calendario. Programa actividades usando el botón 'Crear Evento Directo'.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden select-none">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-55 border-b border-slate-100 text-[10px] text-outline font-black uppercase tracking-wider select-none">
                        <th className="px-6 py-4 text-left">Detalles del Evento</th>
                        <th className="px-6 py-4 text-left">Lugar</th>
                        <th className="px-6 py-4 text-left">Departamento</th>
                        <th className="px-6 py-4 text-left">Presupuesto/Duración</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100 font-medium">
                      {aprobados.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-mono text-[9px] text-[#1552a6] font-bold bg-[#1552a6]/10 px-1.5 py-0.5 rounded mr-2">{evt.date}</span>
                              <strong className="text-sm text-primary font-black">{evt.title}</strong>
                            </div>
                            {evt.description && (
                              <p className="text-outline text-[11px] italic mt-1 line-clamp-1">"{evt.description}"</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {evt.location}
                            </span>
                          </td>
                          <td className="px-6 py-4 select-none">
                            <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-secondary-fixed text-primary border border-outline-variant/15">
                              {evt.department}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-on-surface">
                            <div className="space-y-0.5 text-[11px]">
                              <p>Duración: <strong className="text-primary">{evt.duration}</strong></p>
                              <p>Inicio: {evt.time} hrs</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {evt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button 
                                onClick={() => handleStartEdit(evt)}
                                className="p-2 border border-outline-variant/50 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-all"
                                title="Editar Evento"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(`¿Está seguro que desea cancelar/eliminar el evento "${evt.title}" del calendario oficial?`)) {
                                    onDeleteEvent(evt.id);
                                  }
                                }}
                                className="p-2 border border-outline-variant/50 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-all"
                                title="Eliminar Evento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: EDIT EVENT DETAILS */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-outline-variant/30 shadow-2xl p-6 sm:p-8 w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-black text-primary leading-tight">Editar Atributos del Evento</h3>
                    <p className="text-xs text-on-surface-variant font-medium">Modifica los parámetros para aprobación o agenda</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingEvent(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-50 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Nombre del Evento *</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Fecha *</label>
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Hora */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Hora de Inicio *</label>
                  <input 
                    type="time" 
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Duración */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Duración Estimada *</label>
                  <input 
                    type="text" 
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Ubicación */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Ubicación / Recinto *</label>
                  <input 
                    type="text" 
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Departamento Organizador */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Departamento Organizador *</label>
                  <select 
                    value={editOrganizer}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const prevDept = editOrganizer;
                      setEditOrganizer(newDept);
                      // Coordinate participants default
                      if (
                        editParticipants.length === 0 || 
                        (editParticipants.length === 1 && (editParticipants[0] === prevDept || editParticipants[0] === "Todos"))
                      ) {
                        setEditParticipants([newDept]);
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-white outline-none focus:border-secondary font-medium transition-all"
                  >
                    <option value="Todos">Administración General / Templo</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Departamentos Participantes */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-primary block">
                    Departamentos participantes <span className="text-outline font-normal text-slate-500">(Opcional)</span>
                    <span className="text-[10px] text-outline font-normal ml-1 text-slate-400">(Por defecto es el organizador. Puedes elegir varios)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-outline-variant p-3.5 rounded-xl bg-slate-100/50 max-h-40 overflow-y-auto w-full">
                    <label className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-semibold text-slate-800">
                      <input 
                        type="checkbox"
                        checked={editParticipants.includes("Todos")}
                        onChange={() => handleToggleEditParticipant("Todos")}
                        className="rounded text-primary focus:ring-secondary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>👥 Todos (Toda la Iglesia)</span>
                    </label>
                    
                    {categories.map((cat) => {
                      const isChecked = editParticipants.includes(cat);
                      return (
                        <label key={cat} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-sans font-semibold ${isChecked ? "text-[#1552a6]" : "text-slate-600"}`}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEditParticipant(cat)}
                            className="rounded text-primary focus:ring-secondary w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Estado */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Estado de Aprobación *</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-white outline-none focus:border-secondary font-medium transition-all"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Observado">Observado / Modificar</option>
                    <option value="Aprobado">Aprobado / Publicar en Agenda</option>
                  </select>
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Descripción (Opcional)</label>
                  <textarea 
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all resize-none"
                  />
                </div>

                <div className="sm:col-span-2 pt-4 border-t border-outline-variant/15 flex justify-end gap-3.5">
                  <button 
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-slate-50 transition-all font-bold text-xs text-primary cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#1552a6] hover:bg-[#124285] text-white rounded-lg transition-all font-bold text-xs cursor-pointer shadow"
                  >
                    Guardar Cambios
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: DIRECT EVENT SCHEDULER */}
      <AnimatePresence>
        {showDirectForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto select-none font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-outline-variant/30 shadow-2xl p-6 sm:p-8 w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[#1552a6]">
                    <Sparkles className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-black text-primary leading-tight">Agendar Evento Directo</h3>
                    <p className="text-xs text-on-surface-variant font-medium">Se publicará de forma aprobada e inmediata en el calendario</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDirectForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-50 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDirect} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Nombre del Evento *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Cierre de Evangelismo, Culto Especial de Sábado"
                    value={directTitle}
                    onChange={(e) => setDirectTitle(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Fecha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Fecha *</label>
                  <input 
                    type="date" 
                    value={directDate}
                    onChange={(e) => setDirectDate(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Hora */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Hora de Inicio *</label>
                  <input 
                    type="time" 
                    value={directTime}
                    onChange={(e) => setDirectTime(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Duración */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Duración Estimada *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 3 horas, Todo el día"
                    value={directDuration}
                    onChange={(e) => setDirectDuration(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Ubicación */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-primary block">Ubicación *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Templo Central"
                    value={directLocation}
                    onChange={(e) => setDirectLocation(e.target.value)}
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
                  />
                </div>

                {/* Departamento Organizador */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Departamento Organizador *</label>
                  <select 
                    value={directOrganizer}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      const prevDept = directOrganizer;
                      setDirectOrganizer(newDept);
                      // Coordinate participants default
                      if (
                        directParticipants.length === 0 || 
                        (directParticipants.length === 1 && (directParticipants[0] === prevDept || directParticipants[0] === "Todos"))
                      ) {
                        setDirectParticipants([newDept]);
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-white outline-none focus:border-secondary font-medium transition-all"
                  >
                    <option value="Todos">Administración General / Templo</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Departamentos Participantes */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-primary block">
                    Departamentos participantes <span className="text-outline font-normal text-slate-500">(Opcional)</span>
                    <span className="text-[10px] text-outline font-normal ml-1 text-slate-400">(Por defecto es el organizador. Puedes elegir varios)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-outline-variant p-3.5 rounded-xl bg-slate-100/50 max-h-40 overflow-y-auto w-full">
                    <label className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-semibold text-slate-800">
                      <input 
                        type="checkbox"
                        checked={directParticipants.includes("Todos")}
                        onChange={() => handleToggleDirectParticipant("Todos")}
                        className="rounded text-primary focus:ring-secondary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>👥 Todos (Toda la Iglesia)</span>
                    </label>
                    
                    {categories.map((cat) => {
                      const isChecked = directParticipants.includes(cat);
                      return (
                        <label key={cat} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs font-sans font-semibold ${isChecked ? "text-[#1552a6]" : "text-slate-600"}`}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDirectParticipant(cat)}
                            className="rounded text-primary focus:ring-secondary w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-primary block">Descripción Breve (Opcional)</label>
                  <textarea 
                    rows={3}
                    placeholder="Escribe detalles adicionales relevantes..."
                    value={directDesc}
                    onChange={(e) => setDirectDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all resize-none"
                  />
                </div>

                <div className="sm:col-span-2 pt-4 border-t border-outline-variant/15 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowDirectForm(false)}
                    className="px-4 py-2 border border-outline-variant rounded-lg hover:bg-slate-50 transition-all font-bold text-xs text-primary cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-bold text-xs cursor-pointer shadow"
                  >
                    Programar Actividad
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
