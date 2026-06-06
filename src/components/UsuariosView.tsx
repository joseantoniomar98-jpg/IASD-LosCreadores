/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Department, Cargo, UserRole } from "../types";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Users, Search, Plus, Trash2, Edit3, ShieldAlert, Check, X, ShieldCheck, 
  Briefcase, Shield, Key, FileText, Calendar, DollarSign, RefreshCw, Layers,
  Copy, Mail, Lock, Send, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Definitions of granular permissions for Position/Cargo configuration
const PERMISSIONS_LIST = [
  { key: "ver_resumen_inicio", label: "Inicio y Resumen", description: "Acceso al panel principal y resumen de saldos" },
  { key: "ver_planilla_departamentos", label: "Planilla de Departamentos", description: "Permite ver topes y presupuestos consumidos" },
  { key: "ver_todos_departamentos", label: "Acceso a todos los Departamentos", description: "Permite acceder y visualizar la información de todos los departamentos en lugar de solo los asignados" },
  { key: "solicitar_gasto_adelanto", label: "Solicitar Adelantos de Fondos", description: "Crear solicitudes de fondos y rendiciones" },
  { key: "autorizar_solicitudes_fondos", label: "Autorizar Solicitudes & Rendiciones", description: "Aprobar u observar solicitudes financieras" },
  { key: "gestionar_transferencias_presupuesto", label: "Transferir Presupuestos", description: "Traspasar presupuesto entre departamentos" },
  { key: "ver_informes_financieros", label: "Informes Financieros", description: "Acceder a reportes, depto, históricos" },
  { key: "ver_actas_junta", label: "Ver Actas de Junta", description: "Visualizar resoluciones de junta cargadas" },
  { key: "cargar_actas_junta", label: "Subir Actas de Junta", description: "Subir actas firmadas y aprobadas en junta" },
  { key: "gestionar_calendario_sesiones", label: "Gestionar Calendario & Recintos", description: "Programar juntas y reservas de espacios" },
  { key: "configuracion_sistema", label: "Configurar Usuarios, Cargos y Deptos", description: "Acceso administrativo para cambiar políticas de topes" },
  
  // GRANULAR MENU PAGES ACCESS
  { key: "menu_inicio", label: "Página: Inicio y Dashboard", description: "Permitir ver el Inicio de Tesorería" },
  { key: "menu_planilla", label: "Página: Planilla de Fondos", description: "Permitir ver la Planilla de Consumos por Depto" },
  { key: "menu_nueva_solicitud", label: "Página: Nueva Solicitud de Fondos", description: "Permitir redactar nuevas solicitudes de fondos" },
  { key: "menu_resumen_solicitudes", label: "Página: Resumen de Solicitudes", description: "Permitir ver el histórico personal de adelantos solicitado" },
  { key: "menu_gestion_solicitudes", label: "Página: Gestión de Solicitudes", description: "Permitir la bandeja de auditoría/revisión de tesorería" },
  { key: "menu_nueva_rendicion", label: "Página: Nueva Rendición de Gastos", description: "Permitir rendar boletas/facturas" },
  { key: "menu_resumen_rendiciones", label: "Página: Resumen de Rendiciones", description: "Permitir revisar estados de comprobantes rendidos" },
  { key: "menu_gestion_rendiciones", label: "Página: Gestión de Rendiciones", description: "Permitir auditar rendiciones recibidas" },
  { key: "menu_conciliacion", label: "Página: Conciliaciones & Arqueos", description: "Acceso directo a conciliación de cartola bancaria" },
  { key: "menu_transferencias", label: "Página: Gestión de Transferencias", description: "Acceso a historial de transferencias realizadas" },
  { key: "menu_ver_actas", label: "Página: Ver Actas de Junta", description: "Acceso visual al repositorio de actas de junta distritales" },
  { key: "menu_subir_actas", label: "Página: Subir Actas Firmadas", description: "Acceso para subir archivos de resoluciones oficiales" },
  { key: "menu_ver_balances", label: "Página: Ver Balances de Tesorería", description: "Acceso para visualizar informes de caja mensual" },
  { key: "menu_subir_balances", label: "Página: Subir Balances Mensuales", description: "Acceso facultativo para archivar balances mensuales" },
  { key: "menu_ver_votos", label: "Página: Libro de Secretaría", description: "Permitir ver el libro con el registro general de votos" },
  { key: "menu_gestionar_votos", label: "Página: Gestión de Votos", description: "Permitir crear propuestas y someterlas a escutrinio" },
  { key: "menu_canales_firmas", label: "Página: Canales de Firmas Pastorales", description: "Acceso al panel de estampas de firmas distritales" },
  { key: "menu_calendario", label: "Página: Consultar Calendario", description: "Acceso a ver el calendario distrital de sesiones" },
  { key: "menu_reservar_espacios", label: "Página: Solicitar Uso de Recinto", description: "Acceso para reservar templos o salones multiuso" },
  { key: "menu_atender_eventos", label: "Página: Aprobación de Eventos", description: "Acceso para confirmar o rechazar solicitudes de recintos" }
];

interface UsuariosProps {
  users: User[];
  onAddUser: (u: User) => void;
  onToggleUserStatus: (id: string) => void;
  onModifyUserRoles: (id: string, roles: string[]) => void;
  onUpdateUser?: (u: User) => void;
  
  // Cargos management props
  cargos?: Cargo[];
  onCreateCargo?: (c: Cargo) => void;
  onUpdateCargo?: (c: Cargo) => void;
  onDeleteCargo?: (id: string) => void;
  
  // Mode/Tab context
  mode?: "usuarios" | "cargos";
  departments?: Department[];
  categories?: string[];
  categoryColors?: Record<string, string>;
}

export const UsuariosView: React.FC<UsuariosProps> = ({
  users,
  onAddUser,
  onToggleUserStatus,
  onModifyUserRoles,
  onUpdateUser,
  cargos = [],
  onCreateCargo,
  onUpdateCargo,
  onDeleteCargo,
  mode = "usuarios",
  departments = [],
  categories = [],
  categoryColors = {}
}) => {
  const [localUsers, setLocalUsers] = useState<User[]>(users);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as User);
      });
      if (items.length > 0) {
        setLocalUsers(items);
      }
    }, (error) => {
      console.error("Error subscribing to users in UsuariosView:", error);
    });
    return () => unsubscribe();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showAddCargoModal, setShowAddCargoModal] = useState(false);
  const [showEditCargoModal, setShowEditCargoModal] = useState(false);

  // --- NEW USER FORM STATE ---
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRoles, setNewUserRoles] = useState<string[]>([]);
  const [newUserDepts, setNewUserDepts] = useState<string[]>(["Ministerio General"]);
  const [newUserActive, setNewUserActive] = useState(true);
  const [newUserMiembroDeJunta, setNewUserMiembroDeJunta] = useState(false);
  const [newUserImageUrl, setNewUserImageUrl] = useState("");

  // --- EDIT USER FORM STATE ---
  const [editUserId, setEditUserId] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRoles, setEditUserRoles] = useState<string[]>([]);
  const [editUserDepts, setEditUserDepts] = useState<string[]>([]);
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserMiembroDeJunta, setEditUserMiembroDeJunta] = useState(false);
  const [editUserImageUrl, setEditUserImageUrl] = useState("");

  // --- NEW CARGO FORM STATE ---
  const [newCargoName, setNewCargoName] = useState("");
  const [newCargoDescription, setNewCargoDescription] = useState("");
  const [newCargoPermissions, setNewCargoPermissions] = useState<string[]>([]);

  // --- EDIT CARGO FORM STATE ---
  const [editCargoId, setEditCargoId] = useState("");
  const [editCargoName, setEditCargoName] = useState("");
  const [editCargoDescription, setEditCargoDescription] = useState("");
  const [editCargoPermissions, setEditCargoPermissions] = useState<string[]>([]);

  // --- SUBSTANTIAL STATE FOR SUCCESSFUL CREATION & RECOVERY ---
  const [createdUserCreds, setCreatedUserCreds] = useState<{ name: string; email: string; password?: string; roles: string[]; depts: string[] } | null>(null);
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [showPasswordInRecovery, setShowPasswordInRecovery] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);


  // --- FILTERED DATA FOR BOTH MODES ---
  const filteredUsers = localUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.roles.some(r => r.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.departments.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCargos = cargos.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- HANDLERS FOR USERS ---
  const handleOpenAddUser = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPhone("");
    setNewUserPassword("");
    setNewUserImageUrl("");
    // Default roles to first available cargo if any, or "Director de Departamento"
    if (cargos.length > 0) {
      setNewUserRoles([cargos[0].name]);
    } else {
      setNewUserRoles(["Director de Departamento"]);
    }
    setNewUserDepts(categories.length > 0 ? [categories[0]] : ["Administración"]);
    setNewUserActive(true);
    setNewUserMiembroDeJunta(false);
    setShowAddUserModal(true);
  };

  const startSimulatedMailDelivery = (recipientEmail: string) => {
    setSendingEmail(true);
    setSendLogs([
      "🔄 Conectando al retransmisor SMTP seguro (dns: mail.iasddistrito.org)...",
      "🔑 Autenticando canal con firma digital DKIM / SPF...",
      "📄 Compilando plantilla HTML institucional con credenciales...",
      "📤 Transfiriendo paquete cifrado (StartTLS) al puerto 587..."
    ]);
    setTimeout(() => {
      setSendLogs(prev => [
         ...prev,
         "✉️ Paquete de datos transferido exitosamente.",
         `✅ Éxito: Notificación de acceso enviada al buzón: ${recipientEmail}`
      ]);
      setSendingEmail(false);
    }, 1500);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      alert("Por favor, ingrese el nombre y el correo del usuario.");
      return;
    }
    if (newUserRoles.length === 0) {
      alert("Por favor, seleccione al menos un rol o cargo.");
      return;
    }
    if (newUserDepts.length === 0) {
      alert("Por favor, asigne al menos un departamento al usuario.");
      return;
    }

    // Auto-generate safe temporary password if not provided
    const finalPassword = newUserPassword || "Iasd." + Math.floor(1000 + Math.random() * 9000) + "!";

    const newUserObj: User = {
      id: "u-" + (users.length + 10),
      name: newUserName,
      email: newUserEmail,
      phone: newUserPhone || undefined,
      password: finalPassword,
      roles: newUserRoles,
      departments: newUserDepts,
      active: newUserActive,
      miembroDeJunta: newUserMiembroDeJunta,
      imageUrl: newUserImageUrl || undefined,
      avatarLetter: newUserName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
    };

    onAddUser(newUserObj);
    setShowAddUserModal(false);
    
    // Open credentials summary & trigger mailing logs
    setCreatedUserCreds({
      name: newUserName,
      email: newUserEmail,
      password: finalPassword,
      roles: newUserRoles,
      depts: newUserDepts
    });
    startSimulatedMailDelivery(newUserEmail);
  };

  const handleOpenEditUser = (u: User) => {
    setEditUserId(u.id);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserPhone(u.phone || "");
    setEditUserPassword(u.password || "•••••••••");
    setEditUserRoles(u.roles);
    setEditUserDepts(u.departments);
    setEditUserActive(u.active);
    setEditUserMiembroDeJunta(u.miembroDeJunta || false);
    setEditUserImageUrl(u.imageUrl || "");
    setShowEditUserModal(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserName || !editUserEmail) {
      alert("Por favor, complete los campos de nombre y correo.");
      return;
    }
    if (editUserRoles.length === 0) {
      alert("Por favor, asigne al menos un rol.");
      return;
    }
    if (editUserDepts.length === 0) {
      alert("Por favor, asigne al menos un departamento.");
      return;
    }

    if (onUpdateUser) {
      const orig = users.find(u => u.id === editUserId);
      onUpdateUser({
        ...orig,
        id: editUserId,
        name: editUserName,
        email: editUserEmail,
        phone: editUserPhone || undefined,
        password: editUserPassword === "•••••••••" ? orig?.password : (editUserPassword || undefined),
        roles: editUserRoles,
        departments: editUserDepts,
        active: editUserActive,
        miembroDeJunta: editUserMiembroDeJunta,
        imageUrl: editUserImageUrl || undefined,
        avatarLetter: editUserName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
      } as User);
      alert(`¡Usuario "${editUserName}" actualizado exitosamente!`);
      setShowEditUserModal(false);
    } else {
      onModifyUserRoles(editUserId, editUserRoles);
      setShowEditUserModal(false);
    }
  };

  const handleToggleAddUserRole = (role: string) => {
    if (newUserRoles.includes(role)) {
      setNewUserRoles(newUserRoles.filter(r => r !== role));
    } else {
      setNewUserRoles([...newUserRoles, role]);
    }
  };

  const handleToggleEditUserRole = (role: string) => {
    if (editUserRoles.includes(role)) {
      setEditUserRoles(editUserRoles.filter(r => r !== role));
    } else {
      setEditUserRoles([...editUserRoles, role]);
    }
  };

  const handleToggleAddUserDept = (dept: string) => {
    if (newUserDepts.includes(dept)) {
      setNewUserDepts(newUserDepts.filter(d => d !== dept));
    } else {
      setNewUserDepts([...newUserDepts, dept]);
    }
  };

  const handleToggleEditUserDept = (dept: string) => {
    if (editUserDepts.includes(dept)) {
      setEditUserDepts(editUserDepts.filter(d => d !== dept));
    } else {
      setEditUserDepts([...editUserDepts, dept]);
    }
  };

  // --- HANDLERS FOR CARGOS ---
  const handleOpenAddCargo = () => {
    setNewCargoName("");
    setNewCargoDescription("");
    setNewCargoPermissions(["ver_resumen_inicio"]);
    setShowAddCargoModal(true);
  };

  const handleCreateCargoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCargoName) {
      alert("Por favor, proporcione un nombre para el cargo.");
      return;
    }
    
    if (onCreateCargo) {
      const newCargoObj: Cargo = {
        id: "cg-" + (cargos.length + 10),
        name: newCargoName,
        description: newCargoDescription,
        permissions: newCargoPermissions
      };
      onCreateCargo(newCargoObj);
      alert(`Cargo "${newCargoName}" creado exitosamente.`);
      setShowAddCargoModal(false);
    }
  };

  const handleOpenEditCargo = (c: Cargo) => {
    setEditCargoId(c.id);
    setEditCargoName(c.name);
    setEditCargoDescription(c.description);
    setEditCargoPermissions(c.permissions);
    setShowEditCargoModal(true);
  };

  const handleEditCargoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCargoName) {
      alert("Por favor, proporcione un nombre para el cargo.");
      return;
    }

    if (onUpdateCargo) {
      onUpdateCargo({
        id: editCargoId,
        name: editCargoName,
        description: editCargoDescription,
        permissions: editCargoPermissions
      });
      alert(`Cargo "${editCargoName}" actualizado exitosamente.`);
      setShowEditCargoModal(false);
    }
  };

  const handleToggleAddCargoPermission = (permKey: string) => {
    if (newCargoPermissions.includes(permKey)) {
      setNewCargoPermissions(newCargoPermissions.filter(p => p !== permKey));
    } else {
      setNewCargoPermissions([...newCargoPermissions, permKey]);
    }
  };

  const handleToggleEditCargoPermission = (permKey: string) => {
    if (editCargoPermissions.includes(permKey)) {
      setEditCargoPermissions(editCargoPermissions.filter(p => p !== permKey));
    } else {
      setEditCargoPermissions([...editCargoPermissions, permKey]);
    }
  };

  const handleDeleteCargoPrompt = (c: Cargo) => {
    // Basic guard so system doesn't delete critical default roles easily
    const defaults = ["Tesorero Central", "Tesorero Local", "Pastor Distrital", "Anciano Consejero"];
    if (defaults.includes(c.name)) {
      if (!confirm(`El cargo "${c.name}" es fundamental para el sistema de seguridad. ¿Está seguro de que desea eliminarlo de todos modos?`)) {
        return;
      }
    } else {
      if (!confirm(`¿Está seguro de que desea eliminar el cargo "${c.name}"? Los usuarios asociados perderán este rol.`)) {
        return;
      }
    }

    if (onDeleteCargo) {
      onDeleteCargo(c.id);
      alert(`Cargo "${c.name}" eliminado.`);
    }
  };


  return (
    <div className="space-y-6 text-left">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>ADMINISTRACIÓN</span>
            <span>/</span>
            <span className="text-secondary font-bold uppercase">
              {mode === "usuarios" ? "GESTIÓN DE USUARIOS" : "GESTIÓN DE CARGOS"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-primary mt-1">
            {mode === "usuarios" ? "Planilla de Usuarios y Roles" : "Cargos de la Organización y Permisos"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {mode === "usuarios" 
              ? "Registre cuentas del personal ministerial, asigne sus ministerios, limitando accesos."
              : "Asigne permisos granulares de lectura o edición de la tesorería a cada rol de junta."}
          </p>
        </div>

        {/* Add button depending on mode */}
        {mode === "usuarios" ? (
          <button 
            onClick={handleOpenAddUser}
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow select-none"
          >
            <Plus className="w-4 h-4" /> Registrar Nuevo Miembro
          </button>
        ) : (
          <button 
            onClick={handleOpenAddCargo}
            className="px-5 py-2.5 bg-secondary text-white hover:bg-opacity-90 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow select-none"
          >
            <Plus className="w-4 h-4" /> Crear Nuevo Cargo
          </button>
        )}
      </div>

      {/* Database active search query */}
      <div className="relative select-all">
        <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder={mode === "usuarios" 
            ? "Buscar por nombre, correo electrónico, rol o departamento..."
            : "Buscar cargos por nombre o responsabilidades de rol..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 h-11 rounded-xl border border-outline-variant bg-white text-xs outline-none focus:ring-1 focus:ring-secondary transition-all font-semibold shadow-sm"
        />
      </div>

      {/* --- MODE: USUARIOS TABLE --- */}
      {mode === "usuarios" && (
        <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm overflow-hidden select-none">
          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] text-[10px] text-on-surface-variant font-bold uppercase tracking-wider border-b border-outline-variant/35">
                <tr>
                  <th className="px-6 py-4">Colaborador / Cuenta</th>
                  <th className="px-6 py-4">Roles de Autorización</th>
                  <th className="px-6 py-4">Departamentos Asignados</th>
                  <th className="px-6 py-4 text-center">Estado Directivo</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/25">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-outline font-bold">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-extrabold shadow-inner overflow-hidden uppercase border border-primary/10">
                          {u.imageUrl ? (
                            <img src={u.imageUrl} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                          ) : (
                            u.avatarLetter || u.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h5 className="font-extrabold text-primary text-sm leading-tight">{u.name}</h5>
                          <span className="text-[10px] text-outline font-medium">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {u.roles.map(r => (
                            <span key={r} className="bg-primary-container text-primary px-2 py-0.5 rounded text-[10px] font-bold border border-primary/5">
                              {r}
                            </span>
                          ))}
                          {u.miembroDeJunta && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm inline-flex items-center gap-0.5" title="Acceso priorizado a Actas de Junta">
                              ★ Miembro de Junta
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface-variant">
                        <div className="flex flex-wrap gap-1 text-[11px] font-bold text-on-surface">
                          {u.departments.map((d, idx) => {
                            const customColor = categoryColors[d] || "#2563eb";
                            return (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 rounded text-[10px] font-sans font-bold shadow-sm inline-flex items-center"
                                style={{ 
                                  backgroundColor: `${customColor}12`, 
                                  color: customColor, 
                                  border: `1px solid ${customColor}25`
                                }}
                              >
                                {d}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => onToggleUserStatus(u.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                            u.active 
                              ? "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/10" 
                              : "bg-surface-container-high text-outline border-outline-variant/20"
                          }`}
                          title="Hacer clic para alternar Estado Directivo"
                        >
                          {u.active ? "● ACTIVO" : "○ INACTIVO"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 hover:bg-surface-container rounded-lg text-primary transition-colors flex items-center justify-center hover:scale-105"
                            title="Editar todos los atributos de la cuenta"
                          >
                            <Edit3 className="w-4.5 h-4.5" />
                          </button>
                          
                          <button 
                            onClick={() => {
                              setRecoveryUser(u);
                              setSendLogs([]);
                              setSendingEmail(false);
                              setShowPasswordInRecovery(false);
                            }}
                            className="p-1.5 hover:bg-surface-container rounded-lg text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center hover:scale-105"
                            title="Ayuda de Recuperación de Clave (Restablecer Acceso)"
                          >
                            <Key className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODE: CARGOS ROLES GRID --- */}
      {mode === "cargos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCargos.length === 0 ? (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant p-10 text-center text-outline font-bold">
              No se encontraron cargos de junta creados. Registre uno nuevo para empezar.
            </div>
          ) : (
            filteredCargos.map((cargo) => (
              <div 
                key={cargo.id} 
                className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-5 space-y-4 flex flex-col justify-between hover:border-secondary/40 transition-all text-sm block"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-secondary/10 rounded-xl text-secondary">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#1a2530] text-base leading-tight">{cargo.name}</h4>
                        <p className="text-[10px] font-bold text-outline uppercase tracking-wider font-mono">Código: {cargo.id}</p>
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleOpenEditCargo(cargo)}
                        className="p-1.5 hover:bg-[#f1f4f7] rounded-lg text-primary transition-colors"
                        title="Modificar atributos y permisos de este cargo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCargoPrompt(cargo)}
                        className="p-1.5 hover:bg-error-fixed text-destructive rounded-lg transition-colors"
                        title="Eliminar cargo de la junta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed bg-[#f8fafc] p-2.5 rounded-lg border border-outline-variant/20 italic select-none">
                    "{cargo.description || "Sin descripción de responsabilidades ministeriales."}"
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline select-none">
                    <span className="text-[10px] font-black uppercase text-outline tracking-wider flex items-center gap-1">
                      <Key className="w-3 h-3 text-secondary" /> Privilegios Habilitados ({cargo.permissions.length})
                    </span>
                  </div>

                  {/* Badges of permissions */}
                  <div className="flex flex-wrap gap-1.5">
                    {cargo.permissions.length === 0 ? (
                      <span className="text-[11px] text-destructive font-bold bg-error-fixed/10 px-2 py-1 rounded">
                        ⚠️ Sin Accesos (Nivel Bloqueado)
                      </span>
                    ) : (
                      cargo.permissions.map(pKey => {
                        const pm = PERMISSIONS_LIST.find(p => p.key === pKey);
                        return (
                          <span 
                            key={pKey} 
                            className="bg-[#f0f4f9] text-[#2c3e50] border border-outline-variant/30 px-2 py-0.5 rounded text-[10px] font-bold font-sans flex items-center gap-1 hover:bg-[#e2e8f0] transition-colors cursor-help"
                            title={pm?.description || pKey}
                          >
                            <Shield className="w-2.5 h-2.5 text-secondary shrink-0" />
                            {pm?.label || pKey}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Users holding this role info */}
                <div className="pt-3 border-t border-outline-variant/20 text-[11px] select-none text-on-surface-variant flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-outline" />
                  <span>Miembros vinculados:</span>
                  <span className="font-extrabold text-primary">
                    {users.filter(u => u.roles.includes(cargo.name)).length} colaboradores
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}


      {/* POPUP MODAL: ADD NEW USER (CON ROLES Y DEPARTAMENTOS MULTIPLES) */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowAddUserModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-outline-variant/40 z-10"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-5 h-5 text-secondary shrink-0" /> Registrar Miembro Completo
                </h4>
                <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs font-sans text-left">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Samuel Robert"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Correo Electrónico</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@ejemplo.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Teléfono de Contacto</label>
                    <input 
                      type="text" 
                      placeholder="+56 9 1234 5678"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Contraseña de Acceso</label>
                    <input 
                      type="password" 
                      placeholder="Asigne una contraseña"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    />
                  </div>
                </div>

                {/* Foto de Perfil */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block mb-1">Foto de Perfil (Opcional - URL o Subir Archivo)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/mifoto.jpg"
                      value={newUserImageUrl}
                      onChange={(e) => setNewUserImageUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-xs outline-none font-medium text-primary font-mono placeholder:font-sans" 
                    />
                    <label className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0">
                      Subir
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => setNewUserImageUrl(r.result as string);
                            r.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {newUserImageUrl && (
                    <div className="flex items-center gap-2 mt-2 select-none">
                      <div className="w-10 h-10 rounded-full border border-slate-300 overflow-hidden shrink-0">
                        <img src={newUserImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-slate-500 overflow-hidden text-ellipsis line-clamp-1 flex-1 font-mono">{newUserImageUrl.substring(0, 48)}...</span>
                      <button 
                        type="button" 
                        onClick={() => setNewUserImageUrl("")} 
                        className="text-[10px] text-red-600 font-extrabold uppercase hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                {/* ASIGNACIÓN DE ROLES (MULTIPLE) */}
                <div className="space-y-1 my-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Cargos o Roles Directivos <span className="text-secondary font-black">(Seleccione uno o más)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {cargos.length === 0 ? (
                      <p className="col-span-2 text-outline text-[11px] p-2">No hay cargos configurados.</p>
                    ) : (
                      cargos.map(cargo => (
                        <label 
                          key={cargo.id} 
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded border border-transparent hover:border-outline-variant/30 cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox" 
                            checked={newUserRoles.includes(cargo.name)}
                            onChange={() => handleToggleAddUserRole(cargo.name)}
                            className="w-3.5 h-3.5 text-secondary border-outline rounded"
                          />
                          <span className="text-[11px] font-bold text-primary leading-tight">{cargo.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* ASIGNACIÓN DE DEPARTAMENTOS (MULTIPLE) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Departamentos Asignados / Ministerios <span className="text-secondary font-black">(Seleccione uno o más)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {categories.length === 0 ? (
                      <p className="col-span-2 text-outline text-[11px] p-2">No hay departamentos de iglesia registrados.</p>
                    ) : (
                      categories.map(cat => (
                        <label 
                          key={cat} 
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded border border-transparent hover:border-outline-variant/30 cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox" 
                            checked={newUserDepts.includes(cat)}
                            onChange={() => handleToggleAddUserDept(cat)}
                            className="w-3.5 h-3.5 text-secondary border-outline rounded"
                          />
                          <span className="text-[11px] font-semibold text-on-surface leading-tight">{cat}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* MIEMBRO DE JUNTA ACCESO DIRECTO */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50 flex justify-between items-center select-none">
                  <div>
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Miembro de Junta Directiva
                    </p>
                    <p className="text-[10px] text-amber-700/80 mt-0.5">Habilita acceso directo de visualización confidencial de actas y resoluciones.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newUserMiembroDeJunta} 
                      onChange={(e) => setNewUserMiembroDeJunta(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* ESTADO DE LA CUENTA */}
                <div className="p-3 bg-secondary-fixed/20 rounded-lg border border-outline-variant/20 flex justify-between items-center select-none">
                  <div>
                    <p className="font-bold text-primary">Estado de Miembro</p>
                    <p className="text-[10px] text-outline mt-0.5">Los directivos inactivos se bloquean de las listas de firmas.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newUserActive} 
                      onChange={(e) => setNewUserActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
                  </label>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow select-none"
                >
                  Confirmar y Registrar Miembro
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* POPUP MODAL: EDIT ENTIRE USER (TODOS LOS ATRIBUTOS TIENEN EDICIÓN) */}
      <AnimatePresence>
        {showEditUserModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowEditUserModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-outline-variant/40 z-10"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-5 h-5 text-secondary shrink-0" /> Editar Atributos de Colaborador
                </h4>
                <button onClick={() => setShowEditUserModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUserSubmit} className="space-y-4 text-xs font-sans text-left">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre Completo</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Samuel Robert"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Correo Electrónico</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@ejemplo.com"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Teléfono de Contacto</label>
                    <input 
                      type="text" 
                      placeholder="+56 9 1234 5678"
                      value={editUserPhone}
                      onChange={(e) => setEditUserPhone(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Contraseña de Acceso</label>
                    <input 
                      type="password" 
                      placeholder="•••••••••"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    />
                  </div>
                </div>

                {/* Foto de Perfil */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block mb-1">Foto de Perfil (Opcional - URL o Subir Archivo)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/mifoto.jpg"
                      value={editUserImageUrl}
                      onChange={(e) => setEditUserImageUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-xs outline-none font-medium text-primary font-mono placeholder:font-sans" 
                    />
                    <label className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0">
                      Subir
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => setEditUserImageUrl(r.result as string);
                            r.readAsDataURL(file);
                          }
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  {editUserImageUrl && (
                    <div className="flex items-center gap-2 mt-2 select-none">
                      <div className="w-10 h-10 rounded-full border border-slate-300 overflow-hidden shrink-0">
                        <img src={editUserImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] text-slate-500 overflow-hidden text-ellipsis line-clamp-1 flex-1 font-mono">{editUserImageUrl.substring(0, 48)}...</span>
                      <button 
                        type="button" 
                        onClick={() => setEditUserImageUrl("")} 
                        className="text-[10px] text-red-650 font-extrabold uppercase hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                {/* ASIGNACIÓN DE ROLES (MULTIPLE) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Asignar Cargos de Junta <span className="text-secondary font-black">(Seleccione uno o más)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {cargos.length === 0 ? (
                      <p className="col-span-2 text-outline text-[11px] p-2">No hay cargos configurados.</p>
                    ) : (
                      cargos.map(cargo => (
                        <label 
                          key={cargo.id} 
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded border border-transparent hover:border-outline-variant/30 cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox" 
                            checked={editUserRoles.includes(cargo.name)}
                            onChange={() => handleToggleEditUserRole(cargo.name)}
                            className="w-3.5 h-3.5 text-secondary border-outline rounded"
                          />
                          <span className="text-[11px] font-bold text-primary leading-tight">{cargo.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* ASIGNACIÓN DE DEPARTAMENTOS (MULTIPLE) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Departamentos de Gestión <span className="text-secondary font-black">(Seleccione uno o más)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {categories.length === 0 ? (
                      <p className="col-span-2 text-outline text-[11px] p-2 font-black">No hay departamentos de iglesia registrados.</p>
                    ) : (
                      categories.map(cat => (
                        <label 
                          key={cat} 
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded border border-transparent hover:border-outline-variant/30 cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox" 
                            checked={editUserDepts.includes(cat)}
                            onChange={() => handleToggleEditUserDept(cat)}
                            className="w-3.5 h-3.5 text-secondary border-outline rounded"
                          />
                          <span className="text-[11px] font-bold text-on-surface leading-tight">{cat}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* MIEMBRO DE JUNTA ACCESO DIRECTO */}
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/50 flex justify-between items-center select-none">
                  <div>
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Miembro de Junta Directiva
                    </p>
                    <p className="text-[10px] text-amber-700/80 mt-0.5">Habilita acceso directo de visualización confidencial de actas y resoluciones.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editUserMiembroDeJunta} 
                      onChange={(e) => setEditUserMiembroDeJunta(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* ESTADO DE LA CUENTA */}
                <div className="p-3 bg-[#f8fafc] rounded-lg border border-outline-variant/20 flex justify-between items-center select-none">
                  <div>
                    <p className="font-bold text-primary text-xs">Estado de Directiva Activo</p>
                    <p className="text-[10px] text-outline mt-0.5">Controla si este usuario puede solicitar presupuestos o firmar actas.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editUserActive} 
                      onChange={(e) => setEditUserActive(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary"></div>
                  </label>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow select-none"
                >
                  Guardar Todos los Cambios del Usuario
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* POPUP MODAL: ADD NEW CARGO */}
      <AnimatePresence>
        {showAddCargoModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowAddCargoModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-outline-variant/40 z-10 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-5 h-5 text-secondary shrink-0" /> Registrar Nuevo Cargo Ministerial
                </h4>
                <button onClick={() => setShowAddCargoModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCargoSubmit} className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Cargo</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Coordinador de Ministerio Personal"
                    value={newCargoName}
                    onChange={(e) => setNewCargoName(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Descripción de Responsabilidades</label>
                  <textarea 
                    placeholder="Escriba aquí los compromisos y misiones asociadas a este cargo..."
                    value={newCargoDescription}
                    onChange={(e) => setNewCargoDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-xs outline-none font-medium text-primary leading-relaxed" 
                  />
                </div>

                {/* PERMISOS CHECKBOXES GRID */}
                <div className="space-y-2">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Autorización de Permisos <span className="text-secondary font-black">(Seleccione accesos permitidos)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-2.5 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {PERMISSIONS_LIST.map((perm) => (
                      <label 
                        key={perm.key} 
                        className="flex items-start gap-2.5 p-2 bg-white rounded border border-[#e2e8f0] hover:border-secondary/40 cursor-pointer select-none transition-colors"
                      >
                        <input 
                          type="checkbox" 
                          checked={newCargoPermissions.includes(perm.key)}
                          onChange={() => handleToggleAddCargoPermission(perm.key)}
                          className="w-4 h-4 text-secondary border-outline rounded mt-0.5" 
                        />
                        <div>
                          <p className="text-[11px] font-bold text-primary leading-tight">{perm.label}</p>
                          <p className="text-[9px] text-outline leading-snug mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow select-none"
                >
                  Crear y Añadir Cargo Ministerial
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* POPUP MODAL: EDIT CARGO (TODOS LOS ATRIBUTOS TIENEN EDICIÓN) */}
      <AnimatePresence>
        {showEditCargoModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/45 backdrop-blur-sm"
              onClick={() => setShowEditCargoModal(false)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-outline-variant/40 z-10 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35 select-none">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-5 h-5 text-secondary shrink-0" /> Editar Atributos de Cargo
                </h4>
                <button onClick={() => setShowEditCargoModal(false)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditCargoSubmit} className="space-y-4 text-xs font-sans">
                
                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Cargo / Rol</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Anciano de Iglesia"
                    value={editCargoName}
                    onChange={(e) => setEditCargoName(e.target.value)}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-sm outline-none font-bold text-primary" 
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Descripción de Responsabilidades</label>
                  <textarea 
                    placeholder="Detalle de cargos..."
                    value={editCargoDescription}
                    onChange={(e) => setEditCargoDescription(e.target.value)}
                    rows={2.5}
                    className="w-full bg-white border border-outline p-2.5 rounded-lg text-xs outline-none font-medium text-primary leading-relaxed" 
                  />
                </div>

                {/* PERMISOS CHECKBOXES GRID */}
                <div className="space-y-2">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">
                    Modificar Permisos Asociados <span className="text-secondary font-black">(Seleccione accesos permitidos)</span>
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-2.5 bg-[#f8fafc] border border-outline-variant/40 rounded-lg">
                    {PERMISSIONS_LIST.map((perm) => (
                      <label 
                        key={perm.key} 
                        className="flex items-start gap-2.5 p-2 bg-white rounded border border-[#e2e8f0] hover:border-secondary/40 cursor-pointer select-none transition-colors"
                      >
                        <input 
                          type="checkbox" 
                          checked={editCargoPermissions.includes(perm.key)}
                          onChange={() => handleToggleEditCargoPermission(perm.key)}
                          className="w-4 h-4 text-secondary border-outline rounded mt-0.5" 
                        />
                        <div>
                          <p className="text-[11px] font-bold text-primary leading-tight">{perm.label}</p>
                          <p className="text-[9px] text-outline leading-snug mt-0.5">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-container transition-all shadow select-none"
                >
                  Guardar Cambios de Cargo y Permisos
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: USER CREATED CREDENTIALS SUCCESS DISPLAY AND EMAIL DISPATCH */}
      <AnimatePresence>
        {createdUserCreds && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0c131f]/60 backdrop-blur-md"
              onClick={() => setCreatedUserCreds(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/40 z-10 text-left space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-black">
                  ✓
                </div>
                <h4 className="text-lg font-black text-primary uppercase tracking-wider">
                  ¡Miembro Registrado con Éxito!
                </h4>
                <p className="text-xs text-outline font-medium">
                  Se han generado los datos oficiales de acceso para el colaborador.
                </p>
              </div>

              {/* CREDENTIALS BOX */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4.5 space-y-3 font-sans">
                <div>
                  <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Completo</span>
                   <p className="text-xs font-bold text-primary">{createdUserCreds.name}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Correo Electrónico (Usuario)</span>
                    <p className="text-xs font-bold text-primary truncate">{createdUserCreds.email}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Contraseña Inicial</span>
                    <p className="text-xs font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">{createdUserCreds.password}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#e2e8f0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Cargos/Roles</span>
                    <p className="font-semibold text-slate-700">{createdUserCreds.roles.join(", ")}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Departamentos</span>
                    <p className="font-semibold text-slate-700">{createdUserCreds.depts.join(", ")}</p>
                  </div>
                </div>
              </div>

              {/* MAILER SIMULATOR STATUS RAILS PANEL */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-500 animate-bounce" /> Cola de Correo Electrónico Institucional
                </span>
                <div className="bg-[#0f172a] text-[#38bdf8] p-3 rounded-lg border border-slate-800 font-mono text-[10px] leading-relaxed space-y-1 max-h-36 overflow-y-auto min-h-[90px]">
                  {sendLogs.map((log, i) => (
                    <div key={i} className={log.startsWith("✅") ? "text-emerald-400 font-bold" : "opacity-90"}>
                      {log}
                    </div>
                  ))}
                  {sendingEmail && (
                    <div className="flex items-center gap-2 text-slate-400 text-[9px] mt-1.5 italic animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin text-slate-500" /> Transmitiendo paquete SMTP... Por favor espere.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const text = `Acceso Iglesia - Colaborador:\nNombre: ${createdUserCreds.name}\nCorreo: ${createdUserCreds.email}\nContraseña: ${createdUserCreds.password}\nRoles: ${createdUserCreds.roles.join(", ")}`;
                    navigator.clipboard.writeText(text);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className={`h-11 rounded-lg text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    copiedText 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-white text-[#2c3e50] border-[#ccd2da] hover:bg-slate-50"
                  }`}
                >
                  {copiedText ? (
                    <>✓ ¡Copiado!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Datos</>
                  )}
                </button>

                <button
                  onClick={() => setCreatedUserCreds(null)}
                  className="h-11 bg-primary text-white hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all"
                >
                  Regresar a la Lista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: HELP RECOVER USER KEY (RESTABLECER ACCESO) */}
      <AnimatePresence>
        {recoveryUser && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0c131f]/60 backdrop-blur-md"
              onClick={() => setRecoveryUser(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-outline-variant/40 z-10 text-left space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/35">
                <h4 className="text-base font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-5 h-5 text-indigo-600 shrink-0" /> Restablecer Clave de Colaborador
                </h4>
                <button onClick={() => setRecoveryUser(null)} className="p-1 hover:bg-[#ebeef1] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs text-left text-amber-955">
                <p className="font-bold mb-1 flex items-center gap-1">⚠️ Control Administrativo de Accesos</p>
                Como Tesorero/Administrador central, tienes la facultad de auditar la clave actual de acceso o forzar una renovación de credenciales en caso de pérdida.
              </div>

              <div className="space-y-3 font-sans">
                <div>
                  <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Miembro</span>
                  <p className="text-xs font-bold text-primary">{recoveryUser.name}</p>
                  <p className="text-[10px] text-outline">{recoveryUser.email}</p>
                </div>

                {/* PASSWORD VIEW AND GENERATOR */}
                <div className="space-y-1.5">
                  <span className="text-[9px] text-[#556987] font-black uppercase tracking-wider block">Clave de Acceso Vigente</span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input 
                        type={showPasswordInRecovery ? "text" : "password"}
                        value={recoveryUser.password || ""}
                        readOnly
                        placeholder="[Sin contraseña registrada]"
                        className="w-full bg-[#f8fafc] border border-outline/70 p-2.5 rounded-lg text-sm outline-none font-mono font-bold text-primary" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPasswordInRecovery(!showPasswordInRecovery)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                      >
                        {showPasswordInRecovery ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const randPwd = "IASD." + Math.floor(100000 + Math.random() * 900000);
                        const updatedUser = { ...recoveryUser, password: randPwd };
                        setRecoveryUser(updatedUser);
                        
                        // Update user in global list
                        if (onUpdateUser) {
                          onUpdateUser(updatedUser);
                        }
                        
                        // Re-trigger mail delivery simulation
                        startSimulatedMailDelivery(recoveryUser.email);
                      }}
                      className="px-3 h-10 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                      title="Generar nueva clave aleatoria segura"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generar Clave Provisoria
                    </button>
                  </div>
                </div>
              </div>

              {/* SMTP LOG CLOUD LOGGER */}
              {sendLogs.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-widest flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-500 animate-pulse" /> Estado de Re-envío SMTP de Credenciales
                  </span>
                  <div className="bg-[#0f172a] text-[#3dffd2] p-3 rounded-lg border border-slate-800 font-mono text-[9px] leading-relaxed space-y-1 max-h-32 overflow-y-auto">
                    {sendLogs.map((log, i) => (
                      <div key={i} className={log.startsWith("✅") ? "text-emerald-400 font-bold" : "opacity-90"}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const text = `Acceso Iglesia - Restablecimiento de Clave:\nMiembro: ${recoveryUser.name}\nCorreo: ${recoveryUser.email}\nNueva Contraseña: ${recoveryUser.password}`;
                    navigator.clipboard.writeText(text);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className={`h-11 rounded-lg text-xs font-black uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    copiedText 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-white text-[#2c3e50] border-[#ccd2da] hover:bg-slate-50"
                  }`}
                >
                  {copiedText ? (
                    <>✓ ¡Copiado!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copiar Nueva Clave</>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (sendLogs.length === 0) {
                      startSimulatedMailDelivery(recoveryUser.email);
                    } else {
                      setRecoveryUser(null);
                    }
                  }}
                   className="h-11 bg-primary text-white hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {sendLogs.length === 0 ? (
                    <><Send className="w-3.5 h-3.5" /> Enviar por Correo</>
                  ) : (
                    <>Aceptar y Cerrar</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
