/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
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
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    return localStorage.getItem("iasd_isLogged") === "true";
  });
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

  // Theme state for Dark Mode (ACMS-like)
  const [theme, setTheme] = useState<"light" | "dark" | "">(() => {
    return (localStorage.getItem("iasd_theme") as "light" | "dark") || "dark";
  });

  useEffect(() => {
    if (!theme) return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("iasd_theme", theme);
  }, [theme]);

  // Drawer state for sliding User Settings
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);

  // Core global data collections as React states to make the entire app fully functional
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [users, setUsers] = useState<User[]>(USERS_SEED);
  const [usersLoadedFromDB, setUsersLoadedFromDB] = useState(false);

  // Listen for Firebase Auth changes to preserve Google login sessions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const matched = users.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (matched) {
          try {
            localStorage.setItem("iasd_isLogged", "true");
            localStorage.setItem("iasd_currentUser", JSON.stringify(matched));
          } catch (e) {
            console.error(e);
          }
          setIsLogged(true);
          setCurrentUser(matched);
        }
      }
    });
    return () => unsubscribe();
  }, [users]);

  // Keep currentUser synced with database updates to the users list
  useEffect(() => {
    if (isLogged && currentUser && usersLoadedFromDB) {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (dbUser) {
        // Compare values to prevent infinite render loops
        const keysToCompare: (keyof User)[] = ["name", "email", "phone", "password", "roles", "departments", "active", "imageUrl", "avatarLetter"];
        const hasChanged = keysToCompare.some(key => JSON.stringify(dbUser[key]) !== JSON.stringify(currentUser[key]));
        if (hasChanged) {
          console.log("Syncing currentUser with Firestore database updates:", dbUser.name);
          setCurrentUser(dbUser);
          try {
            localStorage.setItem("iasd_currentUser", JSON.stringify(dbUser));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }, [users, isLogged, currentUser, usersLoadedFromDB]);

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
      const safeSeed = async (colName: string, seedData: any[]) => {
        try {
          await seedCollectionIfEmpty(colName, seedData);
        } catch (error) {
          console.warn(`[Firebase Seed Warning] Failed to seed collection '${colName}':`, error);
        }
      };

      const safeSubscribe = <T,>(colName: string, onUpdate: (items: T[]) => void) => {
        try {
          const unsub = subscribeCollection<T>(colName, onUpdate);
          unsubscribers.push(unsub);
        } catch (error) {
          console.error(`[Firebase Subscription Error] Failed subscribing to '${colName}':`, error);
        }
      };

      try {
        await safeSeed("users", USERS_SEED);
        await safeSeed("cargos", CARGOS_SEED);
        await safeSeed("departments", DEPARTMENTS_SEED);
        await safeSeed("transfers", TRANSFERS_SEED);
        await safeSeed("fundRequests", FUND_REQUESTS_SEED);
        await safeSeed("renditions", EXPENSE_RENDITIONS_SEED);
        await safeSeed("meetings", MEETINGS_SEED);
        await safeSeed("spaces", SPACES_SEED);
        await safeSeed("bankAccounts", BANK_ACCOUNTS_SEED);
        await safeSeed("bankTransactions", BANK_TRANSACTIONS_SEED);
        await safeSeed("boardActas", boardActas);
        await safeSeed("tesoreriaBalances", tesoreriaBalances);
        await safeSeed("boardVotos", boardVotos);
        await safeSeed("notifications", notifications);
        await safeSeed("resources", resources);

        // Seed settings collection
        await safeSeed("settings", [
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

        safeSubscribe<User>("users", (items) => {
          if (items.length > 0) {
            setUsers(items);
            setUsersLoadedFromDB(true);
          }
        });
        safeSubscribe<Cargo>("cargos", (items) => {
          if (items.length > 0) setCargos(items);
        });
        safeSubscribe<Department>("departments", (items) => {
          if (items.length > 0) setRawDepartments(items);
        });
        safeSubscribe<Transfer>("transfers", (items) => {
          setTransfers(items);
        });
        safeSubscribe<FundRequest>("fundRequests", (items) => {
          setFundRequests(items);
        });
        safeSubscribe<ExpenseRendition>("renditions", (items) => {
          setRenditions(items);
        });
        safeSubscribe<Meeting>("meetings", (items) => {
          setMeetings(items);
        });
        safeSubscribe<SpaceResource>("spaces", (items) => {
          if (items.length > 0) setSpaces(items);
        });
        safeSubscribe<BankAccount>("bankAccounts", (items) => {
          if (items.length > 0) setBankAccounts(items);
        });
        safeSubscribe<BankTransaction>("bankTransactions", (items) => {
          setBankTransactions(items);
        });
        safeSubscribe<BoardActa>("boardActas", (items) => {
          setBoardActas(items);
        });
        safeSubscribe<TesoreriaBalance>("tesoreriaBalances", (items) => {
          setTesoreriaBalances(items);
        });
        safeSubscribe<BoardVoto>("boardVotos", (items) => {
          setBoardVotos(items);
        });
        safeSubscribe<SystemNotification>("notifications", (items) => {
          const realNotifs = items.filter(n => !["notif-1", "notif-2", "notif-3"].includes(n.id));
          setNotifications(realNotifs);
        });
        safeSubscribe<ResourceFile>("resources", (items) => {
          if (items.length > 0) setResources(items);
        });

        safeSubscribe<{ id: string; value: any }>("settings", (items) => {
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
        });
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
    if (!currentUser) return [];

    const isTesorero = currentUser.roles.some(r => r.toLowerCase().includes("tesorero"));
    const isSecretario = currentUser.roles.some(r => r.toLowerCase().includes("secretar"));
    const isPastorOrJunta = currentUser.roles.some(r => 
      r.toLowerCase().includes("pastor") || 
      r.toLowerCase().includes("anciano")
    ) || currentUser.miembroDeJunta;

    return notifications.filter(n => {
      // 1. Direct recipient
      if (n.userEmail && n.userEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        return true;
      }

      // 2. Treasurer gets all fund requests and renditions
      if (isTesorero && (n.category === "solicitud" || n.category === "rendicion")) {
        return true;
      }

      // 3. Secretary gets calendar/event coordination notifications
      if (isSecretario && n.category === "calendario") {
        return true;
      }

      // 4. Department match: if the message or title contains the name of any department the user is in
      if (currentUser.departments && currentUser.departments.length > 0) {
        const hasDeptMatch = currentUser.departments.some(d => 
          n.message.toLowerCase().includes(d.toLowerCase()) || 
          n.title.toLowerCase().includes(d.toLowerCase())
        );
        if (hasDeptMatch) return true;
      }

      // 5. General system notification with no specific target user, only shown to general board members/admin
      if (!n.userEmail) {
        if (n.category === "sistema") return true; 
        if (n.category === "calendario" && isPastorOrJunta) return true;
      }

      return false;
    });
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
    try {
      localStorage.setItem("iasd_isLogged", "true");
      localStorage.setItem("iasd_currentUser", JSON.stringify(authenticatedUser));
    } catch (e) {
      console.error("Failed to save login session", e);
    }
    setCurrentUser(authenticatedUser);
    setIsLogged(true);
    setActiveTab(Tab.DASHBOARD);
  };

  // Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem("iasd_isLogged");
      localStorage.removeItem("iasd_currentUser");
    } catch (e) {
      console.error("Failed to clear login session", e);
    }
    setIsLogged(false);
    setActiveTab(Tab.LOGIN);
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
      <main className="flex-1 min-h-screen pl-0 md:pl-[260px] lg:pl-[260px] bg-[#eef1f6] dark:bg-[#0b0f19] flex flex-col min-w-0 w-full overflow-x-hidden transition-colors duration-300">

        {/* Sticky Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#121829] border-b border-slate-200 dark:border-slate-800 md:hidden lg:hidden shadow-sm shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              type="button"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#1552a6] hover:bg-slate-50 dark:hover:bg-[#1c243c] border border-slate-150 dark:border-slate-800 rounded-xl outline-none cursor-pointer flex items-center justify-center transition-colors shadow-xs"
              title="Abrir menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <span className="text-[12px] font-black text-[#1552a6] dark:text-sky-400 font-sans tracking-tight uppercase block leading-none">
                {getCleanTabName(activeTab)}
              </span>
              <span className="text-[8.5px] text-slate-400 font-bold block mt-1 tracking-wider uppercase font-mono leading-none">
                IASD Los Creadores
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Mobile Theme toggle */}
            <button 
              onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-amber-400 bg-slate-50 dark:bg-[#0e1220] hover:bg-slate-100 dark:hover:bg-[#1c243c] transition-all cursor-pointer flex items-center justify-center"
              title="Cambiar Modo"
            >
              {theme === "dark" ? (
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05L5.75 4.343a1 1 0 10-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* Clickable Mobile User Profile */}
            <button 
              onClick={() => setIsUserSettingsOpen(true)}
              className="flex items-center gap-1.5 text-left border border-slate-200 dark:border-slate-800 p-1 rounded-xl bg-slate-50 dark:bg-[#0e1220] hover:bg-slate-100 dark:hover:bg-[#1a223f] transition-all cursor-pointer"
            >
              <div className="text-right leading-none select-none pl-1 hidden sm:block">
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{currentUser.roles[0].substring(0, 10)}..</p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#1552a6]/10 dark:bg-sky-500/10 flex items-center justify-center text-[#1552a6] dark:text-sky-400 font-sans text-[10px] font-black overflow-hidden border border-slate-200 dark:border-slate-750">
                {currentUser.imageUrl ? (
                  <img src={currentUser.imageUrl} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentUser.avatarLetter || currentUser.name.substring(0, 2).toUpperCase()
                )}
              </div>
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-4 space-y-6 w-full min-w-0">

          {/* Persistent Desktop Top Header bar (ACMS Capsules style) */}
          <div className="hidden md:flex lg:flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/85 pb-4 mb-3 select-none">
            {/* Left: Section Indicator & supporting badge */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest text-[#1552a6] dark:text-sky-400 uppercase font-mono">
                  Sistema de Gestión Eclesiástica
                </span>
                <h2 className="text-lg font-extrabold text-slate-800 dark:text-white capitalize">
                  {getCleanTabName(activeTab)}
                </h2>
              </div>
              {activeTab === Tab.DASHBOARD && (
                <a 
                  href="#support"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToTab(Tab.RECURSOS_DOCUMENTOS);
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-black text-[#1552a6] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-950/80 transition-all border border-[#1552a6]/20 shadow-xxs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Material de Apoyo
                </a>
              )}
            </div>

            {/* Right: ACMS Styled Action Pills */}
            <div className="flex items-center gap-3">
              {/* Light / Dark Mode Toggle Button */}
              <button 
                onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
                className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121829] hover:bg-slate-100 dark:hover:bg-[#1c243c] text-indigo-600 dark:text-amber-400 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                title="Alternar tema claro/oscuro"
              >
                {theme === "dark" ? (
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.46 5.05L5.75 4.343a1 1 0 10-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>

              {/* Capsule A: Adventist Church info (los Creadores) */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-full shadow-sm text-left">
                <div className="w-7 h-7 rounded-full bg-[#1552a6] flex items-center justify-center text-white shrink-0 shadow-inner overflow-hidden border border-slate-150 dark:border-slate-700">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="leading-tight pr-1 select-none">
                  <p className="text-[11px] font-black text-slate-800 dark:text-white leading-none">los Creadores</p>
                  <p className="text-[8.5px] font-bold text-[#1552a6] dark:text-sky-450 mt-0.5 whitespace-nowrap leading-none">Temuco Nor Poniente - ASACh</p>
                </div>
              </div>

              {/* Capsule B: Clickable User Profile Pill */}
              <button 
                onClick={() => setIsUserSettingsOpen(true)}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-full shadow-sm text-left hover:border-[#1552a6]/40 dark:hover:border-sky-400/40 hover:bg-slate-50 dark:hover:bg-[#1c243c] transition-all cursor-pointer group active:scale-98"
              >
                <div className="w-7 h-7 rounded-full bg-[#1552a6]/10 dark:bg-sky-500/10 flex items-center justify-center text-[#1552a6] dark:text-sky-400 text-xxs font-black shrink-0 shadow-inner overflow-hidden border border-slate-200 dark:border-slate-700">
                  {currentUser.imageUrl ? (
                    <img 
                      src={currentUser.imageUrl} 
                      alt="User profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    currentUser.avatarLetter || currentUser.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="leading-tight pr-1.5">
                  <p className="text-[11px] font-black text-slate-800 dark:text-white group-hover:text-[#1552a6] dark:group-hover:text-sky-450 transition-colors leading-none">{currentUser.name}</p>
                  <p className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 leading-none">{currentUser.roles[0]}</p>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
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
              bankTransactions={bankTransactions}
              fundRequests={fundRequests}
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
              bankTransactions={bankTransactions}
              fundRequests={fundRequests}
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
              bankTransactions={bankTransactions}
              fundRequests={fundRequests}
            />
          )}

          {activeTab === Tab.TES_INFORMES && (
            <ReportesView 
              departments={departments}
              fundRequests={fundRequests}
              renditions={renditions}
              bankTransactions={bankTransactions}
              boardActas={boardActas}
              bankAccounts={bankAccounts}
              onUpdateBankAccounts={handleUpdateBankAccounts}
              onAddBankTransaction={handleAddBankTransaction}
              onAddTransfer={handleAddTransfer}
              onUpdateDepartment={handleUpdateDepartment}
              onUpdateDeptBalance={handleUpdateDeptBalance}
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
              bankTransactions={bankTransactions}
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
              bankTransactions={bankTransactions}
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
              onSuccessRedirect={() => setActiveTab(Tab.TES_RESUMEN_FONDOS)}
              bankTransactions={bankTransactions}
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
              googleDriveConfig={googleDriveConfig}
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
              googleDriveConfig={googleDriveConfig}
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
              googleDriveConfig={googleDriveConfig}
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
              bankTransactions={bankTransactions}
              fundRequests={fundRequests}
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

      {/* Sliding Right Drawer: Ajustes de Usuario (ACMS Style) */}
      {isUserSettingsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none animate-fade-in" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Dark glass backdrop overlay */}
            <div 
              onClick={() => setIsUserSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer duration-300" 
              aria-hidden="true"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              {/* Drawer Panel */}
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out">
                <div className="flex h-full flex-col bg-white dark:bg-[#0e1220] border-l border-slate-200 dark:border-slate-800 shadow-2xl">
                  
                  {/* Drawer Header */}
                  <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#121829]/50">
                    <h2 className="text-sm font-black text-[#1552a6] dark:text-sky-400 uppercase tracking-widest font-sans" id="slide-over-title">
                      Ajustes De Usuario
                    </h2>
                    <button 
                      onClick={() => setIsUserSettingsOpen(false)}
                      type="button" 
                      className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c243c] hover:text-slate-600 dark:hover:text-white transition-all cursor-pointer"
                    >
                      <span className="sr-only">Cerrar</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Drawer Body with Custom Scrollbar */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
                    
                    {/* 1. Portrait & User Info */}
                    <div className="bg-slate-50 dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center shadow-xs">
                      <div className="w-20 h-20 rounded-full bg-[#1552a6]/10 dark:bg-sky-500/10 flex items-center justify-center text-[#1552a6] dark:text-sky-400 text-lg font-black shrink-0 shadow-inner overflow-hidden border-2 border-slate-200 dark:border-slate-700 relative group mb-4">
                        {currentUser.imageUrl ? (
                          <img 
                            src={currentUser.imageUrl} 
                            alt="User" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          currentUser.avatarLetter || currentUser.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <h3 className="text-md font-extrabold text-slate-800 dark:text-white mb-1 leading-tight font-sans">
                        {currentUser.name}
                      </h3>
                      <p className="text-xs text-[#1552a6] dark:text-sky-400 font-bold mb-3 uppercase tracking-wider font-mono">
                        {currentUser.roles.join(" / ")}
                      </p>
                      
                      {/* Interactive badge of active state */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 shadow-xxs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Sesión Activa
                      </span>
                    </div>

                    {/* 2. Actions List */}
                    <div className="space-y-1">
                      <button 
                        onClick={() => {
                          handleGoToTab(Tab.CONF_MI_PERFIL);
                          setIsUserSettingsOpen(false);
                        }}
                        className="w-full flex items-center justify-between text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:text-[#1552a6] dark:hover:text-sky-400 hover:bg-[#eef4fc] dark:hover:bg-[#1c243c] rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/80 transition-all cursor-pointer group font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#1552a6] dark:group-hover:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Perfil de Usuario</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#1552a6] dark:group-hover:text-sky-400 transform group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button 
                        onClick={() => {
                          handleGoToTab(Tab.CONF_MI_PERFIL);
                          setIsUserSettingsOpen(false);
                        }}
                        className="w-full flex items-center justify-between text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:text-[#1552a6] dark:hover:text-sky-400 hover:bg-[#eef4fc] dark:hover:bg-[#1c243c] rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/80 transition-all cursor-pointer group font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#1552a6] dark:group-hover:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Cambiar contraseña</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#1552a6], dark:group-hover:text-sky-400 transform group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button 
                        onClick={() => {
                          alert("Configuración de seguridad corporativa encriptada por IASD División Sudamericana.");
                        }}
                        className="w-full flex items-center justify-between text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:text-[#1552a6] dark:hover:text-sky-400 hover:bg-[#eef4fc] dark:hover:bg-[#1c243c] rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/80 transition-all cursor-pointer group font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#1552a6] dark:group-hover:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Información de Seguridad</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#1552a6] dark:group-hover:text-sky-400 transform group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      <button 
                        onClick={() => {
                          alert("Sistema de Gestión de Tesorería v4.2.1-stable. Todos los libros consolidados.");
                        }}
                        className="w-full flex items-center justify-between text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:text-[#1552a6] dark:hover:text-sky-400 hover:bg-[#eef4fc] dark:hover:bg-[#1c243c] rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/80 transition-all cursor-pointer group font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#1552a6] dark:group-hover:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span>Notas de la versión</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-[#1552a6] dark:group-hover:text-sky-400 transform group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* 3. Theme Toggle Section */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-[#1552a6] dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
                          Tema Visual
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setTheme("light")}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                            theme === "light" 
                              ? "bg-[#eef4fc] text-[#1552a6] border-[#1552a6]/25" 
                              : "bg-white dark:bg-[#121829] text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#1c243c]"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Claro</span>
                        </button>

                        <button 
                          onClick={() => setTheme("dark")}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                            theme === "dark" 
                              ? "bg-[#1552a6] text-white border-transparent" 
                              : "bg-white dark:bg-[#121829] text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span>Oscuro</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Drawer Footer */}
                  <div className="p-6 bg-slate-50/50 dark:bg-[#121829]/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button 
                      onClick={() => {
                        setIsUserSettingsOpen(false);
                        handleLogout();
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar Sesión (Salir)
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
