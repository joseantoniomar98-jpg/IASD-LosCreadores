/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { TransferenciasView } from "./components/TransferenciasView";
import { SolicitudesView } from "./components/SolicitudesView";
import { RendicionesView } from "./components/RendicionesView";
import { SecretariaView } from "./components/SecretariaView";
import { SolicitarEventoDirectorView } from "./components/SolicitarEventoDirectorView";
import { GestionEventosSecretariaView } from "./components/GestionEventosSecretariaView";
import { DepartamentosView } from "./components/DepartamentosView";
import { GestionDepartamentosView } from "./components/GestionDepartamentosView";
import { UsuariosView } from "./components/UsuariosView";
import { ReportesView } from "./components/ReportesView";
import { LoginView } from "./components/LoginView";
import { ConciliacionBancariaView } from "./components/ConciliacionBancariaView";
import { MiPerfilView } from "./components/MiPerfilView";
import { GestionListasConfig } from "./components/GestionListasConfig";
import { GestionGoogleDrive } from "./components/GestionGoogleDrive";
import { RecursosDocumentosView } from "./components/RecursosDocumentosView";

import { 
  Tab, User, Department, Transfer, FundRequest, 
  ExpenseRendition, Meeting, SpaceResource, Cargo,
  BankAccount, BankTransaction, SystemNotification,
  BoardActa, TesoreriaBalance, BoardVoto, ResourceFile
} from "./types";

import { 
  USERS_SEED, DEPARTMENTS_SEED, TRANSFERS_SEED, 
  FUND_REQUESTS_SEED, EXPENSE_RENDITIONS_SEED, 
  MEETINGS_SEED, SPACES_SEED, CARGOS_SEED,
  BANK_ACCOUNTS_SEED, BANK_TRANSACTIONS_SEED
} from "./data";
import { 
  seedCollectionIfEmpty, 
  subscribeCollection, 
  setFirestoreDoc, 
  deleteFirestoreDoc 
} from "./dbSync";

export default function App() {
  // Authentication states - Starts at Login screen for real production user accesses.
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUser = localStorage.getItem("iasd_currentUser");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
    return USERS_SEED.find(u => u.id === "usr-2") || USERS_SEED[1] || USERS_SEED[0];
  });

  // Responsive mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core global data collections as React states to make the entire app fully functional
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [users, setUsers] = useState<User[]>(USERS_SEED);

  // Persist session changes in localStorage automatically whenever auth state shifts
  useEffect(() => {
    localStorage.setItem("iasd_isLogged", String(isLogged));
    if (currentUser) {
      localStorage.setItem("iasd_currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("iasd_currentUser");
    }
  }, [isLogged, currentUser]);

  // Keep currentUser synced with database updates to the users list
  useEffect(() => {
    if (isLogged && currentUser) {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (dbUser) {
        // Compare values to prevent infinite render loops
        const keysToCompare: (keyof User)[] = ["name", "email", "phone", "password", "roles", "departments", "active", "imageUrl", "avatarLetter"];
        const hasChanged = keysToCompare.some(key => JSON.stringify(dbUser[key]) !== JSON.stringify(currentUser[key]));
        if (hasChanged) {
          console.log("Syncing currentUser with Firestore database updates:", dbUser.name);
          setCurrentUser(dbUser);
        }
      }
    }
  }, [users, isLogged, currentUser]);

  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_SEED);
  const [rawDepartments, setRawDepartments] = useState<Department[]>(DEPARTMENTS_SEED);
  
  // Dynamic configurable lists
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    "Alimentación",
    "Transporte",
    "Útiles de Oficina",
    "Material de Construcción",
    "Limpieza / Aseo",
    "Eventos / Programas",
    "Otros"
  ]);

  const [bankList, setBankList] = useState<string[]>([
    "Banco Estado",
    "Banco de Chile",
    "Banco Santander",
    "Banco BCI",
    "Banco Itaú",
    "Banco Falabella",
    "Banco Scotiabank",
    "Banco Security",
    "Banco BICE"
  ]);

  const [documentTypes, setDocumentTypes] = useState<string[]>([
    "Boleta",
    "Factura",
    "Ticket",
    "Recibo",
    "Otro"
  ]);

  const [googleDriveConfig, setGoogleDriveConfig] = useState(() => ({
    connected: true,
    folderId: "1pMh4fG9K1a8B8_JdD9z3SxFg9Lp29M1k",
    folderName: "Iglesia_IASD_Soportes_Rendiciones",
    autoSync: true,
    syncRendiciones: true,
    syncBalances: true,
    lastSyncDate: "2026-05-28 14:32:10"
  }));

  const [resources, setResources] = useState<ResourceFile[]>([
    // Official Templates / Formatos Oficiales
    { id: "res-1", name: "Formulario_Rendicion_Gastos_Oficial_v2.docx", category: "templates", type: "doc", size: "152 KB", date: "2026-05-18", downloads: 142 },
    { id: "res-2", name: "Solicitud_Adelanto_Fondos_Tesoreria.docx", category: "templates", type: "doc", size: "114 KB", date: "2026-05-20", downloads: 98 },
    { id: "res-3", name: "Plantilla_Acta_Minuta_Reunion_Junta.docx", category: "templates", type: "doc", size: "95 KB", date: "2026-03-12", downloads: 41 },
    { id: "res-4", name: "Excel_Presupuesto_Anual_Departamental_Modelo.xlsx", category: "templates", type: "doc", size: "2.4 MB", date: "2026-01-05", downloads: 215 },
    
    // Logos & Identity / Logotipos e Identidad
    { id: "res-5", name: "Logo_LosCreadores_Monocromo_HQ.png", category: "logos", type: "image", size: "350 KB", date: "2026-04-10", downloads: 67 },
    { id: "res-6", name: "Logo_IASD_Oficial_Vectorial_Curvas.zip", category: "logos", type: "zip", size: "14.2 MB", date: "2026-04-12", downloads: 34 },
    { id: "res-7", name: "Manual_de_Uso_Marca_e_Identidad_Corporativa.pdf", category: "logos", type: "pdf", size: "4.8 MB", date: "2026-02-15", downloads: 83 },
    
    // Guides & manuals / Manuales y Reglamentos
    { id: "res-8", name: "Manual_Tesorero_Departamento_IASD_Chile.pdf", category: "manuals", type: "pdf", size: "8.2 MB", date: "2026-01-15", downloads: 189 },
    { id: "res-9", name: "Reglamento_Interno_Fondos_Fijos_Especiales.pdf", category: "manuals", type: "pdf", size: "1.1 MB", date: "2026-03-24", downloads: 54 },
    { id: "res-10", name: "Guia_Rapida_Usuario_Plataforma_Financiera.pdf", category: "manuals", type: "pdf", size: "2.3 MB", date: "2026-05-25", downloads: 210 },
  ]);
  const [categories, setCategories] = useState<string[]>(() => {
    const list = DEPARTMENTS_SEED.map(d => d.category);
    return Array.from(new Set(list));
  });
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    return {
      "Acción Solidaria Adventista (ASA)": "#059669",
      "Audio Visual": "#4f46e5",
      "Club de Aventureros": "#e11d48",
      "Club de Conquistadores": "#ca8a04",
      "Tesorería": "#2563eb",
      "Comunicación": "#0891b2",
      "Departamento de Música": "#8b5cf6",
      "Diaconisas": "#db2777",
      "Diaconos": "#ea580c",
      "Educación": "#16a34a",
      "Escuela Sabática": "#4b5563",
      "Evangelismo": "#dc2626",
      "Ministerio de Publicaciones": "#10b981",
      "Ministerio de la Familia": "#06b6d4",
      "Ministerio de la Mujer": "#ec4899",
      "Ministerio de la Salud": "#14b8a6",
      "Ministerio de Mayordomía Cristiana": "#3b82f6",
      "Ministerio del Adolescente": "#84cc16",
      "Ministerio Infantil": "#f59e0b",
      "Ministerio Joven": "#6366f1",
      "Ministerio Posibilidades": "#a855f7",
      "Secretaría": "#64748b",
      "Ministerio de Recepción": "#7c3aed",
      "Ministerio de Oración": "#f43f5e"
    };
  });

  const handleUpdateCategoryColor = (catName: string, color: string) => {
    setCategoryColors(prev => {
      const updated = {
        ...prev,
        [catName]: color
      };
      setFirestoreDoc("settings", "categoryColors", { value: updated });
      return updated;
    });
  };

  const handleAddCategory = (newCat: string) => {
    setCategories(prev => {
      if (prev.includes(newCat)) return prev;
      const updated = [...prev, newCat];
      setFirestoreDoc("settings", "categories", { value: updated });
      return updated;
    });
    setCategoryColors(prev => {
      const updated = {
        ...prev,
        [newCat]: "#6366f1"
      };
      setFirestoreDoc("settings", "categoryColors", { value: updated });
      return updated;
    });
  };

  const handleUpdateCategory = (oldCat: string, newCat: string) => {
    setCategories(prev => {
      const updated = prev.map(c => c === oldCat ? newCat : c);
      setFirestoreDoc("settings", "categories", { value: updated });
      return updated;
    });
    setRawDepartments(prev => {
      const updated = prev.map(d => {
        if (d.category === oldCat) {
          const updDep = { ...d, category: newCat };
          setFirestoreDoc("departments", d.id, updDep);
          return updDep;
        }
        return d;
      });
      return updated;
    });
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.departments.includes(oldCat)) {
          const updUsr = {
            ...u,
            departments: u.departments.map(d => d === oldCat ? newCat : d)
          };
          setFirestoreDoc("users", u.id, updUsr);
          return updUsr;
        }
        return u;
      });
      return updated;
    });
    setCategoryColors(prev => {
      const copy = { ...prev };
      if (copy[oldCat]) {
        copy[newCat] = copy[oldCat];
        delete copy[oldCat];
      }
      setFirestoreDoc("settings", "categoryColors", { value: copy });
      return copy;
    });
  };

  const handleDeleteCategory = (catName: string) => {
    setCategories(prev => {
      const updated = prev.filter(c => c !== catName);
      setFirestoreDoc("settings", "categories", { value: updated });
      return updated;
    });
    setCategoryColors(prev => {
      const copy = { ...prev };
      delete copy[catName];
      setFirestoreDoc("settings", "categoryColors", { value: copy });
      return copy;
    });
  };
  const [transfers, setTransfers] = useState<Transfer[]>(TRANSFERS_SEED);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>(FUND_REQUESTS_SEED);
  const [renditions, setRenditions] = useState<ExpenseRendition[]>(EXPENSE_RENDITIONS_SEED);
  const [meetings, setMeetings] = useState<Meeting[]>(MEETINGS_SEED);
  const [spaces, setSpaces] = useState<SpaceResource[]>(SPACES_SEED);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(BANK_ACCOUNTS_SEED);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(BANK_TRANSACTIONS_SEED);
  const [boardActas, setBoardActas] = useState<BoardActa[]>([]);

  const [tesoreriaBalances, setTesoreriaBalances] = useState<TesoreriaBalance[]>([
    {
      id: "bal-1",
      fecha: "05 de enero de 2026",
      periodo: "Enero 2026",
      linkDrive: "https://drive.google.com/drive/folders/placeholder-drive-folder-id",
      creadoPor: "Tesorero Demo",
      peso: "1.0 MB",
      descripcion: "Balance de comprobación de fondos and estado contable del primer mes del año.",
      year: 2026
    }
  ]);

  const [boardVotos, setBoardVotos] = useState<BoardVoto[]>([]);

  const [votosPlazoLimite, setVotosPlazoLimite] = useState<string>("2026-06-03");

  useEffect(() => {
    let unsubscribers: (() => void)[] = [];
    
    async function initFirebaseData() {
      try {
        await seedCollectionIfEmpty("users", USERS_SEED);
        await seedCollectionIfEmpty("cargos", CARGOS_SEED);
        await seedCollectionIfEmpty("departments", DEPARTMENTS_SEED);
        await seedCollectionIfEmpty("transfers", TRANSFERS_SEED);
        await seedCollectionIfEmpty("fundRequests", FUND_REQUESTS_SEED);
        await seedCollectionIfEmpty("renditions", EXPENSE_RENDITIONS_SEED);
        await seedCollectionIfEmpty("meetings", MEETINGS_SEED);
        await seedCollectionIfEmpty("spaces", SPACES_SEED);
        await seedCollectionIfEmpty("bankAccounts", BANK_ACCOUNTS_SEED);
        await seedCollectionIfEmpty("bankTransactions", BANK_TRANSACTIONS_SEED);
        await seedCollectionIfEmpty("boardActas", boardActas);
        await seedCollectionIfEmpty("tesoreriaBalances", tesoreriaBalances);
        await seedCollectionIfEmpty("boardVotos", boardVotos);
        await seedCollectionIfEmpty("notifications", notifications);
        await seedCollectionIfEmpty("resources", resources);

        // Seed settings collection
        await seedCollectionIfEmpty("settings", [
          { id: "votosPlazoLimite", value: "2026-06-03" },
          { id: "expenseCategories", value: [
            "Alimentación",
            "Transporte",
            "Útiles de Oficina",
            "Material de Construcción",
            "Limpieza / Aseo",
            "Eventos / Programas",
            "Otros"
          ]},
          { id: "bankList", value: [
            "Banco Estado",
            "Banco de Chile",
            "Banco Santander",
            "Banco BCI",
            "Banco Itaú",
            "Banco Falabella",
            "Banco Scotiabank",
            "Banco Security",
            "Banco BICE"
          ]},
          { id: "documentTypes", value: [
            "Boleta",
            "Factura",
            "Ticket",
            "Recibo",
            "Otro"
          ]},
          { id: "categories", value: Array.from(new Set(DEPARTMENTS_SEED.map(d => d.category))) },
          { id: "categoryColors", value: {
            "Acción Solidaria Adventista (ASA)": "#059669",
            "Audio Visual": "#4f46e5",
            "Club de Aventureros": "#e11d48",
            "Club de Conquistadores": "#ca8a04",
            "Tesorería": "#2563eb",
            "Comunicación": "#0891b2",
            "Departamento de Música": "#8b5cf6",
            "Diaconisas": "#db2777",
            "Diaconos": "#ea580c",
            "Educación": "#16a34a",
            "Escuela Sabática": "#4b5563",
            "Evangelismo": "#dc2626",
            "Ministerio de Publicaciones": "#10b981",
            "Ministerio de la Familia": "#06b6d4",
            "Ministerio de la Mujer": "#ec4899",
            "Ministerio de la Salud": "#14b8a6",
            "Ministerio de Mayordomía Cristiana": "#3b82f6",
            "Ministerio del Adolescente": "#84cc16",
            "Ministerio Infantil": "#f59e0b",
            "Ministerio Joven": "#6366f1",
            "Ministerio Posibilidades": "#a855f7",
            "Secretaría": "#64748b",
            "Ministerio de Recepción": "#7c3aed",
            "Ministerio de Oración": "#f43f5e"
          }}
        ]);

        unsubscribers.push(subscribeCollection<User>("users", (items) => {
          if (items.length > 0) setUsers(items);
        }));
        unsubscribers.push(subscribeCollection<Cargo>("cargos", (items) => {
          if (items.length > 0) setCargos(items);
        }));
        unsubscribers.push(subscribeCollection<Department>("departments", (items) => {
          if (items.length > 0) setRawDepartments(items);
        }));
        unsubscribers.push(subscribeCollection<Transfer>("transfers", (items) => {
          setTransfers(items);
        }));
        unsubscribers.push(subscribeCollection<FundRequest>("fundRequests", (items) => {
          setFundRequests(items);
        }));
        unsubscribers.push(subscribeCollection<ExpenseRendition>("renditions", (items) => {
          setRenditions(items);
        }));
        unsubscribers.push(subscribeCollection<Meeting>("meetings", (items) => {
          setMeetings(items);
        }));
        unsubscribers.push(subscribeCollection<SpaceResource>("spaces", (items) => {
          if (items.length > 0) setSpaces(items);
        }));
        unsubscribers.push(subscribeCollection<BankAccount>("bankAccounts", (items) => {
          if (items.length > 0) setBankAccounts(items);
        }));
        unsubscribers.push(subscribeCollection<BankTransaction>("bankTransactions", (items) => {
          setBankTransactions(items);
        }));
        unsubscribers.push(subscribeCollection<BoardActa>("boardActas", (items) => {
          setBoardActas(items);
        }));
        unsubscribers.push(subscribeCollection<TesoreriaBalance>("tesoreriaBalances", (items) => {
          setTesoreriaBalances(items);
        }));
        unsubscribers.push(subscribeCollection<BoardVoto>("boardVotos", (items) => {
          setBoardVotos(items);
        }));
        unsubscribers.push(subscribeCollection<SystemNotification>("notifications", (items) => {
          const realNotifs = items.filter(n => !["notif-1", "notif-2", "notif-3"].includes(n.id));
          setNotifications(realNotifs);
        }));
        unsubscribers.push(subscribeCollection<ResourceFile>("resources", (items) => {
          if (items.length > 0) setResources(items);
        }));

        unsubscribers.push(subscribeCollection<{ id: string; value: any }>("settings", (items) => {
          items.forEach(item => {
            if (item.id === "votosPlazoLimite" && item.value) {
              setVotosPlazoLimite(item.value);
            } else if (item.id === "expenseCategories" && Array.isArray(item.value)) {
              setExpenseCategories(item.value);
            } else if (item.id === "bankList" && Array.isArray(item.value)) {
              setBankList(item.value);
            } else if (item.id === "documentTypes" && Array.isArray(item.value)) {
              setDocumentTypes(item.value);
            } else if (item.id === "categories" && Array.isArray(item.value)) {
              setCategories(item.value);
            } else if (item.id === "categoryColors" && item.value) {
              setCategoryColors(item.value);
            }
          });
        }));
      } catch (error) {
        console.error("Firebase Sync Hook Error: ", error);
      }
    }

    initFirebaseData();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleUpdateExpenseCategories = (newList: string[]) => {
    setExpenseCategories(newList);
    setFirestoreDoc("settings", "expenseCategories", { value: newList });
  };

  const handleUpdateBankList = (newList: string[]) => {
    setBankList(newList);
    setFirestoreDoc("settings", "bankList", { value: newList });
  };

  const handleUpdateDocumentTypes = (newList: string[]) => {
    setDocumentTypes(newList);
    setFirestoreDoc("settings", "documentTypes", { value: newList });
  };

  const handleUpdateVotosPlazoLimite = (newDeadline: string) => {
    setVotosPlazoLimite(newDeadline);
    setFirestoreDoc("settings", "votosPlazoLimite", { value: newDeadline });
  };

  const handleAddBoardActa = (newAct: BoardActa) => {
    setBoardActas(prev => [newAct, ...prev]);
    setFirestoreDoc("boardActas", newAct.voto, newAct);
  };

  const handleAddTesoreriaBalance = (newBal: TesoreriaBalance) => {
    setTesoreriaBalances(prev => [newBal, ...prev]);
    setFirestoreDoc("tesoreriaBalances", newBal.id, newBal);
  };

  const handleCreateBoardVoto = (newVoto: BoardVoto) => {
    setBoardVotos(prev => [newVoto, ...prev]);
    setFirestoreDoc("boardVotos", newVoto.id, newVoto);
  };

  const handleUpdateBoardVotoStatus = (id: string, estado: "Pendiente" | "Aprobado" | "Observado", observaciones?: string) => {
    const found = boardVotos.find(v => v.id === id);
    setBoardVotos(prev => prev.map(v => v.id === id ? { ...v, estado, observaciones } : v));
    
    if (found) {
      setFirestoreDoc("boardVotos", id, { ...found, estado, observaciones });
      const title = estado === "Aprobado" ? "Moción de Voto Aprobada" : `Moción de Voto ${estado}`;
      const message = estado === "Aprobado" 
        ? `Su propuesta para ${found.departamento} ("${found.descripcion.substring(0, 45)}...") ha sido APROBADA reglamento para incorporarse a la agenda.`
        : `Su propuesta para ${found.departamento} fue OBSERVADA por Secretaría: "${observaciones || ""}". Por favor corríjala.`;
      
      handleAddNotification(
        title,
        message,
        "calendario",
        found.solicitanteEmail
      );
    }
  };

  const handleEditBoardVoto = (updatedVoto: BoardVoto) => {
    setBoardVotos(prev => prev.map(v => v.id === updatedVoto.id ? updatedVoto : v));
    setFirestoreDoc("boardVotos", updatedVoto.id, updatedVoto);
    handleAddNotification(
      "Moción de Voto Modificada",
      `La secretaría editó reglamentariamente su propuesta para ${updatedVoto.departamento} a: "${updatedVoto.descripcion.substring(0, 50)}...".`,
      "calendario",
      updatedVoto.solicitanteEmail
    );
  };
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  const userNotifications = React.useMemo(() => {
    return notifications.filter(n => !n.userEmail || n.userEmail.toLowerCase() === currentUser?.email.toLowerCase());
  }, [notifications, currentUser]);

  const handleAddNotification = (title: string, message: string, category: "solicitud" | "rendicion" | "calendario" | "sistema", userEmail?: string) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      category,
      date: new Date().toISOString().split('T')[0],
      read: false,
      userEmail: userEmail || currentUser?.email || "tesorero@ejemplo.com"
    };
    setNotifications(prev => [newNotif, ...prev]);
    setFirestoreDoc("notifications", newNotif.id, newNotif);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const found = notifications.find(n => n.id === id);
    if (found) {
      setFirestoreDoc("notifications", id, { ...found, read: true });
    }
  };

  const handleClearAllNotifications = () => {
    const toDelete = notifications.filter(n => !n.userEmail || n.userEmail.toLowerCase() === currentUser?.email.toLowerCase());
    setNotifications(prev => prev.filter(n => n.userEmail && n.userEmail.toLowerCase() !== currentUser?.email.toLowerCase()));
    toDelete.forEach(notif => {
      deleteFirestoreDoc("notifications", notif.id);
    });
  };

  // --- HANDLERS TO WORK WITH STATE ---

  // Login handler
  const handleLogin = (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    setIsLogged(true);
    setActiveTab(Tab.DASHBOARD);
  };

  // Logout
  const handleLogout = () => {
    setIsLogged(false);
    setActiveTab(Tab.LOGIN);
    localStorage.removeItem("iasd_isLogged");
    localStorage.removeItem("iasd_currentUser");
  };

  // Add mutual transfers
  const handleAddTransfer = (newTx: Transfer) => {
    setTransfers([newTx, ...transfers]);
    setFirestoreDoc("transfers", newTx.id, newTx);
  };

  const handleUpdateTransferFields = (id: string, fields: Partial<Transfer>) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    const found = transfers.find(t => t.id === id);
    if (found) {
      setFirestoreDoc("transfers", id, { ...found, ...fields });
    }
  };

  // --- BANK ACCOUNTS & TRANSACTIONS HANDLERS ---
  const handleUpdateBankAccounts = (accounts: BankAccount[]) => {
    setBankAccounts(accounts);
    accounts.forEach(acc => {
      setFirestoreDoc("bankAccounts", acc.id, acc);
    });
  };

  const handleAddBankTransaction = (tx: BankTransaction) => {
    setBankTransactions(prev => [tx, ...prev]);
    setFirestoreDoc("bankTransactions", tx.id, tx);
  };

  const handleDeleteBankTransaction = (txId: string) => {
    setBankTransactions(prev => prev.filter(t => t.id !== txId));
    deleteFirestoreDoc("bankTransactions", txId);
  };

  // Adjust or transfer budget quantities within departments
  const handleUpdateDeptBalance = (deptId: string, amount: number) => {
    setRawDepartments(prev => 
      prev.map(d => {
        if (d.id === deptId) {
          const newUsed = d.budgetUsed + amount;
          const ratio = Math.round((newUsed / d.budgetAllocated) * 100);
          const updated = {
            ...d,
            budgetUsed: newUsed,
            percentageUsed: ratio
          };
          setFirestoreDoc("departments", deptId, updated);
          return updated;
        }
        return d;
      })
    );
  };

  // Adjust allocated budget tope limits
  const handleAdjustBudgetTope = (deptId: string, offsetAmount: number) => {
    setRawDepartments(prev => 
      prev.map(d => {
        if (d.id === deptId) {
          const newAllocated = d.budgetAllocated + offsetAmount;
          const ratio = Math.round((d.budgetUsed / newAllocated) * 100);
          const updated = {
            ...d,
            budgetAllocated: Math.max(newAllocated, 1),
            percentageUsed: ratio
          };
          setFirestoreDoc("departments", deptId, updated);
          return updated;
        }
        return d;
      })
    );
  };

  // New department registration
  const handleCreateDepartment = (newDept: Department) => {
    setRawDepartments([...rawDepartments, newDept]);
    setFirestoreDoc("departments", newDept.id, newDept);
  };

  // Update existing department fields
  const handleUpdateDepartment = (updatedDept: Department) => {
    setRawDepartments(prev => 
      prev.map(d => d.id === updatedDept.id ? updatedDept : d)
    );
    setFirestoreDoc("departments", updatedDept.id, updatedDept);
  };

  // New Request for advanced funds
  const handleAddFundRequest = (newReq: FundRequest) => {
    setFundRequests([newReq, ...fundRequests]);
    setFirestoreDoc("fundRequests", newReq.id, newReq);
    handleAddNotification(
      "Nueva solicitud de fondos recibida",
      `Se ha creado la solicitud de fondos para "${newReq.description}" por un valor de $${newReq.amount.toLocaleString("es-CL")} por ${newReq.applicant}.`,
      "solicitud",
      newReq.recipientEmail || currentUser?.email || "tesorero@ejemplo.com"
    );
  };

  // Approve, observe or reject fund requests
  const handleUpdateFundRequestStatus = (
    reqId: string, 
    newStatus: "Aprobada" | "Observada" | "Rechazada",
    adminObservationContent?: string
  ) => {
    let purpose = "Adelanto de Fondos";
    let email = currentUser?.email || "tesorero@ejemplo.com";
    const found = fundRequests.find(r => r.id === reqId);
    if (found) {
      purpose = found.description;
      email = found.recipientEmail;
      setFirestoreDoc("fundRequests", reqId, {
        ...found,
        status: newStatus,
        obs: adminObservationContent || ""
      });
    }
    setFundRequests(prev => 
      prev.map(r => {
        if (r.id === reqId) {
          return {
            ...r,
            status: newStatus,
            obs: adminObservationContent || ""
          };
        }
        return r;
      })
    );
    handleAddNotification(
      `Estado de Solicitud: ${newStatus}`,
      `Su solicitud de adelanto de fondos para "${purpose}" ha sido cambiada a: ${newStatus}.${adminObservationContent ? ` Observación: ${adminObservationContent}` : ""}`,
      "solicitud",
      email
    );
  };

  // Register new rendition files
  const handleAddRendition = (newRend: ExpenseRendition) => {
    setRenditions([newRend, ...renditions]);
    setFirestoreDoc("renditions", newRend.id, newRend);
    handleAddNotification(
      "Nueva Rendición de Gastos",
      `Se ha registrado una nueva rendición de gastos por el monto de $${newRend.totalAmount.toLocaleString("es-CL")} para "${newRend.project}" en el departamento de ${newRend.department}.`,
      "rendicion",
      currentUser?.email || "tesorero@ejemplo.com"
    );
  };

  // Approve, observe or reject expense audits
  const handleUpdateRenditionStatus = (
    rendId: string, 
    newStatus: "Aprobada" | "Observada" | "Rechazada",
    observationsNotes?: string,
    extraFields?: Partial<ExpenseRendition>
  ) => {
    let purpose = "Rendición de Gastos";
    const found = renditions.find(r => r.id === rendId);
    if (found) {
      purpose = found.project;
      setFirestoreDoc("renditions", rendId, {
        ...found,
        status: newStatus,
        observations: observationsNotes || "",
        ...extraFields
      });
    }
    setRenditions(prev => 
      prev.map(rend => {
        if (rend.id === rendId) {
          return {
            ...rend,
            status: newStatus,
            observations: observationsNotes || "",
            ...extraFields
          };
        }
        return rend;
      })
    );
    handleAddNotification(
      `Estado de Rendición: ${newStatus}`,
      `Su rendición de gastos para "${purpose}" ha sido cambiada a: ${newStatus}.${observationsNotes ? ` Detalle: ${observationsNotes}` : ""}`,
      "rendicion",
      currentUser?.email || "tesorero@ejemplo.com"
    );
  };

  const handleUpdateRenditionFields = (rendId: string, fields: Partial<ExpenseRendition>) => {
    setRenditions(prev =>
      prev.map(rend => {
        if (rend.id === rendId) {
          const updated = {
            ...rend,
            ...fields
          };
          setFirestoreDoc("renditions", rendId, updated);
          return updated;
        }
        return rend;
      })
    );
  };

  // Set new meeting agenda event
  const handleAddMeetingEvent = (newEvent: Meeting) => {
    setMeetings([newEvent, ...meetings]);
    setFirestoreDoc("meetings", newEvent.id, newEvent);
    handleAddNotification(
      "Nuevo Evento Agendado",
      `Se ha programado la reunión/evento "${newEvent.title}" para el día ${newEvent.date} a las ${newEvent.time} en ${newEvent.location}.`,
      "calendario",
      currentUser?.email || "tesorero@ejemplo.com"
    );
  };

  const handleUpdateMeetingEvent = (updatedEvent: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedEvent.id ? updatedEvent : m));
    setFirestoreDoc("meetings", updatedEvent.id, updatedEvent);
  };

  const handleDeleteMeetingEvent = (eventId: string) => {
    setMeetings(prev => prev.map(m => {
      // If it's deleted, we could filter it out.
      return m;
    }).filter(m => m.id !== eventId));
    deleteFirestoreDoc("meetings", eventId);
  };

  // Reserve or release space recintos
  const handleUpdateSpaceStatus = (spaceId: string, isAvailable: boolean) => {
    setSpaces(prev => 
      prev.map(sp => {
        if (sp.id === spaceId) {
          const updated = {
            ...sp,
            available: isAvailable,
            notes: isAvailable ? "Disponible para reserva" : "Reservado temporalmente"
          };
          setFirestoreDoc("spaces", spaceId, updated);
          return updated;
        }
        return sp;
      })
    );
  };

  // Register new user direct
  const handleAddUserDirect = (newUser: User) => {
    setUsers([...users, newUser]);
    setFirestoreDoc("users", newUser.id, newUser);
  };

  // Enable/disable user toggle status
  const handleToggleUserStatusDirect = (userId: string) => {
    setUsers(prev => 
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, active: !u.active };
          setFirestoreDoc("users", userId, updated);
          return updated;
        }
        return u;
      })
    );
  };

  // Update specified user role array membership
  const handleUpdateUserRolesDirect = (userId: string, newRolesArray: string[]) => {
    setUsers(prev => 
      prev.map(u => {
        if (u.id === userId) {
          const updated = { ...u, roles: newRolesArray };
          setFirestoreDoc("users", userId, updated);
          return updated;
        }
        return u;
      })
    );
  };

  // Fully update a user's properties
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => 
      prev.map(u => u.id === updatedUser.id ? updatedUser : u)
    );
    setFirestoreDoc("users", updatedUser.id, updatedUser);
    // If the edited user is the current logged in user, update currentUser as well to avoid inconsistency
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  // Add a brand new cargo or role
  const handleCreateCargo = (newCargo: Cargo) => {
    setCargos(prev => [...prev, newCargo]);
    setFirestoreDoc("cargos", newCargo.id, newCargo);
  };

  // Update cargo attributes and granular permissions
  const handleUpdateCargo = (updatedCargo: Cargo) => {
    setCargos(prev => prev.map(c => c.id === updatedCargo.id ? updatedCargo : c));
    setFirestoreDoc("cargos", updatedCargo.id, updatedCargo);
  };

  // Remove a cargo
  const handleDeleteCargo = (cargoId: string) => {
    setCargos(prev => prev.filter(c => c.id !== cargoId));
    deleteFirestoreDoc("cargos", cargoId);
  };

  // Synchronize document resources to Firestore
  const handleUpdateResources = (updater: ResourceFile[] | ((prev: ResourceFile[]) => ResourceFile[])) => {
    setResources(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      
      // Sync differences to Firestore
      // 1. Identify deleted records
      const prevIds = new Set<string>(prev.map(r => r.id));
      const nextIds = new Set<string>(next.map(r => r.id));
      const deletedIds: string[] = Array.from(prevIds).filter(id => !nextIds.has(id));
      deletedIds.forEach(id => {
        deleteFirestoreDoc("resources", id);
      });
      
      // 2. Identify new or modified records
      next.forEach(newItem => {
        const prevItem = prev.find(p => p.id === newItem.id);
        if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(newItem)) {
          setFirestoreDoc("resources", newItem.id, newItem);
        }
      });
      
      return next;
    });
  };

  // Verify if a user has a specific permission
  const hasUserPermission = (user: User, permKey: string): boolean => {
    // Collect all permissions for this user
    const perms = new Set<string>();
    if (user.miembroDeJunta) {
      perms.add("ver_actas_junta");
    }
    user.roles.forEach(roleName => {
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
    return perms.has(permKey);
  };

  const isTabPermitted = (tab: Tab, user: User): boolean => {
    switch (tab) {
      case Tab.DASHBOARD:
        return hasUserPermission(user, "ver_resumen_inicio");
      case Tab.TES_DEPARTAMENTOS_VER:
        return hasUserPermission(user, "ver_planilla_departamentos");
      case Tab.TES_SOLICITUD_TRANS:
        return hasUserPermission(user, "solicitar_gasto_adelanto") || hasUserPermission(user, "gestionar_transferencias_presupuesto");
      case Tab.TES_GESTION_TRANS:
        return hasUserPermission(user, "gestionar_transferencias_presupuesto");
      case Tab.TES_CONCILIACION_BANCARIA:
        return hasUserPermission(user, "gestionar_transferencias_presupuesto");
      case Tab.TES_INFORMES:
        return hasUserPermission(user, "ver_informes_financieros");
      case Tab.TES_RESUMEN_FONDOS:
        return hasUserPermission(user, "solicitar_gasto_adelanto") || hasUserPermission(user, "autorizar_solicitudes_fondos");
      case Tab.TES_GESTION_FONDOS:
        return hasUserPermission(user, "autorizar_solicitudes_fondos");
      case Tab.TES_NUEVA_SOLICITUD:
        return hasUserPermission(user, "solicitar_gasto_adelanto");
      case Tab.TES_RESUMEN_RENDICIONES:
        return hasUserPermission(user, "solicitar_gasto_adelanto") || hasUserPermission(user, "autorizar_solicitudes_fondos");
      case Tab.TES_GESTION_RENDICIONES:
        return hasUserPermission(user, "autorizar_solicitudes_fondos");
      case Tab.TES_NUEVA_RENDICIONES:
        return hasUserPermission(user, "solicitar_gasto_adelanto");
      case Tab.SEC_ACTAS_BOARD:
        return hasUserPermission(user, "ver_actas_junta");
      case Tab.SEC_SUBIR_ACTA:
        return hasUserPermission(user, "cargar_actas_junta");
      case Tab.SEC_CALENDARIO:
        return hasUserPermission(user, "ver_resumen_inicio") || hasUserPermission(user, "gestionar_calendario_sesiones");

      case Tab.SEC_SOLICITAR_EVENTO_DIRECTOR:
        return hasUserPermission(user, "solicitar_gasto_adelanto");
      case Tab.SEC_GESTION_EVENTOS:
        return hasUserPermission(user, "gestionar_calendario_sesiones");
      case Tab.CONF_USUARIOS:
      case Tab.CONF_CARGOS:
      case Tab.CONF_DEPARTAMENTOS_EDIT:
      case Tab.CONF_DEPARTAMENTOS_CATEGORIAS:
        return hasUserPermission(user, "configuracion_sistema");
      default:
        return true;
    }
  };

  // Auto-redirect if the active tab is not permitted for the current user
  React.useEffect(() => {
    if (isLogged && !isTabPermitted(activeTab, currentUser)) {
      // Find any first permitted tab
      const allTabs = Object.values(Tab);
      const firstAllowed = allTabs.find(t => isTabPermitted(t, currentUser));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      } else {
        // Lock screen fallback or reset to Dashboard
        setActiveTab(Tab.DASHBOARD);
      }
    }
  }, [currentUser, activeTab, cargos, isLogged]);

  // Navigate to standard tabs safely
  const handleGoToTab = (targetTab: Tab) => {
    if (isTabPermitted(targetTab, currentUser)) {
      setActiveTab(targetTab);
    }
  };

  // Dynamically compute department's budget values based on actually approved renditions
  const departments = React.useMemo(() => {
    return rawDepartments.map(d => {
      // Sum the total amount of approved renditions belonging to this department
      const approvedRenditionsSum = renditions
        .filter(r => r.status === "Aprobada" && (r.department === d.name || r.department === d.category))
        .reduce((sum, r) => sum + r.totalAmount, 0);

      const ratio = d.budgetAllocated > 0 ? Math.round((approvedRenditionsSum / d.budgetAllocated) * 100) : 0;
      return {
        ...d,
        budgetUsed: approvedRenditionsSum,
        percentageUsed: ratio,
      };
    });
  }, [rawDepartments, renditions]);

  // Render Login view before showing internal dashboard if not logged
  if (!isLogged) {
    return <LoginView onLoginSuccess={handleLogin} users={users} />;
  }

  // Simple helper to humanize screen titles in the mobile top-bar
  const getCleanTabName = (tab: Tab): string => {
    switch (tab) {
      case Tab.DASHBOARD: return "Inicio";
      case Tab.TES_DEPARTAMENTOS_VER: return "Fondos de Tesorería";
      case Tab.TES_SOLICITUD_TRANS: return "Solicitud Transferencia";
      case Tab.TES_GESTION_TRANS: return "Gestión Transferencias";
      case Tab.TES_CONCILIACION_BANCARIA: return "Conciliación Bancaria";
      case Tab.TES_INFORMES: return "Informes";
      case Tab.TES_RESUMEN_FONDOS: return "Resumen Fondos";
      case Tab.TES_GESTION_FONDOS: return "Aprobar Fondos";
      case Tab.TES_NUEVA_SOLICITUD: return "Pedir Fondos";
      case Tab.TES_RESUMEN_RENDICIONES: return "Resumen Rendiciones";
      case Tab.TES_GESTION_RENDICIONES: return "Aprobar Rendición";
      case Tab.TES_NUEVA_RENDICIONES: return "Nueva Rendición";
      case Tab.SEC_ACTAS_BOARD: return "Actas de Junta";
      case Tab.SEC_SUBIR_ACTA: return "Subir Acta";
      case Tab.SEC_BALANCES_BOARD: return "Balances de Junta";
      case Tab.SEC_SUBIR_BALANCE: return "Nuevo Balance";
      case Tab.SEC_SOLICITUD_VOTOS: return "Pedir Voto";
      case Tab.SEC_GESTION_VOTOS: return "Gestión de Votos";
      case Tab.SEC_VOTOS_APROBADOS: return "Votos Aprobados";
      case Tab.SEC_CALENDARIO: return "Calendario";
      case Tab.SEC_SOLICITAR_EVENTO_DIRECTOR: return "Pedir Evento";
      case Tab.SEC_GESTION_EVENTOS: return "Ficha de Eventos";
      case Tab.CONF_MI_PERFIL: return "Mi Perfil / Clave";
      case Tab.CONF_USUARIOS: return "Gestión Usuarios";
      case Tab.CONF_CARGOS: return "Gestión de Cargos";
      case Tab.CONF_DEPARTAMENTOS_EDIT: return "Fondos y Topes";
      case Tab.CONF_DEPARTAMENTOS_CATEGORIAS: return "Departamentos";
      case Tab.CONF_DYNAMIC_LISTS: return "Listas Dinámicas";
      case Tab.CONF_GOOGLE_DRIVE: return "Google Drive";
      case Tab.RECURSOS_DOCUMENTOS: return "Materiales y Guías";
      case Tab.RECURSOS_DOCUMENTOS_GESTION: return "Gestión de Recursos";
      default: return "Menú";
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex font-sans overflow-x-hidden w-full">
      
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleGoToTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
        allUsers={users}
        cargos={cargos}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Frame container */}
      <main className="flex-1 min-h-screen pl-0 md:pl-[260px] lg:pl-[260px] bg-[#eef1f6] flex flex-col min-w-0 w-full overflow-x-hidden">

        {/* Sticky Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 md:hidden lg:hidden shadow-xs shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              type="button"
              className="p-1.5 text-slate-600 hover:text-[#1552a6] hover:bg-slate-50 border border-slate-150 rounded-xl outline-none cursor-pointer flex items-center justify-center transition-colors shadow-xs"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <span className="text-[12px] font-black text-[#1552a6] font-sans tracking-tight uppercase block leading-none">
                {getCleanTabName(activeTab)}
              </span>
              <span className="text-[8.5px] text-slate-400 font-bold block mt-1 tracking-wider uppercase font-mono leading-none">
                IASD Los Creadores
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right leading-none select-none">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{currentUser.roles[0].substring(0, 15)}</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1552a6]/5 to-indigo-100/10 border border-slate-200 flex items-center justify-center text-[#1552a6] font-sans text-xs font-black">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-4 space-y-6 w-full min-w-0">
          
          {/* Active Tab Router */}
          {activeTab === Tab.DASHBOARD && (
            <DashboardView 
              currentUser={currentUser} 
              onNavigate={handleGoToTab}
              departments={departments}
              meetings={meetings}
              fundRequests={fundRequests}
              renditions={renditions}
              cargos={cargos}
              bankAccounts={bankAccounts}
              bankTransactions={bankTransactions}
              notifications={userNotifications}
              onMarkNotificationRead={handleMarkNotificationRead}
              onClearAllNotifications={handleClearAllNotifications}
            />
          )}

          {activeTab === Tab.TES_DEPARTAMENTOS_VER && (
            <DepartamentosView 
              departments={departments}
              onCreateDepartment={handleCreateDepartment}
              onAdjustBudget={handleAdjustBudgetTope}
              onUpdateDepartment={handleUpdateDepartment}
              currentUser={currentUser}
              mode="view"
              cargos={cargos}
              categories={categories}
              categoryColors={categoryColors}
            />
          )}

          {activeTab === Tab.TES_SOLICITUD_TRANS && (
            <TransferenciasView 
              departments={departments}
              transfers={transfers}
              onAddTransfer={handleAddTransfer}
              onUpdateDeptBalance={handleUpdateDeptBalance}
              currentUser={currentUser}
              mode="request"
              cargos={cargos}
              onUpdateTransferFields={handleUpdateTransferFields}
            />
          )}

          {activeTab === Tab.TES_GESTION_TRANS && (
            <TransferenciasView 
              departments={departments}
              transfers={transfers}
              onAddTransfer={handleAddTransfer}
              onUpdateDeptBalance={handleUpdateDeptBalance}
              currentUser={currentUser}
              mode="manage"
              cargos={cargos}
              onUpdateTransferFields={handleUpdateTransferFields}
            />
          )}

          {activeTab === Tab.TES_INFORMES && (
            <ReportesView 
              departments={departments}
              fundRequests={fundRequests}
              renditions={renditions}
              bankTransactions={bankTransactions}
              boardActas={boardActas}
            />
          )}

          {activeTab === Tab.TES_CONCILIACION_BANCARIA && (
            <ConciliacionBancariaView 
              currentUser={currentUser}
              bankAccounts={bankAccounts}
              bankTransactions={bankTransactions}
              onUpdateBankAccounts={handleUpdateBankAccounts}
              onAddBankTransaction={handleAddBankTransaction}
              onDeleteBankTransaction={handleDeleteBankTransaction}
            />
          )}

          {activeTab === Tab.TES_RESUMEN_FONDOS && (
            <SolicitudesView 
              departments={departments}
              fundRequests={fundRequests}
              onAddRequest={handleAddFundRequest}
              onUpdateRequestStatus={handleUpdateFundRequestStatus}
              currentUser={currentUser}
              mode="resumen"
              cargos={cargos}
              bankList={bankList}
            />
          )}

          {activeTab === Tab.TES_GESTION_FONDOS && (
            <SolicitudesView 
              departments={departments}
              fundRequests={fundRequests}
              onAddRequest={handleAddFundRequest}
              onUpdateRequestStatus={handleUpdateFundRequestStatus}
              currentUser={currentUser}
              mode="gestion"
              cargos={cargos}
              bankList={bankList}
            />
          )}

          {activeTab === Tab.TES_NUEVA_SOLICITUD && (
            <SolicitudesView 
              departments={departments}
              fundRequests={fundRequests}
              onAddRequest={handleAddFundRequest}
              onUpdateRequestStatus={handleUpdateFundRequestStatus}
              currentUser={currentUser}
              mode="nueva"
              cargos={cargos}
              bankList={bankList}
            />
          )}

          {activeTab === Tab.TES_RESUMEN_RENDICIONES && (
            <RendicionesView 
              departments={departments}
              renditions={renditions}
              onAddRendition={handleAddRendition}
              onUpdateRenditionStatus={handleUpdateRenditionStatus}
              onUpdateRenditionFields={handleUpdateRenditionFields}
              currentUser={currentUser}
              mode="resumen"
              cargos={cargos}
              fundRequests={fundRequests}
              bankList={bankList}
              expenseCategories={expenseCategories}
              documentTypes={documentTypes}
              boardVotos={boardVotos}
            />
          )}

          {activeTab === Tab.TES_GESTION_RENDICIONES && (
            <RendicionesView 
              departments={departments}
              renditions={renditions}
              onAddRendition={handleAddRendition}
              onUpdateRenditionStatus={handleUpdateRenditionStatus}
              onUpdateRenditionFields={handleUpdateRenditionFields}
              currentUser={currentUser}
              mode="gestion"
              cargos={cargos}
              fundRequests={fundRequests}
              bankList={bankList}
              expenseCategories={expenseCategories}
              documentTypes={documentTypes}
              boardVotos={boardVotos}
            />
          )}

          {activeTab === Tab.TES_NUEVA_RENDICIONES && (
            <RendicionesView 
              departments={departments}
              renditions={renditions}
              onAddRendition={handleAddRendition}
              onUpdateRenditionStatus={handleUpdateRenditionStatus}
              onUpdateRenditionFields={handleUpdateRenditionFields}
              currentUser={currentUser}
              mode="nueva"
              cargos={cargos}
              fundRequests={fundRequests}
              bankList={bankList}
              expenseCategories={expenseCategories}
              documentTypes={documentTypes}
              boardVotos={boardVotos}
            />
          )}

          {activeTab === Tab.SEC_ACTAS_BOARD && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="actas"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_SUBIR_ACTA && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="upload_acta"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_BALANCES_BOARD && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="balances"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_SUBIR_BALANCE && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="upload_balance"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_SOLICITUD_VOTOS && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="votos_solicitud"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_GESTION_VOTOS && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="votos_gestion"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_VOTOS_APROBADOS && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="votos_aprobados"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_CALENDARIO && (
            <SecretariaView 
              meetings={meetings}
              spaces={spaces}
              onAddMeeting={handleAddMeetingEvent}
              onUpdateSpaceStatus={handleUpdateSpaceStatus}
              currentUser={currentUser}
              mode="calendario"
              boardActas={boardActas}
              onAddBoardActa={handleAddBoardActa}
              tesoreriaBalances={tesoreriaBalances}
              onAddTesoreriaBalance={handleAddTesoreriaBalance}
              boardVotos={boardVotos}
              onAddBoardVoto={handleCreateBoardVoto}
              onUpdateBoardVotoStatus={handleUpdateBoardVotoStatus}
              onEditBoardVoto={handleEditBoardVoto}
              votosPlazoLimite={votosPlazoLimite}
              onUpdateVotosPlazoLimite={handleUpdateVotosPlazoLimite}
            />
          )}

          {activeTab === Tab.SEC_SOLICITAR_EVENTO_DIRECTOR && (
            <SolicitarEventoDirectorView 
              currentUser={currentUser}
              departments={departments}
              categories={categories}
              meetings={meetings}
              onAddMeeting={handleAddMeetingEvent}
            />
          )}

          {activeTab === Tab.SEC_GESTION_EVENTOS && (
            <GestionEventosSecretariaView 
              meetings={meetings}
              departments={departments}
              categories={categories}
              currentUser={currentUser}
              onUpdateEvent={handleUpdateMeetingEvent}
              onDeleteEvent={handleDeleteMeetingEvent}
              onAddEvent={handleAddMeetingEvent}
            />
          )}

          {activeTab === Tab.CONF_MI_PERFIL && (
            <MiPerfilView 
              currentUser={currentUser}
              onUpdateProfile={handleUpdateUser}
            />
          )}

          {activeTab === Tab.CONF_USUARIOS && (
            <UsuariosView 
              users={users}
              onAddUser={handleAddUserDirect}
              onToggleUserStatus={handleToggleUserStatusDirect}
              onModifyUserRoles={handleUpdateUserRolesDirect}
              onUpdateUser={handleUpdateUser}
              departments={departments}
              cargos={cargos}
              categories={categories}
              categoryColors={categoryColors}
              mode="usuarios"
            />
          )}

          {activeTab === Tab.CONF_CARGOS && (
            <UsuariosView 
              users={users}
              onAddUser={handleAddUserDirect}
              onToggleUserStatus={handleToggleUserStatusDirect}
              onModifyUserRoles={handleUpdateUserRolesDirect}
              onUpdateUser={handleUpdateUser}
              departments={departments}
              cargos={cargos}
              categories={categories}
              categoryColors={categoryColors}
              onCreateCargo={handleCreateCargo}
              onUpdateCargo={handleUpdateCargo}
              onDeleteCargo={handleDeleteCargo}
              mode="cargos"
            />
          )}

          {activeTab === Tab.CONF_DEPARTAMENTOS_EDIT && (
            <DepartamentosView 
              departments={departments}
              onCreateDepartment={handleCreateDepartment}
              onAdjustBudget={handleAdjustBudgetTope}
              onUpdateDepartment={handleUpdateDepartment}
              currentUser={currentUser}
              mode="edit"
              cargos={cargos}
              categories={categories}
              categoryColors={categoryColors}
            />
          )}

          {activeTab === Tab.CONF_DEPARTAMENTOS_CATEGORIAS && (
            <GestionDepartamentosView 
              categories={categories}
              departments={departments}
              categoryColors={categoryColors}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onUpdateCategoryColor={handleUpdateCategoryColor}
            />
          )}

          {activeTab === Tab.CONF_DYNAMIC_LISTS && (
            <GestionListasConfig 
              expenseCategories={expenseCategories}
              bankList={bankList}
              documentTypes={documentTypes}
              onUpdateExpenseCategories={handleUpdateExpenseCategories}
              onUpdateBankList={handleUpdateBankList}
              onUpdateDocumentTypes={handleUpdateDocumentTypes}
            />
          )}

          {activeTab === Tab.CONF_GOOGLE_DRIVE && (
            <GestionGoogleDrive 
              config={googleDriveConfig}
              onUpdateConfig={setGoogleDriveConfig}
            />
          )}

          {activeTab === Tab.RECURSOS_DOCUMENTOS && (
            <RecursosDocumentosView 
              currentUser={currentUser}
              mode="view"
              resources={resources}
              onUpdateResources={handleUpdateResources}
            />
          )}

          {activeTab === Tab.RECURSOS_DOCUMENTOS_GESTION && (
            <RecursosDocumentosView 
              currentUser={currentUser}
              mode="gestion"
              resources={resources}
              onUpdateResources={handleUpdateResources}
            />
          )}

        </div>
      </main>

    </div>
  );
}
