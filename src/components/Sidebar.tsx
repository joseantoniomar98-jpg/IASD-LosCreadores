/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Tab, User, Cargo } from "../types";
import { BRAND_LOGO } from "../data";
import { 
  LayoutDashboard, Folder, ArrowLeftRight, FileText, FileSpreadsheet, 
  HelpCircle, Calendar, Plus, Clock, Key, Shield, UserCheck, 
  Lock, CheckCircle, ListTodo, LogOut, ChevronDown, ChevronUp, FileCheck, Landmark, ShieldAlert, Boxes,
  Sliders, CheckSquare, Church, Cloud
} from "lucide-react";

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  currentUser: User;
  onLogout: () => void;
  allUsers: User[];
  cargos: Cargo[];
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab: onTabChange,
  currentUser,
  onLogout,
  allUsers,
  cargos,
  isOpen = false,
  onClose
}) => {
  const setActiveTab = (tab: Tab) => {
    onTabChange(tab);
    onClose?.();
  };
  // Collapsible category state togglers
  const [tesoreriaOpen, setTesoreriaOpen] = useState(true);
  const [secretariaOpen, setSecretariaOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);

  // Compute up-to-date user permissions from cargos state mapping
  const userPermissions = React.useMemo(() => {
    const perms = new Set<string>();
    if (currentUser.miembroDeJunta) {
      perms.add("ver_actas_junta");
    }
    currentUser.roles.forEach(roleName => {
      const matchedCargo = cargos.find(c => c.name.toLowerCase() === roleName.toLowerCase());
      if (matchedCargo) {
        matchedCargo.permissions.forEach(p => perms.add(p));
      } else {
        // Fallback matching if cargos don't exist yet or list isn't populated
        if (roleName.toLowerCase().includes("central") || roleName.toLowerCase() === "tesorero") {
          perms.add("ver_resumen_inicio");
          perms.add("ver_planilla_departamentos");
          perms.add("ver_todos_departamentos");
          perms.add("autorizar_solicitudes_fondos");
          perms.add("gestionar_transferencias_presupuesto");
          perms.add("ver_informes_financieros");
          perms.add("configuracion_sistema");
        } else if (roleName.toLowerCase().includes("local")) {
          perms.add("ver_resumen_inicio");
          perms.add("ver_planilla_departamentos");
          perms.add("solicitar_gasto_adelanto");
          perms.add("ver_informes_financieros");
        } else if (roleName.toLowerCase().includes("secretar")) {
          perms.add("ver_resumen_inicio");
          perms.add("ver_todos_departamentos");
          perms.add("ver_actas_junta");
          perms.add("cargar_actas_junta");
          perms.add("gestionar_calendario_sesiones");
        } else if (roleName.toLowerCase().includes("pastor")) {
          perms.add("ver_resumen_inicio");
          perms.add("ver_planilla_departamentos");
          perms.add("ver_todos_departamentos");
          perms.add("ver_informes_financieros");
          perms.add("ver_actas_junta");
          perms.add("gestionar_calendario_sesiones");
        } else if (roleName.toLowerCase().includes("anciano")) {
          perms.add("ver_resumen_inicio");
          perms.add("ver_planilla_departamentos");
          perms.add("ver_todos_departamentos");
          perms.add("ver_actas_junta");
        } else if (roleName.toLowerCase().includes("director")) {
          perms.add("ver_resumen_inicio");
          perms.add("solicitar_gasto_adelanto");
        } else if (roleName.toLowerCase().includes("asistente")) {
          perms.add("ver_resumen_inicio");
          perms.add("ver_planilla_departamentos");
          perms.add("ver_todos_departamentos");
          perms.add("solicitar_gasto_adelanto");
          perms.add("ver_informes_financieros");
        }
      }
    });
    return perms;
  }, [currentUser, cargos]);

  const hasPermission = (permissionKey: string): boolean => {
    return userPermissions.has(permissionKey);
  };

  const isTabPermitted = (tab: Tab): boolean => {
    switch (tab) {
      case Tab.DASHBOARD:
        return hasPermission("ver_resumen_inicio") || hasPermission("menu_inicio");
      case Tab.TES_DEPARTAMENTOS_VER:
        return hasPermission("ver_planilla_departamentos") || hasPermission("menu_planilla");
      case Tab.TES_SOLICITUD_TRANS:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("gestionar_transferencias_presupuesto") || hasPermission("menu_nueva_solicitud");
      case Tab.TES_GESTION_TRANS:
        return hasPermission("gestionar_transferencias_presupuesto") || hasPermission("menu_transferencias");
      case Tab.TES_CONCILIACION_BANCARIA:
        return hasPermission("gestionar_transferencias_presupuesto") || hasPermission("menu_conciliacion");
      case Tab.TES_INFORMES:
        return (currentUser?.roles.some(r => r.toLowerCase().includes("tesorero")) ?? false) || hasPermission("menu_ver_balances");
      case Tab.TES_RESUMEN_FONDOS:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("autorizar_solicitudes_fondos") || hasPermission("menu_resumen_solicitudes");
      case Tab.TES_GESTION_FONDOS:
        return hasPermission("autorizar_solicitudes_fondos") || hasPermission("menu_gestion_solicitudes");
      case Tab.TES_NUEVA_SOLICITUD:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("menu_nueva_solicitud");
      case Tab.TES_RESUMEN_RENDICIONES:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("autorizar_solicitudes_fondos") || hasPermission("menu_resumen_rendiciones");
      case Tab.TES_GESTION_RENDICIONES:
        return hasPermission("autorizar_solicitudes_fondos") || hasPermission("menu_gestion_rendiciones");
      case Tab.TES_NUEVA_RENDICIONES:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("menu_nueva_rendicion");
      case Tab.SEC_ACTAS_BOARD:
        return hasPermission("ver_actas_junta") || hasPermission("menu_ver_actas");
      case Tab.SEC_SUBIR_ACTA:
        return hasPermission("cargar_actas_junta") || hasPermission("menu_subir_actas");
      case Tab.SEC_BALANCES_BOARD:
        return hasPermission("ver_actas_junta") || hasPermission("menu_ver_balances");
      case Tab.SEC_SUBIR_BALANCE:
        return (currentUser?.roles.some(r => r.toLowerCase().includes("tesorero")) ?? false) || hasPermission("menu_subir_balances");
      case Tab.SEC_SOLICITUD_VOTOS:
        return hasPermission("menu_ver_votos") || hasPermission("ver_actas_junta");
      case Tab.SEC_GESTION_VOTOS:
        return hasPermission("cargar_actas_junta") || (currentUser?.roles.some(r => r.toLowerCase().includes("secretar")) ?? false) || hasPermission("menu_gestionar_votos");
      case Tab.SEC_VOTOS_APROBADOS:
        return (currentUser?.roles.some(r => 
          r.toLowerCase().includes("pastor") || 
          r.toLowerCase().includes("primer anciano") ||
          r.toLowerCase().includes("anciano consejero")
        ) ?? false) || hasPermission("menu_canales_firmas");
      case Tab.SEC_CALENDARIO:
        return hasPermission("ver_resumen_inicio") || hasPermission("gestionar_calendario_sesiones") || hasPermission("menu_calendario");

      case Tab.SEC_SOLICITAR_EVENTO_DIRECTOR:
        return hasPermission("solicitar_gasto_adelanto") || hasPermission("menu_reservar_espacios");
      case Tab.SEC_GESTION_EVENTOS:
        return hasPermission("gestionar_calendario_sesiones") || hasPermission("menu_atender_eventos");
      case Tab.CONF_MI_PERFIL:
      case Tab.RECURSOS_DOCUMENTOS:
        return true;
      case Tab.RECURSOS_DOCUMENTOS_GESTION:
        return currentUser?.roles.some(r => 
          r.toLowerCase().includes("tesorero") || 
          r.toLowerCase().includes("secretar")
        ) ?? false;
      case Tab.CONF_USUARIOS:
      case Tab.CONF_CARGOS:
      case Tab.CONF_DEPARTAMENTOS_EDIT:
      case Tab.CONF_DEPARTAMENTOS_CATEGORIAS:
      case Tab.CONF_DYNAMIC_LISTS:
      case Tab.CONF_GOOGLE_DRIVE:
        return hasPermission("configuracion_sistema");
      default:
        return true;
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-45 md:hidden lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      <aside className={`w-[260px] h-screen fixed top-0 bottom-0 left-0 bg-white dark:bg-[#0e1220] border-r border-[#e2e8f0] dark:border-slate-800 flex flex-col p-4 z-50 text-slate-700 dark:text-slate-300 select-none transition-transform duration-300 ease-in-out md:translate-x-0 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-4 px-1 shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-150 shadow-sm bg-[#1552a6]/5">
          <img 
            src={BRAND_LOGO} 
            alt="IASD Logo" 
            className="w-full h-full object-cover scale-[1.05]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-sans text-[16px] font-black text-[#1552a6] tracking-tight leading-none">
            IASD Los Creadores
          </h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate">
            Sistema de Gestión
          </p>
        </div>
      </div>

      {/* Navigation List container with custom scrolled viewport */}
      <nav className="flex-1 space-y-4 overflow-y-auto pr-1 -mx-2 pl-2 overflow-x-hidden custom-scrollbar">
        
        {/* --- INICIO SECTION --- */}
        {isTabPermitted(Tab.DASHBOARD) && (
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveTab(Tab.DASHBOARD)}
              className={`w-full flex items-center justify-between px-3 py-2 transition-all rounded-lg text-left outline-none cursor-pointer ${
                activeTab === Tab.DASHBOARD
                  ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                  : "text-slate-600 hover:bg-[#f8fafc] hover:text-[#1552a6]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-3.8 h-3.8 shrink-0 text-[#1552a6]" />
                <span className="text-[11px] font-bold tracking-wide">Inicio</span>
              </div>
            </button>
          </div>
        )}

        {/* --- TESORERÍA SECTION --- */}
        {(isTabPermitted(Tab.TES_DEPARTAMENTOS_VER) ||
          isTabPermitted(Tab.TES_SOLICITUD_TRANS) ||
          isTabPermitted(Tab.TES_GESTION_TRANS) ||
          isTabPermitted(Tab.TES_INFORMES) ||
          isTabPermitted(Tab.TES_RESUMEN_FONDOS) ||
          isTabPermitted(Tab.TES_GESTION_FONDOS) ||
          isTabPermitted(Tab.TES_NUEVA_SOLICITUD) ||
          isTabPermitted(Tab.TES_RESUMEN_RENDICIONES) ||
          isTabPermitted(Tab.TES_GESTION_RENDICIONES) ||
          isTabPermitted(Tab.TES_NUEVA_RENDICIONES)) && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setTesoreriaOpen(!tesoreriaOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[9px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest text-left cursor-pointer outline-none"
            >
              <span>Tesorería</span>
              {tesoreriaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {tesoreriaOpen && (
              <div className="space-y-3 pl-1.5 border-l border-slate-100">
                
                {/* Grupo 1: Gestión e Informes */}
                {(isTabPermitted(Tab.TES_DEPARTAMENTOS_VER) || isTabPermitted(Tab.TES_CONCILIACION_BANCARIA) || isTabPermitted(Tab.TES_INFORMES)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Gestión e Informes</div>
                    {isTabPermitted(Tab.TES_DEPARTAMENTOS_VER) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_DEPARTAMENTOS_VER)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_DEPARTAMENTOS_VER
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate">Fondos de Tesorería</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_CONCILIACION_BANCARIA) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_CONCILIACION_BANCARIA)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_CONCILIACION_BANCARIA
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Landmark className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                        <span className="text-[11px] font-medium leading-none truncate">Conciliación Bancaria</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_INFORMES) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_INFORMES)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_INFORMES
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span className="text-[11px] font-medium leading-none truncate">Informes Financieros</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Grupo 1 y Grupo 2 */}
                {(isTabPermitted(Tab.TES_DEPARTAMENTOS_VER) || isTabPermitted(Tab.TES_CONCILIACION_BANCARIA) || isTabPermitted(Tab.TES_INFORMES)) &&
                 (isTabPermitted(Tab.TES_RESUMEN_FONDOS) || isTabPermitted(Tab.TES_GESTION_FONDOS) || isTabPermitted(Tab.TES_NUEVA_SOLICITUD)) && (
                  <hr className="border-t border-slate-200/90 my-2.5 mx-2" />
                )}

                {/* Grupo 2: Fondos por Rendir */}
                {(isTabPermitted(Tab.TES_RESUMEN_FONDOS) || isTabPermitted(Tab.TES_GESTION_FONDOS) || isTabPermitted(Tab.TES_NUEVA_SOLICITUD)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Fondos por Rendir</div>
                    {isTabPermitted(Tab.TES_RESUMEN_FONDOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_RESUMEN_FONDOS)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_RESUMEN_FONDOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate" title="Resumen Fondos por Rendir">Resumen Fondos por Rendir</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_GESTION_FONDOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_GESTION_FONDOS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_GESTION_FONDOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden font-sans">
                          <Shield className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                          <span className="text-[11px] font-medium leading-none truncate font-sans">Gestión Fondos por rendir</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_NUEVA_SOLICITUD) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_NUEVA_SOLICITUD)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_NUEVA_SOLICITUD
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate">Nueva Solicitud de Fondos</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Grupo 2 y Grupo 3 */}
                {((isTabPermitted(Tab.TES_RESUMEN_FONDOS) || isTabPermitted(Tab.TES_GESTION_FONDOS) || isTabPermitted(Tab.TES_NUEVA_SOLICITUD)) &&
                 (isTabPermitted(Tab.TES_RESUMEN_RENDICIONES) || isTabPermitted(Tab.TES_GESTION_RENDICIONES) || isTabPermitted(Tab.TES_NUEVA_RENDICIONES))) && (
                  <hr className="border-t border-slate-200/90 my-2.5 mx-2" />
                )}

                {/* Grupo 3: Rendición de Gastos */}
                {(isTabPermitted(Tab.TES_RESUMEN_RENDICIONES) || isTabPermitted(Tab.TES_GESTION_RENDICIONES) || isTabPermitted(Tab.TES_NUEVA_RENDICIONES)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Rendición de Gastos</div>
                    {isTabPermitted(Tab.TES_RESUMEN_RENDICIONES) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_RESUMEN_RENDICIONES)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_RESUMEN_RENDICIONES
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate" title="Resumen Rendiciones de Gastos">Resumen Rendiciones</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_GESTION_RENDICIONES) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_GESTION_RENDICIONES)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_GESTION_RENDICIONES
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden font-sans">
                          <FileCheck className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                          <span className="text-[11px] font-medium leading-none truncate">Gestión de Rendiciones</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_NUEVA_RENDICIONES) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_NUEVA_RENDICIONES)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_NUEVA_RENDICIONES
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate">Nueva Rendición</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Grupo 3 y Grupo 4 */}
                {((isTabPermitted(Tab.TES_RESUMEN_RENDICIONES) || isTabPermitted(Tab.TES_GESTION_RENDICIONES) || isTabPermitted(Tab.TES_NUEVA_RENDICIONES)) &&
                 (isTabPermitted(Tab.TES_SOLICITUD_TRANS) || isTabPermitted(Tab.TES_GESTION_TRANS))) && (
                  <hr className="border-t border-slate-200/90 my-2.5 mx-2" />
                )}

                {/* Grupo 4: Transferencias */}
                {(isTabPermitted(Tab.TES_SOLICITUD_TRANS) || isTabPermitted(Tab.TES_GESTION_TRANS)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Transferencias</div>
                    {isTabPermitted(Tab.TES_SOLICITUD_TRANS) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_SOLICITUD_TRANS)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_SOLICITUD_TRANS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate" title="Solicitud de Transferencias entre Departamentos (Directores)">Solicitud Transferencias</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.TES_GESTION_TRANS) && (
                      <button
                        onClick={() => setActiveTab(Tab.TES_GESTION_TRANS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.TES_GESTION_TRANS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Landmark className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Transferencias entre Departamentos">Gestión Transferencias</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* --- SECRETARÍA SECTION --- */}
        {(isTabPermitted(Tab.SEC_ACTAS_BOARD) ||
          isTabPermitted(Tab.SEC_SUBIR_ACTA) ||
          isTabPermitted(Tab.SEC_BALANCES_BOARD) ||
          isTabPermitted(Tab.SEC_SOLICITUD_VOTOS) ||
          isTabPermitted(Tab.SEC_GESTION_VOTOS) ||
          isTabPermitted(Tab.SEC_VOTOS_APROBADOS) ||
          isTabPermitted(Tab.SEC_CALENDARIO) ||
          isTabPermitted(Tab.SEC_SOLICITAR_EVENTO_DIRECTOR) ||
          isTabPermitted(Tab.SEC_GESTION_EVENTOS)) && (
          <div className="space-y-1">
            <button
               type="button"
              onClick={() => setSecretariaOpen(!secretariaOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[9px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest text-left cursor-pointer outline-none"
            >
              <span>Secretaría</span>
              {secretariaOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {secretariaOpen && (
              <div className="space-y-3 pl-1.5 border-l border-slate-100">
                
                {/* Grupo 1: Actas y Balances */}
                {(isTabPermitted(Tab.SEC_ACTAS_BOARD) || isTabPermitted(Tab.SEC_SUBIR_ACTA) || isTabPermitted(Tab.SEC_BALANCES_BOARD) || isTabPermitted(Tab.SEC_SUBIR_BALANCE)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Actas y Balances</div>
                    {isTabPermitted(Tab.SEC_ACTAS_BOARD) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_ACTAS_BOARD)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_ACTAS_BOARD
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-slate-450" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Actas Junta Directiva">Actas Junta Directiva</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_SUBIR_ACTA) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_SUBIR_ACTA)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_SUBIR_ACTA
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Plus className="w-3.5 h-3.5 shrink-0 text-slate-450" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Subir Nueva Acta">Subir Nueva Acta</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_BALANCES_BOARD) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_BALANCES_BOARD)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_BALANCES_BOARD
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Landmark className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Visualización de Balances">Balances de Tesorería</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_SUBIR_BALANCE) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_SUBIR_BALANCE)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_SUBIR_BALANCE
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Plus className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Nuevo Balance de Tesorería">Nuevo Balance</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Grupo 1 y Grupo 2 */}
                {(isTabPermitted(Tab.SEC_ACTAS_BOARD) || isTabPermitted(Tab.SEC_SUBIR_ACTA) || isTabPermitted(Tab.SEC_BALANCES_BOARD) || isTabPermitted(Tab.SEC_SUBIR_BALANCE)) &&
                 (isTabPermitted(Tab.SEC_SOLICITUD_VOTOS) || isTabPermitted(Tab.SEC_GESTION_VOTOS) || isTabPermitted(Tab.SEC_VOTOS_APROBADOS)) && (
                  <hr className="border-t border-slate-200/90 my-2.5 mx-2" />
                )}

                {/* Grupo 2: Votos y Resoluciones */}
                {(isTabPermitted(Tab.SEC_SOLICITUD_VOTOS) || isTabPermitted(Tab.SEC_GESTION_VOTOS) || isTabPermitted(Tab.SEC_VOTOS_APROBADOS)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Votos y Resoluciones</div>
                    {isTabPermitted(Tab.SEC_SOLICITUD_VOTOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_SOLICITUD_VOTOS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_SOLICITUD_VOTOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ListTodo className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Solicitar Voto Junta">Solicitar Voto Junta</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_GESTION_VOTOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_GESTION_VOTOS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_GESTION_VOTOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Sliders className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Gobernación / Gestión de Votos">Gestión de Votos (Sec.)</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_VOTOS_APROBADOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_VOTOS_APROBADOS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_VOTOS_APROBADOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <CheckSquare className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Votos de Junta Aprobados">Votos Aprobados</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Grupo 2 y Grupo 3 */}
                {((isTabPermitted(Tab.SEC_SOLICITUD_VOTOS) || isTabPermitted(Tab.SEC_GESTION_VOTOS) || isTabPermitted(Tab.SEC_VOTOS_APROBADOS)) &&
                 (isTabPermitted(Tab.SEC_CALENDARIO) || isTabPermitted(Tab.SEC_SOLICITAR_EVENTO_DIRECTOR) || isTabPermitted(Tab.SEC_GESTION_EVENTOS))) && (
                  <hr className="border-t border-slate-200/90 my-2.5 mx-2" />
                )}

                {/* Grupo 3: Actividades y Calendario */}
                {(isTabPermitted(Tab.SEC_CALENDARIO) || isTabPermitted(Tab.SEC_SOLICITAR_EVENTO_DIRECTOR) || isTabPermitted(Tab.SEC_GESTION_EVENTOS)) && (
                  <div className="space-y-0.5">
                    <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-3/1 pt-1 pb-1 uppercase tracking-wider block">Actividades y Calendario</div>
                    {isTabPermitted(Tab.SEC_CALENDARIO) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_CALENDARIO)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_CALENDARIO
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="text-[11px] font-medium leading-none truncate">Calendario</span>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_SOLICITAR_EVENTO_DIRECTOR) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_SOLICITAR_EVENTO_DIRECTOR)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_SOLICITAR_EVENTO_DIRECTOR
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Plus className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Solicitud de Evento">Solicitud Evento</span>
                        </div>
                      </button>
                    )}

                    {isTabPermitted(Tab.SEC_GESTION_EVENTOS) && (
                      <button
                        onClick={() => setActiveTab(Tab.SEC_GESTION_EVENTOS)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                          activeTab === Tab.SEC_GESTION_EVENTOS
                            ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <ListTodo className="w-3.5 h-3.5 shrink-0 text-slate-450" />
                          <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Eventos">Gestión de Eventos</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Separador entre Actividades y Recursos */}
                <hr className="border-t border-slate-200/90 my-2.5 mx-2" />

                {/* Recursos Oficiales */}
                <div className="space-y-0.5">
                  <div className="text-[8.5px] font-bold text-slate-400 opacity-90 px-1 pt-1 pb-1 uppercase tracking-wider block">Materiales y Guías</div>
                  <button
                    onClick={() => setActiveTab(Tab.RECURSOS_DOCUMENTOS)}
                    type="button"
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      activeTab === Tab.RECURSOS_DOCUMENTOS
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span className="text-[11px] font-medium leading-none truncate" title="Recursos y Documentos Oficiales">Recursos y Documentos</span>
                  </button>

                  {(currentUser?.roles.some(r => 
                    r.toLowerCase().includes("tesorero") || 
                    r.toLowerCase().includes("secretar")
                  ) ?? false) && (
                    <button
                      onClick={() => setActiveTab(Tab.RECURSOS_DOCUMENTOS_GESTION)}
                      type="button"
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                        activeTab === Tab.RECURSOS_DOCUMENTOS_GESTION
                          ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Recursos de la Iglesia">Gestión de Recursos</span>
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* --- CONFIGURACIÓN SECTION --- */}
        {(isTabPermitted(Tab.CONF_MI_PERFIL) ||
          isTabPermitted(Tab.CONF_USUARIOS) ||
          isTabPermitted(Tab.CONF_CARGOS) ||
          isTabPermitted(Tab.CONF_DEPARTAMENTOS_EDIT) ||
          isTabPermitted(Tab.CONF_DEPARTAMENTOS_CATEGORIAS)) && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setConfigOpen(!configOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[9px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest text-left cursor-pointer outline-none"
            >
              <span>Configuración</span>
              {configOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {configOpen && (
              <div className="space-y-0.5 pl-1.5 border-l border-slate-100">
                
                {/* Gestión de Usuarios */}
                {isTabPermitted(Tab.CONF_USUARIOS) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_USUARIOS)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_USUARIOS
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Key className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Usuarios">Gestión de Usuarios</span>
                    </div>
                  </button>
                )}

                {/* Gestión de Cargos */}
                {isTabPermitted(Tab.CONF_CARGOS) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_CARGOS)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_CARGOS
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <UserCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Gestión de cargos (Roles)">Gestión de Cargos</span>
                    </div>
                  </button>
                )}

                {/* Gestión de Departamentos */}
                {isTabPermitted(Tab.CONF_DEPARTAMENTOS_CATEGORIAS) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_DEPARTAMENTOS_CATEGORIAS)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_DEPARTAMENTOS_CATEGORIAS
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Boxes className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Departamentos (Grupos de Fondos)">Gestión de Departamentos</span>
                    </div>
                  </button>
                )}

                {/* Gestión de Fondos de Tesorería */}
                {isTabPermitted(Tab.CONF_DEPARTAMENTOS_EDIT) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_DEPARTAMENTOS_EDIT)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_DEPARTAMENTOS_EDIT
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Folder className="w-3.5 h-3.5 shrink-0 text-[#1552a6]" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Gestión de Fondos de Tesorería">Gestión de Fondos de Tesorería</span>
                    </div>
                  </button>
                )}

                {/* Listas Desplegables */}
                {isTabPermitted(Tab.CONF_DYNAMIC_LISTS) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_DYNAMIC_LISTS)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_DYNAMIC_LISTS
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Sliders className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Configurar Listas Desplegables">Configurar Listas Desplegables</span>
                    </div>
                  </button>
                )}

                {/* Asociación Google Drive */}
                {isTabPermitted(Tab.CONF_GOOGLE_DRIVE) && (
                  <button
                    onClick={() => setActiveTab(Tab.CONF_GOOGLE_DRIVE)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                      activeTab === Tab.CONF_GOOGLE_DRIVE
                        ? "bg-[#eef4fc] text-[#1552a6] font-extrabold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Cloud className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="text-[11px] font-medium leading-none truncate" title="Asociación Google Drive">Asociación Google Drive</span>
                    </div>
                  </button>
                )}

              </div>
            )}
          </div>
        )}

      </nav>

      {/* User Profile Card at Bottom */}
      <div className="mt-auto pt-2 shrink-0 md:hidden lg:hidden">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 flex items-center gap-2 border border-slate-200/80 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-[#1552a6]/10 flex items-center justify-center text-[#1552a6] text-xxs font-bold shrink-0 shadow-inner overflow-hidden border border-slate-200">
            {currentUser.imageUrl ? (
              <img 
                src={currentUser.imageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full pointer-events-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              currentUser.avatarLetter
            )}
          </div>
          <div className="overflow-hidden flex-1 select-none leading-tight">
            <p className="text-[10px] font-extrabold text-slate-700 truncate">
              {currentUser.name}
            </p>
            <p className="text-[8px] text-[#1552a6] font-black truncate uppercase mt-0.5 opacity-90">
              {currentUser.roles[0]}
            </p>
          </div>
          <button 
            onClick={onLogout}
            type="button"
            title="Cerrar sesión"
            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer outline-none border-none"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </aside>
    </>
  );
};
