/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Department, Transfer, FundRequest, ExpenseRendition, Meeting, SpaceResource, User, Cargo, BankAccount, BankTransaction } from "./types";

export const BRAND_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuCQ55DnfXeVUyaI_fYT357DBeebfP-mdADwYoYMs4Rj_tJphtyyBwLI-Qmatuxx-3sKTNf5xMT5szEevlUEb-tATuQgpaUwuU4LtQOyHIPseZrGo9TVg8rYTk9_qTNPVmG2y1yZYpanyh2JflOZMqX65Li15juZgZOFnlR5D7xynGjjRzO6YqcIhdVWzLgZLZ6TLspNGyxhhGsVAO8QSL0IsXUbcF8ffzV2cSF3s4E0CKK1-VzVtNtfD7ApXcwg4lRUeSjCVnbeYzoU";

export const USERS_SEED: User[] = [
  {
    id: "usr-1",
    name: "Director Demo",
    email: "director@ejemplo.com",
    password: "12345",
    roles: ["Director"],
    departments: ["Acción Solidaria Adventista (ASA)", "Audio Visual", "Club de Aventureros", "Club de Conquistadores", "Departamento de Música", "Comunicación"],
    active: true,
    avatarLetter: "DD",
    miembroDeJunta: true
  },
  {
    id: "usr-2",
    name: "Tesorero Demo",
    email: "tesorero@ejemplo.com",
    password: "12345",
    roles: ["Tesorero"],
    departments: ["Audio Visual", "Cobranzas ASACh", "Diaconos", "Gasto de Iglesia", "Gastos Distritales", "Ofrendas Especiales", "Proyectos Especiales"],
    active: true,
    avatarLetter: "TD",
    miembroDeJunta: true
  },
  {
    id: "usr-5",
    name: "Anciano Demo",
    email: "anciano@ejemplo.com",
    password: "12345",
    roles: ["Anciano"],
    departments: [],
    active: true,
    avatarLetter: "AD",
    miembroDeJunta: true
  },
  {
    id: "usr-6",
    name: "Pastor Demo",
    email: "pastor@ejemplo.com",
    password: "12345",
    roles: ["Pastor Distrital"],
    departments: [],
    active: true,
    avatarLetter: "PD",
    miembroDeJunta: true
  },
  {
    id: "usr-22",
    name: "Secretaria Demo",
    email: "secretaria@ejemplo.com",
    password: "12345",
    roles: ["Secretaria"],
    departments: ["Secretaría"],
    active: true,
    avatarLetter: "SD",
    miembroDeJunta: true
  },
  {
    id: "usr-23",
    name: "Tesorero Dept Demo",
    email: "asistente@ejemplo.com",
    password: "12345",
    roles: ["Tesorero Departamento"],
    departments: ["Club de Conquistadores", "Club de Conquistadores - Beneficios", "Club de Conquistadores - Camporee"],
    active: true,
    avatarLetter: "TD",
    miembroDeJunta: false
  }
];

export const DEPARTMENTS_SEED: Department[] = [
  {
    id: "dep-11",
    name: "Acción Solidaria Adventista (ASA)",
    code: "11",
    category: "Acción Solidaria Adventista (ASA)",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 250000,
    budgetUsed: 42000,
    percentageUsed: 17,
    assignedPercentage: 2,
    initialBudget: 250000
  },
  {
    id: "dep-38",
    name: "Audio Visual",
    code: "38",
    category: "Audio Visual",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 80000,
    budgetUsed: 35000,
    percentageUsed: 44,
    assignedPercentage: 0,
    initialBudget: 80000
  },
  {
    id: "dep-12",
    name: "Club de Aventureros",
    code: "12",
    category: "Club de Aventureros",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 375000,
    budgetUsed: 125000,
    percentageUsed: 33,
    assignedPercentage: 3,
    initialBudget: 375000
  },
  {
    id: "dep-13",
    name: "Club de Conquistadores",
    code: "13",
    category: "Club de Conquistadores",
    director: "Director Demo",
    tesorero: "Tesorero Dept Demo",
    budgetAllocated: 500000,
    budgetUsed: 180000,
    percentageUsed: 36,
    assignedPercentage: 4,
    initialBudget: 500000
  },
  {
    id: "dep-51",
    name: "Club de Conquistadores - Beneficios",
    code: "51",
    category: "Club de Conquistadores",
    director: "Director Demo",
    tesorero: "Tesorero Dept Demo",
    budgetAllocated: 120000,
    budgetUsed: 24000,
    percentageUsed: 20,
    assignedPercentage: 0,
    initialBudget: 120000
  },
  {
    id: "dep-41",
    name: "Club de Conquistadores - Camporee",
    code: "41",
    category: "Club de Conquistadores",
    director: "Director Demo",
    tesorero: "Tesorero Dept Demo",
    budgetAllocated: 250000,
    budgetUsed: 110000,
    percentageUsed: 44,
    assignedPercentage: 0,
    initialBudget: 250000
  },
  {
    id: "dep-40",
    name: "Cobranzas ASACh",
    code: "40",
    category: "Tesorería",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 100000,
    budgetUsed: 0,
    percentageUsed: 0,
    assignedPercentage: 0,
    initialBudget: 100000
  },
  {
    id: "dep-15",
    name: "Comunicación",
    code: "15",
    category: "Comunicación",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 25000,
    percentageUsed: 20,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-53",
    name: "Coro de Niños",
    code: "53",
    category: "Departamento de Música",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 80000,
    budgetUsed: 12000,
    percentageUsed: 15,
    assignedPercentage: 0,
    initialBudget: 80000
  },
  {
    id: "dep-23",
    name: "Departamento de Música",
    code: "23",
    category: "Departamento de Música",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 48000,
    percentageUsed: 38,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-9",
    name: "Diaconisas",
    code: "9",
    category: "Diaconisas",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 35000,
    percentageUsed: 28,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-8",
    name: "Diaconos",
    code: "8",
    category: "Diaconos",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 20000,
    percentageUsed: 16,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-26",
    name: "Educación",
    code: "26",
    category: "Educación",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 250000,
    budgetUsed: 54000,
    percentageUsed: 22,
    assignedPercentage: 2,
    initialBudget: 250000
  },
  {
    id: "dep-7",
    name: "Escuela Sabática",
    code: "7",
    category: "Escuela Sabática",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 375000,
    budgetUsed: 98000,
    percentageUsed: 26,
    assignedPercentage: 3,
    initialBudget: 375000
  },
  {
    id: "dep-6",
    name: "Evangelismo",
    code: "6",
    category: "Evangelismo",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 1125000,
    budgetUsed: 430000,
    percentageUsed: 38,
    assignedPercentage: 9,
    initialBudget: 1125000
  },
  {
    id: "dep-1",
    name: "Gasto de Iglesia",
    code: "1",
    category: "Tesorería",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 6625000,
    budgetUsed: 2150000,
    percentageUsed: 32,
    assignedPercentage: 53,
    initialBudget: 6625000
  },
  {
    id: "dep-50",
    name: "Gastos Distritales",
    code: "50",
    category: "Tesorería",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 200000,
    budgetUsed: 45000,
    percentageUsed: 23,
    assignedPercentage: 0,
    initialBudget: 200000
  },
  {
    id: "dep-42",
    name: "Libros Misioneros",
    code: "42",
    category: "Ministerio de Publicaciones",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 150000,
    budgetUsed: 32000,
    percentageUsed: 21,
    assignedPercentage: 0,
    initialBudget: 150000
  },
  {
    id: "dep-20",
    name: "Ministerio de la Familia",
    code: "20",
    category: "Ministerio de la Familia",
    director: "Sin director",
    tesorero: "Sin Asignar",
    budgetAllocated: 375000,
    budgetUsed: 0,
    percentageUsed: 0,
    assignedPercentage: 3,
    initialBudget: 375000
  },
  {
    id: "dep-19",
    name: "Ministerio de la Mujer",
    code: "19",
    category: "Ministerio de la Mujer",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 375000,
    budgetUsed: 45000,
    percentageUsed: 12,
    assignedPercentage: 3,
    initialBudget: 375000
  },
  {
    id: "dep-45",
    name: "Ministerio de la Mujer - Retiro Espiritual",
    code: "45",
    category: "Ministerio de la Mujer",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 120000,
    budgetUsed: 15000,
    percentageUsed: 13,
    assignedPercentage: 0,
    initialBudget: 120000
  },
  {
    id: "dep-32",
    name: "Ministerio de la Salud",
    code: "32",
    category: "Ministerio de la Salud",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 18000,
    percentageUsed: 14,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-18",
    name: "Ministerio de Mayordomía Cristiana",
    code: "18",
    category: "Ministerio de Mayordomía Cristiana",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 0,
    percentageUsed: 0,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-17",
    name: "Ministerio de Publicaciones",
    code: "17",
    category: "Ministerio de Publicaciones",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 100000,
    budgetUsed: 10000,
    percentageUsed: 10,
    assignedPercentage: 0,
    initialBudget: 100000
  },
  {
    id: "dep-27",
    name: "Ministerio del Adolescente",
    code: "27",
    category: "Ministerio del Adolescente",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 375000,
    budgetUsed: 62000,
    percentageUsed: 17,
    assignedPercentage: 3,
    initialBudget: 375000
  },
  {
    id: "dep-52",
    name: "Ministerio del Adolescente - Celebrateen",
    code: "52",
    category: "Ministerio del Adolescente",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 120000,
    budgetUsed: 22000,
    percentageUsed: 18,
    assignedPercentage: 0,
    initialBudget: 120000
  },
  {
    id: "dep-5",
    name: "Ministerio Infantil",
    code: "5",
    category: "Ministerio Infantil",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 500000,
    budgetUsed: 145000,
    percentageUsed: 29,
    assignedPercentage: 4,
    initialBudget: 500000
  },
  {
    id: "dep-16",
    name: "Ministerio Joven",
    code: "16",
    category: "Ministerio Joven",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 500000,
    budgetUsed: 112000,
    percentageUsed: 22,
    assignedPercentage: 4,
    initialBudget: 500000
  },
  {
    id: "dep-44",
    name: "Ministerio Joven - Congreso",
    code: "44",
    category: "Ministerio Joven",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 150000,
    budgetUsed: 35000,
    percentageUsed: 23,
    assignedPercentage: 0,
    initialBudget: 150000
  },
  {
    id: "dep-28",
    name: "Ministerio Joven - Retiro Espiritual",
    code: "28",
    category: "Ministerio Joven",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 200000,
    budgetUsed: 80000,
    percentageUsed: 40,
    assignedPercentage: 0,
    initialBudget: 200000
  },
  {
    id: "dep-36",
    name: "Ministerio Posibilidades",
    code: "36",
    category: "Ministerio Posibilidades",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 100000,
    budgetUsed: 15000,
    percentageUsed: 15,
    assignedPercentage: 0,
    initialBudget: 100000
  },
  {
    id: "dep-47",
    name: "Ofrendas Especiales",
    code: "47",
    category: "Tesorería",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 500000,
    budgetUsed: 120000,
    percentageUsed: 24,
    assignedPercentage: 0,
    initialBudget: 500000
  },
  {
    id: "dep-49",
    name: "Proyectos Especiales",
    code: "49",
    category: "Tesorería",
    director: "Tesorero Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 300000,
    budgetUsed: 45000,
    percentageUsed: 15,
    assignedPercentage: 0,
    initialBudget: 300000
  },
  {
    id: "dep-2",
    name: "Secretaría",
    code: "2",
    category: "Secretaría",
    director: "Secretaria Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 125000,
    budgetUsed: 14000,
    percentageUsed: 11,
    assignedPercentage: 1,
    initialBudget: 125000
  },
  {
    id: "dep-54",
    name: "Ministerio de Recepción",
    code: "54",
    category: "Ministerio de Recepción",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 80000,
    budgetUsed: 10000,
    percentageUsed: 13,
    assignedPercentage: 0,
    initialBudget: 80000
  },
  {
    id: "dep-55",
    name: "Ministerio de Oración",
    code: "55",
    category: "Ministerio de Oración",
    director: "Director Demo",
    tesorero: "Sin Asignar",
    budgetAllocated: 80000,
    budgetUsed: 5000,
    percentageUsed: 6,
    assignedPercentage: 0,
    initialBudget: 80000
  }
].map(d => ({ ...d, budgetUsed: 0, percentageUsed: 0 }));

export const TRANSFERS_SEED: Transfer[] = [];

export const FUND_REQUESTS_SEED: FundRequest[] = [];

export const EXPENSE_RENDITIONS_SEED: ExpenseRendition[] = [];

export const MEETINGS_SEED: Meeting[] = [];

export const SPACES_SEED: SpaceResource[] = [
  {
    id: "space-1",
    name: "Sala de Juntas Principal",
    capacity: 25,
    available: true,
    notes: "Disponible para coordinaciones generales.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzJeB6VeWa52DBCKmdlrxxG0-HckwjOUjiqvFUawit2K2fFqRRKEDYU7N4qX11LuG37xnD13_yQenLERDbidMz3GAno_Y7E0rN0wUnUhXzkkha00Zndjgx4bE2Ismzw41416EDCpa3vluViOLFyy3B6N2ijLgwX2vjFKAa_UUtJs6o1_7rTyyCKLtNQpULkqRmOVqSQAp57GNfXmb-hZG-Y48xX5RRkP0i_sdhzwLo5qT0_iWM2T0ltIEHTmJTRew5SdvPnFl_rIfh"
  },
  {
    id: "space-2",
    name: "Salón Multiusos",
    capacity: 120,
    available: true,
    notes: "Ocupado hasta las 18:00 horas hoy.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeaBP61ZgNFSZh6e0a2jXrNmVc1Xc5hs5w8BhQMJTj4mcnJQ92aCWbryosf08XHBLN-fufpyiLh54VOG8K48tFSGudn08Njz_2U8P0qlGGaGoASqdAOZZ3uUXIpREvGqdE6_IVMuFe6iIlIizlGBVqca9f5gRg0e3dI6NwJDbFxId2HDONCqvuo3kratxPn_Ba0iPPZLna55AVRn71pRUK2yq_VqiyuBA_2JltKiKeLmAgecxch_4QugBw9nQgpgY4F49UpmX6WdQV"
  },
  {
    id: "space-3",
    name: "Oficina Secretaría",
    capacity: 6,
    available: true,
    notes: "Disponible para entrevistas puntuales.",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtGLBF0tYNbbWRDKqJLjFn1pVEL8gAsUM33AaDnSscOMoqedKTBgsktLF3vOrzj9EK9pLmtVTNjgeBQEDMo6SnxKyrhAPXu0WMX_gE0h2nQebpal7vvQFsuL7-z0pTyhopuQNm51k51w3ueFgEcea9MChU7qfi4BKd4rTMMk6kFHeR39AiT30I9E0bmNPCId1Q8YPLuU9ljgcs323vKIAG2pVLp6fpmWsu3j43tFIVW68tgbyfRZxFpCEnCkbegwDymMZfpg7OhFI5"
  }
];

export const HISTORY_REPORTS_SEED: any[] = [];

export const CARGOS_SEED: Cargo[] = [
  {
    id: "cg-1",
    name: "Tesorero",
    description: "Responsable general de la contabilidad de la iglesia, arqueos y de procesar todas las solicitudes y transferencias.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "ver_todos_departamentos", "autorizar_solicitudes_fondos", "gestionar_transferencias_presupuesto", "ver_informes_financieros", "configuracion_sistema"]
  },
  {
    id: "cg-2",
    name: "Tesorero Departamento",
    description: "Colabora en la tesorería de departamentos específicos, puede registrar solicitudes de fondos y rendiciones.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "solicitar_gasto_adelanto", "ver_informes_financieros"]
  },
  {
    id: "cg-3",
    name: "Pastor Distrital",
    description: "Supervisión institucional, aprueba directrices de junta, tiene acceso visual de todos los departamentos y de autorizaciones excepcionales.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "ver_todos_departamentos", "ver_informes_financieros", "ver_actas_junta", "gestionar_calendario_sesiones"]
  },
  {
    id: "cg-4",
    name: "Anciano",
    description: "Consejero administrativo de junta local, audita actas y asesora la distribución presupuestaria.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "ver_todos_departamentos", "ver_actas_junta"]
  },
  {
    id: "cg-5",
    name: "Director",
    description: "Responsable directo de un ministerio local, inicia solicitudes de adelanto y rinde comprobantes de gastos.",
    permissions: ["ver_resumen_inicio", "solicitar_gasto_adelanto"]
  },
  {
    id: "cg-6",
    name: "Secretaria",
    description: "Resguarda la gobernanza legal, toma y publica actas de resoluciones, gestiona el calendario de sesiones de junta.",
    permissions: ["ver_resumen_inicio", "ver_todos_departamentos", "ver_actas_junta", "cargar_actas_junta", "gestionar_calendario_sesiones"]
  },
  {
    id: "cg-7",
    name: "Primer Anciano",
    description: "Anciano principal de la congregación local, asume la coordinación y dirección general en consulta con el pastor.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "ver_todos_departamentos", "ver_actas_junta", "gestionar_calendario_sesiones"]
  },
  {
    id: "cg-8",
    name: "Tesorero asistente",
    description: "Asiste al tesorero central en el registro, control contable y revisión de solicitudes y rendiciones de todos los departamentos.",
    permissions: ["ver_resumen_inicio", "ver_planilla_departamentos", "ver_todos_departamentos", "solicitar_gasto_adelanto", "ver_informes_financieros"]
  }
];

export const BANK_ACCOUNTS_SEED: BankAccount[] = [
  { id: "ba-1", name: "Banco Itaú", balance: 1500000 },
  { id: "ba-2", name: "Banco Falabella", balance: 3000684 }
];

export const BANK_TRANSACTIONS_SEED: BankTransaction[] = [];

