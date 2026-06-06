/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  TESORERO_CENTRAL = "Tesorero Central",
  TESORERO_LOCAL = "Tesorero Local",
  PASTOR = "Pastor Distrital",
  ANCIANO = "Anciano Consejero",
  DIRECTOR = "Director de Departamento",
  SECRETARIO = "Secretaría"
}

export enum Tab {
  LOGIN = "login",
  DASHBOARD = "dashboard",
  
  // Tesorería
  TES_DEPARTAMENTOS_VER = "tes_departamentos_ver",
  TES_SOLICITUD_TRANS = "tes_solicitud_transferencias",
  TES_GESTION_TRANS = "tes_gestion_transferencias",
  TES_INFORMES = "tes_informes",
  TES_RESUMEN_FONDOS = "tes_resumen_fondos",
  TES_GESTION_FONDOS = "tes_gestion_fondos",
  TES_NUEVA_SOLICITUD = "tes_nueva_solicitud",
  TES_RESUMEN_RENDICIONES = "tes_resumen_rendiciones",
  TES_GESTION_RENDICIONES = "tes_gestion_rendiciones",
  TES_NUEVA_RENDICIONES = "tes_nueva_rendicion",
  TES_CONCILIACION_BANCARIA = "tes_conciliacion_bancaria",
  
  // Secretaría
  SEC_ACTAS_BOARD = "sec_actas_board",
  SEC_SUBIR_ACTA = "sec_subir_acta",
  SEC_BALANCES_BOARD = "sec_balances_board",
  SEC_SUBIR_BALANCE = "sec_subir_balance",
  SEC_SOLICITUD_VOTOS = "sec_solicitud_votos",
  SEC_GESTION_VOTOS = "sec_gestion_votos",
  SEC_VOTOS_APROBADOS = "sec_votos_aprobados",
  SEC_CALENDARIO = "sec_calendario",
  SEC_SOLICITAR_EVENTO_DIRECTOR = "sec_solicitar_evento_director",
  SEC_GESTION_EVENTOS = "sec_gestion_eventos",
  
  // Configuración
  CONF_MI_PERFIL = "conf_mi_perfil",
  CONF_USUARIOS = "conf_usuarios",
  CONF_CARGOS = "conf_cargos",
  CONF_DEPARTAMENTOS_EDIT = "conf_departamentos_edit",
  CONF_DEPARTAMENTOS_CATEGORIAS = "conf_departamentos_categorias",
  CONF_DYNAMIC_LISTS = "conf_dynamic_lists",
  CONF_GOOGLE_DRIVE = "conf_google_drive",
  
  // Recursos y Documentos
  RECURSOS_DOCUMENTOS = "recursos_documentos",
  RECURSOS_DOCUMENTOS_GESTION = "recursos_documentos_gestion"
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  roles: string[];
  departments: string[];
  active: boolean;
  avatarLetter: string;
  imageUrl?: string;
  miembroDeJunta?: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  category: string;
  director: string;
  directorImage?: string;
  tesorero: string;
  budgetAllocated: number;
  budgetUsed: number;
  percentageUsed: number;
  assignedPercentage?: number;
  initialBudget?: number;
}

export interface Cargo {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface Transfer {
  id: string;
  date: string;
  origin: string;
  originSub: string;
  destination: string;
  destinationSub: string;
  amount: number;
  status: "Completada" | "Pendiente" | "Observada";
  reason: string;
  acmsStatus?: "Pendiente" | "Ingresado";
}

export interface FundRequest {
  id: string;
  department: string;
  applicant: string;
  applicantAvatar?: string;
  amount: number;
  boardVote: string;
  description: string;
  expectedDate: string;
  recipientType: "director" | "otra_persona";
  recipientName: string;
  recipientRut: string;
  recipientEmail: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  status: "Pendiente" | "Aprobada" | "Observada" | "Rechazada";
  obs?: string;
  isException?: boolean;
  cerrado?: boolean;
}

export interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  docType: string;
  rut: string;
  amount: number;
  receiptUploaded: boolean;
  receiptUrl?: string;
  description?: string;
  approved?: boolean;
}

export interface ExpenseRendition {
  id: string;
  folio: string;
  dateSent: string;
  applicant: string;
  department: string;
  project: string;
  items: ExpenseItem[];
  totalAmount: number;
  status: "Pendiente" | "Aprobada" | "Observada" | "Rechazada";
  observations?: string;
  receiptImages?: string[];
  pagada?: boolean;
  asociadaFondoId?: string;
  votoAsociadoId?: string; // Voto de junta asociado (opcional)
  comprobantesDriveUrl?: string;
  acmsStatus?: "Pendiente" | "Ingresado";
  devolucionExcedenteUrl?: string; // Comprobante de devolución del excedente (URL o nombre archivo)
  hasTransferDetails?: boolean;
  recipientType?: "director" | "otra_persona";
  recipientName?: string;
  recipientRut?: string;
  recipientEmail?: string;
  bank?: string;
  accountType?: string;
  accountNumber?: string;
}

export interface Meeting {
  id: string;
  date: string;
  title: string;
  time: string;
  duration: string;
  location: string;
  department: string; // can be "Todos" or category name
  organizer?: string;
  participants?: string[];
  description?: string;
  status: "Pendiente" | "Aprobado" | "Observado";
}

export interface SpaceResource {
  id: string;
  name: string;
  capacity: number;
  available: boolean;
  notes?: string;
  imageUrl: string;
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  type: "Ingreso" | "Gasto";
  bankId: string;
  amount: number;
  description: string;
  category: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  category: "solicitud" | "rendicion" | "calendario" | "sistema";
  userEmail?: string;
  emailSent?: boolean;
}

export interface TesoreriaBalance {
  id: string;
  voto_id?: string; // Optional reference to which vote it resolves if any
  fecha: string;
  periodo: string; // e.g. "Mayo 2026"
  linkDrive: string; // Google Drive Shared Link
  creadoPor: string;
  peso: string;
  descripcion: string;
  year: number;
}

export interface BoardVoto {
  id: string;
  departamento: string; // Departamento solicitante
  solicitante: string; // Director, Pastor, Anciano, Tesorero
  solicitanteEmail: string;
  descripcion: string; // Starts with PROPONE
  linkDriveDoc?: string; // Optional Google Drive attached document
  fechaEnvio: string;
  estado: "Pendiente" | "Aprobado" | "Observado";
  observaciones?: string;
}

export interface BoardActa {
  voto: string;
  fecha: string;
  tipo: "Regular" | "Extraordinaria" | "Online";
  descripcion: string;
  firmadoPor: string;
  peso: string;
  year: number;
  month: string;
  dateVal: string;
  linkDrive?: string; // Google Drive Shared Link
  titulo?: string; // e.g. "COMPRA DE IMPRESORA"
  lugar?: string; // e.g. "Sede de la Iglesia"
  participantes?: string; // e.g. "Pastor Demo, Secretaria Demo, Tesorero Demo"
  oracionInicio?: string; // e.g. "Pr. Pastor Demo"
  oracionFin?: string; // e.g. "Hno. Tesorero Demo"
}

export interface ResourceFile {
  id: string;
  name: string;
  category: "templates" | "logos" | "manuals";
  type: "doc" | "pdf" | "image" | "zip";
  size: string;
  date: string;
  downloads: number;
}



