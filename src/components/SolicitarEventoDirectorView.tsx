/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Meeting, User, Department } from "../types";
import { 
  Calendar, Clock, MapPin, Send, AlertCircle, FileText, CheckCircle2, Eye, Hourglass, Info 
} from "lucide-react";
import { motion } from "motion/react";
import { getDepartmentColorClasses } from "../utils";

interface SolicitarEventoProps {
  currentUser: User;
  departments: Department[];
  categories: string[];
  meetings: Meeting[];
  onAddMeeting: (evt: Meeting) => void;
}

export const SolicitarEventoDirectorView: React.FC<SolicitarEventoProps> = ({
  currentUser,
  departments,
  categories,
  meetings,
  onAddMeeting,
}) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [organizerDept, setOrganizerDept] = useState(() => {
    if (currentUser.departments && currentUser.departments.length > 0) {
      return currentUser.departments[0];
    }
    return "Todos";
  });
  const [participants, setParticipants] = useState<string[]>(() => {
    if (currentUser.departments && currentUser.departments.length > 0) {
      return [currentUser.departments[0]];
    }
    return ["Todos"];
  });
  const [description, setDescription] = useState("");
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter only requests made by this user or their departments 
  const myRequests = meetings.filter(m => 
    m.status === "Pendiente" || m.status === "Observado" || m.status === "Aprobado"
  ).filter(m => {
    // Show user's department events
    if (m.department === "Todos") return true;
    return currentUser.departments.includes(m.department);
  });

  const handleToggleParticipant = (deptName: string) => {
    if (deptName === "Todos") {
      if (participants.includes("Todos")) {
        setParticipants([]);
      } else {
        setParticipants(["Todos"]);
      }
    } else {
      let next = participants.filter(p => p !== "Todos");
      if (next.includes(deptName)) {
        next = next.filter(p => p !== deptName);
      } else {
        next.push(deptName);
      }
      setParticipants(next);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !duration || !location) {
      alert("Por favor rellene todos los campos obligatorios (*).");
      return;
    }

    const finalParticipants = participants.length > 0 ? participants : [organizerDept];

    const newEvent: Meeting = {
      id: "evt-req-" + Date.now(),
      title,
      date,
      time,
      duration,
      location,
      department: organizerDept,
      organizer: organizerDept,
      participants: finalParticipants,
      description: description.trim() || undefined,
      status: "Pendiente" // Must be Pendiente for approval
    };

    onAddMeeting(newEvent);
    setSuccessMsg(`Solicitud del evento "${title}" enviada con éxito. Queda en estado pendiente de aprobación por Secretaría.`);
    
    // Reset form fields
    setTitle("");
    setDate("");
    setTime("");
    setDuration("");
    setLocation("");
    const initialDept = currentUser.departments && currentUser.departments.length > 0 
      ? currentUser.departments[0] 
      : "Todos";
    setOrganizerDept(initialDept);
    setParticipants([initialDept]);
    setDescription("");

    setTimeout(() => {
      setSuccessMsg(null);
    }, 6000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Tab Header Details */}
      <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 select-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-outline font-medium uppercase tracking-wider">
            <span>Portal del Director de Departamento</span>
            <span>/</span>
            <span className="text-secondary font-bold">Solicitudes de Eventos</span>
          </div>
          <h1 className="text-2xl font-black text-primary mt-1">
            Proponer Nuevo Evento de Iglesia
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Completa la solicitud para agendar un acontecimiento oficial. Su publicación en el calendario general requiere validación y aprobación de Secretaría.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 max-w-sm">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-amber-800 leading-normal">
            <strong>Nota de Proceso:</strong> Los eventos propuestos se registran inmediatamente en estado <span className="bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold font-mono">Pendiente</span> hasta ser evaluados por Secretaría.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Create Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/20 select-none">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans text-base font-black text-primary">Formulario de Solicitud</h3>
              <p className="text-xs text-on-surface-variant font-medium">Especifica detalladamente los parámetros del evento</p>
            </div>
          </div>

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Title */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-primary block">
                Nombre del Evento <span className="text-error">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Ej. Escuela Bíblica de Vacaciones, Concierto Juvenil"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
              />
            </div>

            {/* Fecha */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Fecha del Evento <span className="text-error">*</span>
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
              />
            </div>

            {/* Hora */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Hora de Inicio <span className="text-error">*</span>
              </label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
              />
            </div>

            {/* Duración */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Duración Estimada <span className="text-error">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Ej. 2 horas, 3 días, Todo el día"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
              />
            </div>

            {/* Ubicación */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Ubicación / Recinto <span className="text-error">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Ej. Salón Multiusos, Templo Central"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all"
              />
            </div>

            {/* Departamento Organizador */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-primary block">
                Departamento Organizador <span className="text-error">*</span>
              </label>
              <select 
                value={organizerDept}
                onChange={(e) => {
                  const newDept = e.target.value;
                  const prevDept = organizerDept;
                  setOrganizerDept(newDept);
                  
                  // Coordinate participants default
                  if (
                    participants.length === 0 || 
                    (participants.length === 1 && (participants[0] === prevDept || participants[0] === "Todos"))
                  ) {
                    setParticipants([newDept]);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-outline-variant p-3.5 rounded-xl bg-slate-50/50 max-h-48 overflow-y-auto">
                <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-slate-100/75 cursor-pointer text-xs font-semibold text-slate-800">
                  <input 
                    type="checkbox"
                    checked={participants.includes("Todos")}
                    onChange={() => handleToggleParticipant("Todos")}
                    className="rounded text-primary focus:ring-secondary w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>👥 Todos (Toda la Iglesia)</span>
                </label>
                
                {categories.map((cat) => {
                  const isChecked = participants.includes(cat);
                  return (
                    <label key={cat} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-slate-100/75 cursor-pointer text-xs font-semibold ${isChecked ? "text-[#1552a6]" : "text-slate-600"}`}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleParticipant(cat)}
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
              <label className="text-xs font-bold text-primary block">
                Breve Descripción <span className="text-outline">(Opcional)</span>
              </label>
              <textarea 
                rows={3}
                placeholder="Explica resumidamente el propósito del evento o requisitos logísticos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-outline bg-transparent outline-none focus:border-secondary font-medium transition-all resize-none"
              />
            </div>

          </div>

          <div className="pt-4 border-t border-outline-variant/15 flex justify-end">
            <button 
              type="submit"
              className="px-6 py-2.5 bg-[#1552a6] hover:bg-[#124285] text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow"
            >
              <Send className="w-4 h-4" /> Enviar Solicitud
            </button>
          </div>
        </form>

        {/* Right Side: Track Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 space-y-4">
            <div className="select-none pb-2 border-b border-outline-variant/20">
              <h3 className="font-sans text-base font-black text-primary">Historial de Solicitudes</h3>
              <p className="text-xs text-on-surface-variant">Monitoreo de aprobación de propuestas asociadas a su departamento</p>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1.5 custom-scrollbar select-none">
              {myRequests.map((req) => (
                <div 
                  key={req.id} 
                  className="p-3.5 rounded-xl border border-outline-variant/25 bg-surface-container-low/30 hover:bg-surface-container-low/60 transition-all space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-primary leading-snug">{req.title}</h4>
                      <p className="text-[10px] text-outline font-semibold mt-0.5">{req.date} - {req.time} ({req.duration})</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 select-none ${
                      req.status === "Aprobado" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : req.status === "Pendiente" 
                        ? "bg-amber-50 text-amber-700 border border-amber-200" 
                        : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {(() => {
                    const colorCls = getDepartmentColorClasses(req.organizer || req.department);
                    return (
                      <div className={`text-[10px] ${colorCls.bg} p-3 rounded-xl border ${colorCls.border} ${colorCls.borderLeft} space-y-1`}>
                        <p className="truncate text-slate-700"><strong>Ubicación:</strong> <span className="font-bold text-slate-800">{req.location}</span></p>
                        <p className="truncate text-slate-700"><strong>Organizador:</strong> <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${colorCls.badge}`}>{req.organizer || req.department}</span></p>
                        <p className="truncate text-slate-700">
                          <strong>Participan:</strong> <span className="font-bold text-slate-800">
                            {req.participants && req.participants.length > 0 ? req.participants.join(", ") : "Todos"}
                          </span>
                        </p>
                        {req.description && (
                          <p className="line-clamp-2 italic text-slate-600 mt-1 font-normal pt-1 border-t border-slate-200/40">"{req.description}"</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}

              {myRequests.length === 0 && (
                <div className="text-center py-12 text-on-surface-variant">
                  <FileText className="w-10 h-10 mx-auto text-outline/30 mb-2" />
                  <p className="text-xs font-bold">No registras solicitudes asociadas.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
