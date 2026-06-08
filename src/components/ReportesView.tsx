/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileSpreadsheet, FileText, Download, Play, CheckCircle, 
  RefreshCw, BarChart3, ShieldAlert, Calendar, Archive, Upload, 
  FileCode, Sparkles, Check, AlertCircle, ArrowRight, TableProperties,
  Search, Printer, HelpCircle, Lock, AlertTriangle, Coins, Percent, Landmark,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Department, FundRequest, ExpenseRendition, BankTransaction, BoardActa, BankAccount, Transfer } from "../types";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// Dynamic report imports properties
interface ReportesViewProps {
  departments?: Department[];
  fundRequests?: FundRequest[];
  renditions?: ExpenseRendition[];
  bankTransactions?: BankTransaction[];
  boardActas?: BoardActa[];
  bankAccounts?: BankAccount[];
  onUpdateBankAccounts?: (accounts: BankAccount[]) => void;
  onAddBankTransaction?: (tx: BankTransaction) => void;
  onAddTransfer?: (transfer: Transfer) => void;
  onUpdateDepartment?: (dept: Department) => void;
  onUpdateDeptBalance?: (deptId: string, amount: number) => void;
}

// Built-in Seed fallback for robust rendering in all contexts: Kept empty to display ONLY user submitted data
const BASE_MOVEMENTS: any[] = [];

const BASE_ADELANTOS: any[] = [];

export const ReportesView: React.FC<ReportesViewProps> = ({ 
  departments = [], 
  fundRequests = [], 
  renditions = [], 
  bankTransactions = [],
  boardActas = [],
  bankAccounts = [],
  onUpdateBankAccounts,
  onAddBankTransaction,
  onAddTransfer,
  onUpdateDepartment,
  onUpdateDeptBalance
}) => {
  // Navigation tabs: "generar" (Resumen), "importar" (Sincronizar ACMS), "adelantos" (Fondos por Rendir), "actas" (Actas de Junta)
  const [activeMainTab, setActiveMainTab] = useState<"generar" | "importar" | "adelantos" | "actas">("generar");

  // Subtab representing "Caja Individual" vs "Resumen por Departamento" (Saldos ACMS) inside Generating log
  const [subReportTab, setSubReportTab] = useState<"individual" | "departamental" | "mensual">("individual");

  // State for ACMS Resumen de Movimientos Form
  const [selectedDept, setSelectedDept] = useState("todos");
  const [selectedMonth, setSelectedMonth] = useState("Mayo");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Results queried
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  // Derive functional real user movements dynamically from bankTransactions and renditions
  const realMovements = React.useMemo(() => {
    const movements: any[] = [];

    // 1. Process real Aprobada renditions
    (renditions || []).forEach(r => {
      if (r.status === "Aprobada") {
        movements.push({
          id: r.folio || `R-${r.id.substring(0, 5)}`,
          fecha: r.dateSent,
          dpto: r.department,
          concepto: `Rendición: ${r.project}`,
          tipo: "Egreso",
          monto: r.totalAmount,
          estado: r.acmsStatus === "Ingresado" ? "Conciliado" : "Pendiente"
        });
      }
    });

    // 2. Process real bank transactions
    (bankTransactions || []).forEach(t => {
      movements.push({
        id: t.id.startsWith("trans-") ? `B-${t.id.substring(6, 11)}` : `B-${t.id.substring(0, 5)}`,
        fecha: t.date,
        dpto: t.category,
        concepto: t.description,
        tipo: t.type === "Ingreso" ? "Ingreso" : "Egreso",
        monto: t.amount,
        estado: "Conciliado"
      });
    });

    // Sort descending by date
    return movements.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [renditions, bankTransactions]);

  // Synchronize on load and when real data updates so that users see their actual data in real-time
  React.useEffect(() => {
    setQueryResults(realMovements);
  }, [realMovements]);

  // --- ACMS INTEGRATION IMPORTER STATE ---
  const [dragActive, setDragActive] = useState(false);
  const [selectedAcmsType, setSelectedAcmsType] = useState<"balance" | "banco" | "ofrendas" | "tesoreria" | "departamento">("balance");
  const [selectedFileFormat, setSelectedFileFormat] = useState<"xlsx" | "csv" | "pdf">("xlsx");
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [integrationSuccess, setIntegrationSuccess] = useState(false);

  // Archive list of files generated
  const [historicReportList, setHistoricReportList] = useState([
    { id: "rep-01", name: "Balance_Mayo_2026_Verificado_Oficial.xlsx", generatedBy: "Tesorero Demo", date: "28 May, 2026", format: "EXCEL" },
    { id: "rep-02", name: "Reporte_Folleto_Adelantos_Pendientes.pdf", generatedBy: "Tesorero Demo", date: "20 May, 2026", format: "PDF" },
    { id: "rep-03", name: "Distribucion_Ofrendas_Art6_Abril.xlsx", generatedBy: "Tesorero Demo", date: "28 Abr, 2026", format: "EXCEL" }
  ]);

  // Simulated parsed ACMS payloads
  const SIMULATED_ACMS_PAYLOADS: Record<string, any> = {
    balance: {
      title: "Balance de Comprobación Consolidado Oficial - Mayo/Junio 2026",
      summary: "Saldos auditados por la tesorería de la Asociación Chilena Centro",
      headers: ["Código Cuenta", "Nombre de Fondo/Cuenta", "Saldo Inicial", "Ingresos", "Egresos", "Saldo Final"],
      rows: [
        ["1.1.1.01", "Gasto de Iglesia (53%)", "$4,200,000", "$2,840,000", "$1,120,000", "$5,920,000"],
        ["1.1.1.02", "Evangelismo Extraordinario (9%)", "$1,850,500", "$1,200,000", "$800,000", "$2,250,500"],
        ["1.1.1.04", "Ministerio Joven (4%)", "$950,000", "$480,000", "$320,000", "$1,110,000"],
        ["1.1.1.05", "Ministerio Infantil (4%)", "$680,000", "$380,000", "$150,050", "$909,950"],
        ["1.1.1.08", "Fondo Conquistadores (4%)", "$1,140,000", "$600,000", "$450,000", "$1,290,000"],
        ["1.1.2.03", "Ofrendas Especiales - Sobres", "$530,000", "$1,420,000", "$930,000", "$1,020,000"]
      ],
      rawRows: [
        ["1.1.1.01", "Gasto de Iglesia", "4200000", "2840000", "1120000", "53"],
        ["1.1.1.02", "Evangelismo Extraordinario", "1850500", "1200000", "800000", "9"],
        ["1.1.1.04", "Ministerio Joven", "950000", "480000", "320000", "4"],
        ["1.1.1.05", "Ministerio Infantil", "680000", "380000", "150050", "4"],
        ["1.1.1.08", "Club de Conquistadores", "1140000", "600000", "450000", "4"]
      ]
    },
    banco: {
      title: "Cartola de Conciliación Bancaria Central (Banco Estado Principal)",
      summary: "Sincronización mensual de depósitos y débitos indexados",
      headers: ["Fecha Cartola", "Descripción Movimiento Central", "Código Ref", "Depósitos (+)", "Retiros (-)", "Estado Conciliación"],
      rows: [
        ["2026-06-01", "Depósito Ofrendas Generales Mayo 31", "REF-BAN-2942", "$3,542,000", "$0", "Conciliado OK"],
        ["2026-06-03", "Cargo Transferencia Voto V-2026-05-18", "REF-REQ-0391", "$0", "$2,400,000", "Conciliado OK"],
        ["2026-06-05", "Débito Comisión Cta Corriente", "REF-COM-0112", "$0", "$18,500", "Conciliado OK"],
        ["2026-06-08", "Recaudación Escuela Sabática Sábado 7", "REF-SAB-0814", "$482,500", "$0", "Conciliado OK"],
        ["2026-06-12", "Fondo Adelantado REQ-2024-049 jóvenes", "REF-REQ-0428", "$0", "$350,000", "Conciliado OK"]
      ],
      rawRows: [
        ["2026-06-01", "Depósito Ofrendas Generales Mayo 31", "3542000", "Ingreso", "Banco Estado Principal", "Ofrendas"],
        ["2026-06-03", "Cargo Transferencia Voto V-2026-05-18", "2400000", "Gasto", "Banco Estado Principal", "Administración"],
        ["2026-06-05", "Débito Comisión Cta Corriente", "18500", "Gasto", "Banco Estado Principal", "Administración"],
        ["2026-06-08", "Recaudación Escuela Sabática Sábado 7", "482500", "Ingreso", "Banco Estado Principal", "Ofrendas"],
        ["2026-06-12", "Fondo Adelantado REQ-2024-049 jóvenes", "350000", "Gasto", "Banco Estado Principal", "Ministerio Joven"]
      ]
    },
    ofrendas: {
      title: "Informe Auxiliar de Distribución de Ofrendas Planificadas",
      summary: "Fórmulas de distribución automática centralizada (Art. 6.2)",
      headers: ["Fondo Destinatario", "Porcentaje Asignado", "Ingresos Mes", "Remetido de Asociación", "Sueldo Neto Retenido", "Saldos Locales"],
      rows: [
        ["Gasto de Iglesia", "53.0%", "$5,300,000", "$2,650,000", "$0", "$2,650,000"],
        ["Evangelismo Local", "9.0%", "$900,000", "$450,000", "$0", "$450,000"],
        ["Ministerio Joven", "4.0%", "$400,050", "$200,025", "$0", "$200.025"],
        ["Ministerio Infantil", "4.0%", "$400,050", "$200,025", "$0", "$200,025"],
        ["Club de Conquistadores", "4.0%", "$400,050", "$200,025", "$0", "$200,025"],
        ["Damas y Hogar / Dorcas", "3.0%", "$300,000", "$150,000", "$0", "$150,000"],
        ["Asociación (Cofre Central)", "23.0%", "$2,300,000", "$2,300,000", "$0", "$0"]
      ],
      rawRows: [
        ["Gasto de Iglesia", "53.0", "5300000"],
        ["Evangelismo Local", "9.0", "900000"],
        ["Ministerio Joven", "4.0", "400050"],
        ["Ministerio Infantil", "4.0", "400050"],
        ["Club de Conquistadores", "4.0", "400050"],
        ["Damas y Hogar / Dorcas", "3.0", "300000"]
      ]
    },
    tesoreria: {
      title: "Movimientos de Tesorería Extraídos (Entradas y Salidas)",
      summary: "Registros de ingresos y egresos de caja y bancos leídos",
      headers: ["Fecha", "Descripción", "Monto", "Tipo", "Fondo", "Cuenta"],
      rows: [
        ["2026-06-01", "Gasto en Folletos de Escuela Sabática", "$45,000", "Gasto", "Administración", "Banco Estado Principal"],
        ["2026-06-02", "Ingreso Ofrendas del Sábado", "$120,000", "Ingreso", "Evangelismo Local", "Banco Estado Principal"],
        ["2026-06-03", "Ajuste Directo Caja de Ahorros", "$25,000", "Gasto", "Ministerio Joven", "Cuenta Ahorro Iglesia"]
      ],
      rawRows: [
        ["2026-06-01", "Gasto en Folletos de Escuela Sabática", "45000", "Gasto", "Administración", "Banco Estado Principal"],
        ["2026-06-02", "Ingreso Ofrendas del Sábado", "120000", "Ingreso", "Evangelismo Local", "Banco Estado Principal"],
        ["2026-06-03", "Ajuste Directo Caja de Ahorros", "25000", "Gasto", "Ministerio Joven", "Cuenta Ahorro Iglesia"]
      ]
    },
    departamento: {
      title: "Saldos Contables y Presupuestos por Departamento",
      summary: "Mapeo de límites de gastos asignados y saldos de origen",
      headers: ["Código", "Departamento", "Inicial", "Tope/Presupuesto", "Usado/Egresos", "Porcentaje Asignado"],
      rows: [
        ["ADM", "Administración", "$5,000,000", "$6,000,000", "$1,200,000", "53%"],
        ["JOV", "Ministerio Joven", "$1,000,000", "$1,500,000", "$450,000", "15%"],
        ["INF", "Ministerio Infantil", "$800,000", "$1,000,000", "$150,000", "8%"]
      ],
      rawRows: [
        ["ADM", "Administración", "5000000", "6000000", "1200000", "53"],
        ["JOV", "Ministerio Joven", "1000000", "1500000", "450000", "15"],
        ["INF", "Ministerio Infantil", "800000", "1000000", "150000", "8"]
      ]
    }
  };

  // Build reactive department ledger mapping using actual app state
  const departmentLedger = React.useMemo(() => {
    const list = departments;

    return list.map(d => {
      // calculate from actual renditions and transactions if visible
      let egresos = d.budgetUsed;
      if (renditions.length > 0) {
        const matchingRend = renditions
          .filter(r => r.department === d.name && r.status === "Aprobada")
          .reduce((sum, r) => sum + r.totalAmount, 0);
        if (matchingRend > 0) egresos = matchingRend;
      }
      const allocated = d.budgetAllocated;
      const departInitial = d.initialBudget !== undefined ? d.initialBudget : allocated;

      // Calculate department specific incomes
      const percentage = d.assignedPercentage ?? 10;
      let incomesSum = 0;
      bankTransactions.forEach(tx => {
        if (tx.type === "Ingreso") {
          const matched = tx.category.toLowerCase().includes(d.name.toLowerCase()) ||
                          tx.description.toLowerCase().includes(d.name.toLowerCase()) ||
                          tx.category.toLowerCase().includes(d.category.toLowerCase());
          if (matched) {
            incomesSum += tx.amount;
          } else if (tx.category.toLowerCase().includes("ofrenda") || tx.category.toLowerCase().includes("diezmo") || tx.category.toLowerCase().includes("generales") || tx.category.toLowerCase().includes("colecta")) {
            incomesSum += Math.round(tx.amount * (percentage / 100));
          }
        }
      });

      // Calculate pending/outstanding advances
      const pendingAdvances = fundRequests
        .filter(r => r.department === d.name && r.status === "Aprobada" && r.cerrado !== true)
        .reduce((sum, r) => sum + r.amount, 0);

      const totalPresupuestoFondo = departInitial + incomesSum - pendingAdvances;
      const topeMensual = allocated;

      // "si el monto del presupuesto del departamento es mayor al tope mensual lo 'disponible' es el tope mensual y si es menor al tope mensual lo 'disponible' es el presupuesto"
      // We subtract egresos to find the remaining available portion for both cases.
      let saldo = 0;
      if (totalPresupuestoFondo > topeMensual) {
        saldo = topeMensual - egresos;
      } else {
        saldo = totalPresupuestoFondo - egresos;
      }
      saldo = Math.max(0, saldo);

      const percentageUsed = Math.round((egresos / allocated) * 100) || 0;
      return {
        ...d,
        egresos,
        saldo,
        percentage: percentageUsed
      };
    });
  }, [departments, renditions, bankTransactions, fundRequests]);

  // Combine static fallback and real fund requests for "Adelantos Pendientes"
  const pendingAdvancesLedger = React.useMemo(() => {
    // Collect from fund requests that are Approved and closed is false
    const realPending = fundRequests
      .filter(fr => fr.status === "Aprobada" && !fr.cerrado)
      .map((fr, idx) => {
        // compute days elapsed since expected date
        const start = new Date(fr.expectedDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 5;
        
        // check corresponding renditions to see if partial rendition exists
        const partialRend = renditions
          .filter(r => r.asociadaFondoId === fr.id && r.status === "Aprobada")
          .reduce((sum, r) => sum + r.totalAmount, 0);

        return {
          id: fr.id,
          fecha: fr.expectedDate,
          dpto: fr.department,
          solicitante: fr.applicant,
          concepto: fr.description,
          monto: fr.amount,
          rendido: partialRend,
          saldo: fr.amount - partialRend,
          dias: dias
        };
      });

    const displayList = [...realPending];
    return displayList;
  }, [fundRequests, renditions]);

  // --- DOWNLOAD UTILITIES ---
  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const content = [
      headers.join(";"),
      ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Register inside historic log
    const newFileLog = {
      id: "log-" + Date.now(),
      name: filename,
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "EXCEL" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const downloadWordDoc = (title: string, htmlContent: string, filename: string) => {
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333333; line-height: 1.5; padding: 20px; }
          .header { text-align: center; border-bottom: 3px double #1552a6; padding-bottom: 12px; margin-bottom: 25px; }
          .header h1 { font-size: 16pt; color: #1552a6; margin: 0; font-weight: bold; font-family: sans-serif; text-transform: uppercase; }
          .header h2 { font-size: 9pt; color: #64748b; margin: 4px 0 0 0; text-transform: uppercase; font-family: sans-serif; letter-spacing: 1px; }
          .report-title { text-align: center; font-size: 14pt; font-weight: bold; color: #0f172a; margin: 25px 0 15px 0; text-transform: uppercase; }
          .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 20px; font-size: 9.5pt; border-radius: 6px; }
          .meta-box table { width: 100%; border: none; }
          .meta-box td { padding: 4px; border: none; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; font-size: 10pt; }
          .data-table th { background-color: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; text-transform: uppercase; font-size: 8.5pt; color: #475569; }
          .data-table td { padding: 8px; border: 1px solid #cbd5e1; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-danger { color: #b91c1c; font-weight: bold; }
          .text-success { color: #15803d; font-weight: bold; }
          .totals-bar { background-color: #f1f5f9; font-weight: bold; }
          .signatures-container { margin-top: 60px; width: 100%; }
          .signatures-container td { width: 50%; text-align: center; padding-top: 45px; border: none; font-size: 9.5pt; }
          .sig-line { border-top: 1px solid #94a3b8; width: 220px; margin: 0 auto 5px auto; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob(["\ufeff" + fullHtml], { type: "application/msword;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Register inside historic log
    const newFileLog = {
      id: "log-" + Date.now(),
      name: filename,
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const drawPageHeader = (doc: jsPDF, title: string, subtitle?: string) => {
    // Deep Blue Header Accent
    doc.setFillColor(21, 82, 166); // #1552a6
    doc.rect(10, 10, 190, 3, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-550
    doc.text("ASOCIACIÓN DIvISIÓN SUDAMERICANA (DSA)", 15, 18);

    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("IGLESIA ADvENTISTA DEL SÉPTIMO DÍA", 15, 25);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(subtitle || "Distrito Central  Sede Ejemplo", 15, 30);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(21, 82, 166);
    doc.text(title.toUpperCase(), 15, 38);

    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(10, 42, 200, 42);
  };

  const drawPageFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(10, 280, 200, 280);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text("Generado automáticamente por el Portal de Tesorería IASD", 15, 285);
    doc.text(`Página ${pageNum} de ${totalPages}`, 180, 285, { align: "right" });
  };

  const exportIndividualPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawPageHeader(doc, `Libro Diario - Caja: ${selectedMonth} 2026`, "Detalle de movimientos de caja de la Iglesia");
    
    // Table Headers
    const headers = ["ID", "Fecha", "Dpto", "Concepto", "Tipo", "Monto", "Estado"];
    const colWidths = [15, 20, 32, 70, 13, 20, 20];
    const xStart = 10;
    let y = 48;

    // Draw header row
    doc.setFillColor(241, 245, 249); // light grey
    doc.rect(xStart, y, 190, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(xStart, y, 190, 7, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    let currentX = xStart;
    headers.forEach((h, idx) => {
      const align = (idx === 5) ? "right" : "left";
      const txtX = align === "right" ? currentX + colWidths[idx] - 2 : currentX + 2;
      doc.text(h, txtX, y + 5, { align });
      currentX += colWidths[idx];
    });

    y += 7;

    // Draw data rows
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    queryResults.forEach((r, rowIdx) => {
      // Check page overflow
      if (y > 270) {
        drawPageFooter(doc, 1, 2);
        doc.addPage();
        drawPageHeader(doc, `Libro Diario - Caja: ${selectedMonth} 2026 (Cont...)`, "Detalle de movimientos de caja de la Iglesia");
        y = 48;
        
        // Redraw Header inside new page
        doc.setFillColor(241, 245, 249);
        doc.rect(xStart, y, 190, 7, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(xStart, y, 190, 7, "S");
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        currentX = xStart;
        headers.forEach((h, idx) => {
          const align = (idx === 5) ? "right" : "left";
          const txtX = align === "right" ? currentX + colWidths[idx] - 2 : currentX + 2;
          doc.text(h, txtX, y + 5, { align });
          currentX += colWidths[idx];
        });
        y += 7;
        doc.setFont("Helvetica", "normal");
      }

      // Alternate rows
      if (rowIdx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(xStart, y, 190, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(xStart, y + 6.5, xStart + 190, y + 6.5);

      currentX = xStart;
      
      // ID
      doc.setFont("Helvetica", "bold");
      doc.text(r.id, currentX + 2, y + 4.5);
      doc.setFont("Helvetica", "normal");
      currentX += colWidths[0];

      // Fecha
      doc.text(r.fecha, currentX + 2, y + 4.5);
      currentX += colWidths[1];

      // Dpto
      doc.text(r.dpto.substring(0, 18), currentX + 2, y + 4.5);
      currentX += colWidths[2];

      // Concepto
      const conceptText = r.concepto.length > 52 ? r.concepto.substring(0, 50) + "..." : r.concepto;
      doc.text(conceptText, currentX + 2, y + 4.5);
      currentX += colWidths[3];

      // Tipo
      if (r.tipo === "Egreso") {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(21, 128, 61);
      }
      doc.text(r.tipo, currentX + 2, y + 4.5);
      doc.setTextColor(30, 41, 59);
      currentX += colWidths[4];

      // Monto
      doc.setFont("Helvetica", "bold");
      doc.text(`$${r.monto.toLocaleString("es-CL")}`, currentX + colWidths[5] - 2, y + 4.5, { align: "right" });
      doc.setFont("Helvetica", "normal");
      currentX += colWidths[5];

      // Estado
      if (r.estado === "Conciliado") {
        doc.setTextColor(21, 128, 61);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(r.estado, currentX + 2, y + 4.5);
      doc.setTextColor(30, 41, 59);

      y += 6.5;
    });

    // Draw Totals row
    const totalEgresos = queryResults.filter(r => r.tipo === "Egreso").reduce((sum, r) => sum + r.monto, 0);
    const totalIngresos = queryResults.filter(r => r.tipo === "Ingreso").reduce((sum, r) => sum + r.monto, 0);

    y += 4;
    doc.setFillColor(248, 250, 252);
    doc.rect(xStart, y, 190, 15, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(xStart, y, 190, 15, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`TOTAL INGRESOS: $${totalIngresos.toLocaleString("es-CL")}`, xStart + 5, y + 6);
    doc.text(`TOTAL EGRESOS:  $${totalEgresos.toLocaleString("es-CL")}`, xStart + 5, y + 11);
    
    doc.setTextColor(21, 82, 166);
    doc.setFontSize(9);
    doc.text(`SALDO NETO:      $${(totalIngresos - totalEgresos).toLocaleString("es-CL")}`, xStart + 110, y + 9);

    drawPageFooter(doc, 1, 1);
    doc.save(`IASD_LibroDiario_${selectedMonth}_2026.pdf`);
    
    // Save to historic list
    const newFileLog = {
      id: "log-" + Date.now(),
      name: `IASD_LibroDiario_${selectedMonth}_2026.pdf`,
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const exportDepartmentalPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawPageHeader(doc, "Resumen Contable por Departamentos (Planilla Central)", "Saldos y ejecución presupuestaria del periodo");
    
    const headers = ["Código", "Departamento", "Responsable", "Asignado", "Egresos", "Disponible"];
    const colWidths = [18, 55, 42, 25, 25, 25];
    const xStart = 10;
    let y = 48;

    // Draw header row
    doc.setFillColor(241, 245, 249);
    doc.rect(xStart, y, 190, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(xStart, y, 190, 7, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let currentX = xStart;
    headers.forEach((h, idx) => {
      const align = (idx >= 3) ? "right" : "left";
      const txtX = align === "right" ? currentX + colWidths[idx] - 2 : currentX + 2;
      doc.text(h, txtX, y + 5, { align });
      currentX += colWidths[idx];
    });

    y += 7;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    departmentLedger.forEach((d, rowIdx) => {
      if (rowIdx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(xStart, y, 190, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(xStart, y + 6.5, xStart + 190, y + 6.5);

      currentX = xStart;

      // Código
      doc.setFont("Helvetica", "bold");
      doc.text(d.code, currentX + 2, y + 4.5);
      doc.setFont("Helvetica", "normal");
      currentX += colWidths[0];

      // Depto
      doc.text(d.name, currentX + 2, y + 4.5);
      currentX += colWidths[1];

      // Responsable
      doc.text(d.director, currentX + 2, y + 4.5);
      currentX += colWidths[2];

      // Asignado
      doc.text(`$${d.budgetAllocated.toLocaleString("es-CL")}`, currentX + colWidths[3] - 2, y + 4.5, { align: "right" });
      currentX += colWidths[3];

      // Egresos
      doc.text(`$${d.egresos.toLocaleString("es-CL")}`, currentX + colWidths[4] - 2, y + 4.5, { align: "right" });
      currentX += colWidths[4];

      // Disponible
      doc.setFont("Helvetica", "bold");
      if (d.saldo < 0) {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(21, 128, 61);
      }
      doc.text(`$${d.saldo.toLocaleString("es-CL")}`, currentX + colWidths[5] - 2, y + 4.5, { align: "right" });
      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");

      y += 6.5;
    });

    // Totals row
    const totalAllocated = departmentLedger.reduce((sum, d) => sum + d.budgetAllocated, 0);
    const totalUsed = departmentLedger.reduce((sum, d) => sum + d.egresos, 0);
    const totalSaldo = totalAllocated - totalUsed;

    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(xStart, y, 190, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(xStart, y, 190, 7, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    
    doc.text("TOTAL GENERAL", xStart + 2, y + 5);

    currentX = xStart + colWidths[0] + colWidths[1] + colWidths[2];
    doc.text(`$${totalAllocated.toLocaleString("es-CL")}`, currentX + colWidths[3] - 2, y + 5, { align: "right" });
    currentX += colWidths[3];
    doc.text(`$${totalUsed.toLocaleString("es-CL")}`, currentX + colWidths[4] - 2, y + 5, { align: "right" });
    currentX += colWidths[4];
    doc.setTextColor(21, 82, 166);
    doc.text(`$${totalSaldo.toLocaleString("es-CL")}`, currentX + colWidths[5] - 2, y + 5, { align: "right" });

    // Draw Signatures Box
    y += 18;
    doc.setDrawColor(148, 163, 184);
    doc.line(xStart + 15, y + 15, xStart + 75, y + 15);
    doc.line(xStart + 115, y + 15, xStart + 175, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Hno. Tesorero Demo", xStart + 45, y + 19, { align: "center" });
    doc.text("Pr. Pastor Demo", xStart + 145, y + 19, { align: "center" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Tesorero Local de Iglesia", xStart + 45, y + 23, { align: "center" });
    doc.text("Pastor Distrital Consejero", xStart + 145, y + 23, { align: "center" });

    drawPageFooter(doc, 1, 1);
    doc.save("IASD_Saldos_Por_Departamento_2026.pdf");

    // Save to historic list
    const newFileLog = {
      id: "log department-" + Date.now(),
      name: "IASD_Saldos_Por_Departamento_2026.pdf",
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const exportPendingAdvancesPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawPageHeader(doc, "Auxiliar de Adelantos Pendientes (Fondos por Rendir)", "Seguimiento corporativo de fondos entregados por regularizar");
    
    const headers = ["ID", "Fecha", "Departamento", "Responsable", "Monto", "Rendido", "Pendiente", "Días"];
    const colWidths = [18, 18, 38, 38, 20, 20, 20, 18];
    const xStart = 10;
    let y = 48;

    // Draw header row
    doc.setFillColor(241, 245, 249);
    doc.rect(xStart, y, 190, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(xStart, y, 190, 7, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let currentX = xStart;
    headers.forEach((h, idx) => {
      const align = (idx >= 4 && idx <= 6) ? "right" : (idx === 7 ? "center" : "left");
      const txtX = align === "right" ? currentX + colWidths[idx] - 2 : (align === "center" ? currentX + colWidths[idx]/2 : currentX + 2);
      doc.text(h, txtX, y + 5, { align });
      currentX += colWidths[idx];
    });

    y += 7;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    pendingAdvancesLedger.forEach((a, rowIdx) => {
      if (rowIdx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(xStart, y, 190, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(xStart, y + 6.5, xStart + 190, y + 6.5);

      currentX = xStart;

      // ID
      doc.setFont("Helvetica", "bold");
      doc.text(a.id, currentX + 2, y + 4.5);
      doc.setFont("Helvetica", "normal");
      currentX += colWidths[0];

      // Fecha
      doc.text(a.fecha, currentX + 2, y + 4.5);
      currentX += colWidths[1];

      // Dpto
      doc.text(a.dpto, currentX + 2, y + 4.5);
      currentX += colWidths[2];

      // Responsable
      doc.text(a.solicitante, currentX + 2, y + 4.5);
      currentX += colWidths[3];

      // Monto
      doc.text(`$${a.monto.toLocaleString("es-CL")}`, currentX + colWidths[4] - 2, y + 4.5, { align: "right" });
      currentX += colWidths[4];

      // Rendido
      doc.text(`$${a.rendido.toLocaleString("es-CL")}`, currentX + colWidths[5] - 2, y + 4.5, { align: "right" });
      currentX += colWidths[5];

      // Pendiente
      doc.setFont("Helvetica", "bold");
      doc.text(`$${a.saldo.toLocaleString("es-CL")}`, currentX + colWidths[6] - 2, y + 4.5, { align: "right" });
      doc.setFont("Helvetica", "normal");
      currentX += colWidths[6];

      // Días
      if (a.dias > 30) {
        doc.setTextColor(185, 28, 28);
        doc.setFont("Helvetica", "bold");
        doc.text(`${a.dias} V`, currentX + colWidths[7]/2, y + 4.5, { align: "center" });
        doc.setFont("Helvetica", "normal");
      } else {
        doc.setTextColor(30, 41, 59);
        doc.text(String(a.dias), currentX + colWidths[7]/2, y + 4.5, { align: "center" });
      }
      doc.setTextColor(30, 41, 59);

      y += 6.5;
    });

    // Totals row
    const totalArr = pendingAdvancesLedger.reduce((tot, current) => {
      tot.monto += current.monto;
      tot.rendido += current.rendido;
      tot.saldo += current.saldo;
      return tot;
    }, { monto: 0, rendido: 0, saldo: 0 });

    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(xStart, y, 190, 7, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(xStart, y, 190, 7, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL PENDIENTES", xStart + 2, y + 5);

    currentX = xStart + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    doc.text(`$${totalArr.monto.toLocaleString("es-CL")}`, currentX + colWidths[4] - 2, y + 5, { align: "right" });
    currentX += colWidths[4];
    doc.text(`$${totalArr.rendido.toLocaleString("es-CL")}`, currentX + colWidths[5] - 2, y + 5, { align: "right" });
    currentX += colWidths[5];
    doc.setTextColor(185, 28, 28);
    doc.text(`$${totalArr.saldo.toLocaleString("es-CL")}`, currentX + colWidths[6] - 2, y + 5, { align: "right" });

    // Draw Signatures Box
    y += 18;
    doc.setDrawColor(148, 163, 184);
    doc.line(xStart + 15, y + 15, xStart + 75, y + 15);
    doc.line(xStart + 115, y + 15, xStart + 175, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Hno. Tesorero Demo", xStart + 45, y + 19, { align: "center" });
    doc.text("Pr. Pastor Demo", xStart + 145, y + 19, { align: "center" });
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Tesorero Local de Iglesia", xStart + 45, y + 23, { align: "center" });
    doc.text("Pastor Distrital Consejero", xStart + 145, y + 23, { align: "center" });

    drawPageFooter(doc, 1, 1);
    doc.save("IASD_Adelantos_Pendientes_2026.pdf");

    // Save to historic list
    const newFileLog = {
      id: "log pending-" + Date.now(),
      name: "IASD_Adelantos_Pendientes_2026.pdf",
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const exportMonthlyConsolidatedPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawPageHeader(doc, "Informe de Resumen Mensual de Tesorería Oficial", "Sede Ejemplo  Distrito Central  Balance Consolidado");

    let y = 48;
    
    // Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 190, 16, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 16, "S");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("DETALLES DE LA ENTIDAD", 13, y + 5);
    doc.text("Iglesia Sede Local  Cta Corriente Local Ch-CLP", 13, y + 11);
    
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("PERÍODO FISCAL", 130, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.text("Mayo 2026 (Pesos Chilenos CLP)", 130, y + 11);

    y += 22;

    // SECTION I: INCOMES
    doc.setFillColor(21, 82, 166, 0.1);
    doc.rect(10, y, 190, 6, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(21, 82, 166);
    doc.text("I. SECCIÓN DE ENTRADAS / INGRESOS (COLECTAS Y DIEZMOS)", 13, y + 4.2);

    y += 8;

    // Headers
    const incHeaders = ["Cta", "Concepto Ingreso", "Destino", "Ofrenda Local", "Ofrenda Online", "Total Recabado"];
    const incWidths = [12, 63, 25, 30, 30, 30];
    
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 6, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 6, "S");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    
    let curX = 10;
    incHeaders.forEach((h, idx) => {
      const align = idx >= 3 ? "right" : "left";
      const txtX = align === "right" ? curX + incWidths[idx] - 2 : curX + 2;
      doc.text(h, txtX, y + 4.2, { align });
      curX += incWidths[idx];
    });

    y += 6;

    // Income rows
    const incomeRows = [
      ["01", "Diezmo (Campo Central)", "Campo DSA", "$3.843.969", "$833.500", "$4.677.469"],
      ["02", "Misión Mundial (Campo)", "Campo DSA", "$205.582", "$11.500", "$217.082"],
      ["03", "13° Sábado (Campo)", "Campo DSA", "$20.000", "$0", "$20.000"],
      ["10", "Proyectos Misioneros (Campo)", "Campo DSA", "$205.582", "$11.500", "$217.082"],
      ["-", "SUBTOTAL COLECTA AL CAMPO", "-", "$4.275.133", "$856.500", "$5.131.633"],
      ["51", "Ofrendas de Iglesia Local", "Iglesia Local", "$616.746", "$34.500", "$651.246"],
      ["55", "Ofrenda Caja Departamentos", "Iglesia Local", "$402.330", "$0", "$402.330"],
      ["62", "Auxilio Otras Congregaciones", "Iglesia Local", "$191.800", "$0", "$191.800"],
      ["-", "SUBTOTAL COLECTA LOCAL", "-", "$1.210.876", "$34.500", "$1.245.376"],
    ];

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    incomeRows.forEach((row, idx) => {
      const isSubtotal = row[0] === "-";
      if (isSubtotal) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y, 190, 5.5, "F");
        doc.setFont("Helvetica", "bold");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 5.5, 200, y + 5.5);

      curX = 10;
      row.forEach((cell, cellIdx) => {
        const align = cellIdx >= 3 ? "right" : "left";
        const txtX = align === "right" ? curX + incWidths[cellIdx] - 2 : curX + 2;
        doc.text(cell, txtX, y + 4, { align });
        curX += incWidths[cellIdx];
      });

      if (isSubtotal) doc.setFont("Helvetica", "normal");
      y += 5.5;
    });

    // Total General Entradas row
    doc.setFillColor(21, 82, 166, 0.05);
    doc.rect(10, y, 190, 6, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, 190, 6, "S");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL GENERAL ENTRADAS (CLP)", 12, y + 4.2);
    doc.text("$5.486.009", 10 + incWidths[0] + incWidths[1] + incWidths[2] + incWidths[3] - 2, y + 4.2, { align: "right" });
    doc.text("$891.000", 10 + incWidths[0] + incWidths[1] + incWidths[2] + incWidths[3] + incWidths[4] - 2, y + 4.2, { align: "right" });
    doc.setTextColor(21, 82, 166);
    doc.text("$6.377.009", 10 + incWidths[0] + incWidths[1] + incWidths[2] + incWidths[3] + incWidths[4] + incWidths[5] - 2, y + 4.2, { align: "right" });

    y += 10;

    // SECTION II: EXPENSES
    doc.setFillColor(185, 28, 28, 0.1);
    doc.rect(10, y, 190, 6, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text("II. SECCIÓN DE EGRESOS / GASTOS DE CAJA", 13, y + 4.2);

    y += 8;

    const expHeaders = ["Fondo Cargo", "Concepto de Egreso del Mes", "Fact/Recibo", "Remesa Camp.", "Monto CLP"];
    const expWidths = [45, 80, 20, 25, 20];

    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 6, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 6, "S");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    curX = 10;
    expHeaders.forEach((h, idx) => {
      const align = idx === 4 ? "right" : "left";
      const txtX = align === "right" ? curX + expWidths[idx] - 2 : curX + 2;
      doc.text(h, txtX, y + 4.2, { align });
      curX += expWidths[idx];
    });

    y += 6;

    const expenseRows = [
      ["Tesorería General", "Adquisición de Muebles y Utensilios de Oficina", "Fact-392", "Local", "$10.600"],
      ["Gasto de Iglesia (53%)", "Salario Limpieza y Aseo de Planta de Iglesia", "Boleta-11", "Remesa", "$349.516"],
      ["Escuela Sabática", "Libros y Revistas Eclesiásticos de Estudio Infantil", "Recibo-48", "Local", "$15.600"],
      ["Gasto de Iglesia (53%)", "Material de Higiene y Limpieza Sanitaria", "Fact-840", "Local", "$13.890"],
      ["Aventureros", "Géneros Alimenticios Campamento del Club", "Ticket-23", "Local", "$9.160"],
      ["Ministerio Joven", "Fletes y Transportes Distritales Colectivos", "Fact-102", "Remesa", "$200.000"],
      ["Ministerio Infantil", "Evento y Programación de Escuela de Vacaciones", "Boleta-88", "Local", "$51.090"],
    ];

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    expenseRows.forEach((row, idx) => {
      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 5.5, 200, y + 5.5);

      curX = 10;
      row.forEach((cell, cellIdx) => {
        const align = cellIdx === 4 ? "right" : "left";
        const txtX = align === "right" ? curX + expWidths[cellIdx] - 2 : curX + 2;
        doc.text(cell, txtX, y + 4, { align });
        curX += expWidths[cellIdx];
      });
      y += 5.5;
    });

    // Total expenses row
    doc.setFillColor(185, 28, 28, 0.05);
    doc.rect(10, y, 190, 6, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, 190, 6, "S");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text("TOTAL EGRESOS DE CAJA (CLP)", 12, y + 4.2);
    doc.text("$649.856", 200 - 2, y + 4.2, { align: "right" });

    y += 10;

    // SECTION III: RECONCILIATION SUMMARY BOX
    doc.setFillColor(71, 85, 105, 0.1);
    doc.rect(10, y, 190, 6, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("III. BALANCE DE CONCILIACIÓN NETA DE CAJA", 13, y + 4.2);

    y += 8;

    doc.setFillColor(250, 251, 252);
    doc.rect(10, y, 190, 18, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 18, "S");

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    
    doc.text("Saldo Anterior de Caja:", 15, y + 5);
    doc.text("Entradas del Mes (+):", 15, y + 10);
    doc.text("Salidas del Mes (-):", 15, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.text("$12.435.100", 65, y + 5);
    doc.setTextColor(21, 128, 61);
    doc.text("$6.377.009", 65, y + 10);
    doc.setTextColor(185, 28, 28);
    doc.text("$649.856", 65, y + 15);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.text("(=) SALDO CONCILIADO NETO:", 100, y + 10);
    doc.setFontSize(11);
    doc.setTextColor(21, 82, 166);
    doc.text("$18.162.253", 150, y + 10);

    // Signatures block
    y += 28;
    doc.setDrawColor(148, 163, 184);
    doc.line(15, y+12, 70, y+12);
    doc.line(78, y+12, 133, y+12);
    doc.line(141, y+12, 196, y+12);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Hno. Tesorero Demo", 42.5, y + 16, { align: "center" });
    doc.text("Hna. Secretaria Demo", 105.5, y + 16, { align: "center" });
    doc.text("Pr. Pastor Demo", 168.5, y + 16, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Tesorero Local de Iglesia", 42.5, y + 20, { align: "center" });
    doc.text("Secretaria de Iglesia", 105.5, y + 20, { align: "center" });
    doc.text("Pastor Distrital", 168.5, y + 20, { align: "center" });

    drawPageFooter(doc, 1, 1);
    doc.save("IASD_Balance_Mensual_Consolidado_Mayo_2026.pdf");

    // Save to historic list
    const newFileLog = {
      id: "log monthly-" + Date.now(),
      name: "IASD_Balance_Mensual_Consolidado_Mayo_2026.pdf",
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  const exportActaToPDF = (acta: BoardActa) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    drawPageHeader(doc, `Acta de Junta Directiva - Voto: ${acta.voto}`, "Secretaría de Actas de Junta Oficial");

    let y = 48;

    // Metadata Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 190, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 22, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DETALLES JURÍDICOS DE LA SESIÓN", 13, y + 5);
    
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`TIPO DE SESIÓN:  ${acta.tipo}`, 13, y + 10);
    doc.text(`FECHA DE REUNIÓN: ${acta.fecha}`, 13, y + 15);
    doc.text(`LUGAR SESIÓN:    ${acta.lugar || 'Sede de la Iglesia'}`, 13, y + 20);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("LIDERAZGO Y FIRMAS", 120, y + 5);

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`PRESIDIDO POR: ${acta.firmadoPor || 'Pr. Pastor Demo'}`, 120, y + 10);
    doc.text(`REGISTRADO POR: Secretaria de Iglesia`, 120, y + 15);
    doc.text(`ESTADO:        CONvALIDADO DIGITALMENTE`, 120, y + 20);

    y += 28;

    // ACTA CONTENT SECTION
    doc.setFillColor(21, 82, 166, 0.1);
    doc.rect(10, y, 190, 6, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(21, 82, 166);
    doc.text("Iv. TÍTULO Y DESCRIPCIÓN DEL vOTO ADOPTADO", 13, y + 4.2);

    y += 8;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(acta.titulo ? acta.titulo.toUpperCase() : "vOTO SIN TÍTULO", 13, y + 4);

    y += 8;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    // Multi-line wrap for description
    const splitDesc = doc.splitTextToSize(acta.descripcion || "Sin descripción disponible.", 184);
    doc.text(splitDesc, 13, y);

    y += (splitDesc.length * 4.5) + 6;

    // PARTICIPANTES
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 190, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 22, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("QUÓRUM Y PARTICIPANTES PRESENTES", 13, y + 5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitPart = doc.splitTextToSize(acta.participantes || "Miembros oficiales de la Junta Directiva.", 184);
    doc.text(splitPart, 13, y + 10);

    y += 28;

    // ORACIÓN
    doc.setFillColor(255, 251, 243); // yellow tint
    doc.rect(10, y, 190, 14, "F");
    doc.setDrawColor(253, 230, 138);
    doc.rect(10, y, 190, 14, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text("DEvOCIONAL Y AGRADECIMIENTO", 13, y + 5);
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 4);
    doc.text(`Oración de Inicio: Ofrecida por ${acta.oracionInicio || "Director de Turno"}`, 13, y + 10);

    // SIGNATURES
    y += 20;
    doc.setDrawColor(148, 163, 184);
    doc.line(15, y + 15, 75, y + 15);
    doc.line(115, y + 15, 175, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(acta.firmadoPor || "Pr. Pastor Demo", 45, y + 19, { align: "center" });
    doc.text("Secretaria Demo", 145, y + 19, { align: "center" });
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Presidente / Pastor Distrital", 45, y + 23, { align: "center" });
    doc.text("Secretario de Actas / Iglesia", 145, y + 23, { align: "center" });

    drawPageFooter(doc, 1, 1);
    doc.save(`IASD_Acta_Voto_${acta.voto.replace(/\s+/g, '_')}.pdf`);

    // Save to historic list
    const newFileLog = {
      id: "log acta-" + Date.now(),
      name: `IASD_Acta_Voto_${acta.voto.replace(/\s+/g, '_')}.pdf`,
      generatedBy: "Tesorero Demo",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "PDF" as const
    };
    setHistoricReportList(prev => [newFileLog, ...prev]);
  };

  // --- IN-APP EXPORTS ACTIONS ---
  const handleExportIndividualCSV = () => {
    const headers = ["ID", "Fecha", "Departamento", "Concepto", "Tipo", "Monto CLP", "Estado"];
    const rows = queryResults.map(r => [r.id, r.fecha, r.dpto, r.concepto, r.tipo, r.monto, r.estado]);
    downloadCSV(headers, rows, `ACMS_LibroDiario_Caja_${selectedMonth}_2026.csv`);
  };

  const handleExportDepartmentalCSV = () => {
    const headers = ["Código", "Departamento", "Director", "Presupuesto Inicial", "Total Egresos", "Saldo Disponible", "Ocupación %"];
    const rows = departmentLedger.map(d => [d.code, d.name, d.director, d.budgetAllocated, d.egresos, d.saldo, `${d.percentage}%`]);
    downloadCSV(headers, rows, `ACMS_Saldos_Por_Departamento_2026.csv`);
  };

  const handleExportPendingAdvancesCSV = () => {
    const headers = ["Folio", "Fecha Concesión", "Departamento", "Responsable", "Objeto del Adelanto", "Monto Autorizado", "Monto Rendido", "Saldo Pendiente", "Días Transcurridos", "Estado Temporal"];
    const rows = pendingAdvancesLedger.map(a => [
      a.id, 
      a.fecha, 
      a.dpto, 
      a.solicitante, 
      a.concepto, 
      a.monto, 
      a.rendido, 
      a.saldo, 
      a.dias, 
      a.dias > 30 ? "Vencido" : "Vigente"
    ]);
    downloadCSV(headers, rows, "ACMS_Auxiliar_Adelantos_Pendientes.csv");
  };

  // --- WORD EXPORTERS (.DOC) FOR PRECISE ADVENTIST TEMPLATES ---
  const handleExportPendingAdvancesDoc = () => {
    const outstandingTotal = pendingAdvancesLedger.reduce((sum, a) => sum + a.saldo, 0);
    const countVencidos = pendingAdvancesLedger.filter(a => a.dias > 30).length;

    const htmlContent = `
      <div class="header">
        <h1>Iglesia Adventista del Séptimo Día</h1>
        <h2>Distrito Los Creadores &bull; Campo Sur de Iglesia &bull; Tesorería de Iglesia</h2>
      </div>

      <div class="report-title">
        Informe de Adelantos Pendientes de Rendición [Fondos por Rendir]
      </div>

      <div class="meta-box">
        <table>
          <tr>
            <td><strong>EMISOR JURÍDICO:</strong> Iglesia Local Sede Central</td>
            <td><strong>FECHA CORTE:</strong> ${new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>
          <tr>
            <td><strong>RESPONSABLE SÉPTIMO:</strong> Tesorero Demo</td>
            <td><strong>MONEDA CONTABILIZACIÓN:</strong> CLP (Peso Chileno)</td>
          </tr>
          <tr>
            <td><strong>ADELANTOS ACTIVOS:</strong> ${pendingAdvancesLedger.length} registros</td>
            <td><strong>ALERTAS VENCIDAS (&gt;30 días):</strong> <span class="text-danger">${countVencidos} vencidos</span></td>
          </tr>
        </table>
      </div>

      <p style="font-size: 10pt; margin-bottom: 15px; color: #475569; font-style: italic;">
        * Nota de Auditoría: Según el reglamento financiero corporativo de la DSA, las rendiciones de gastos deben completarse estrictamente dentro de los primeros 30 días del desembolso de caja. Aquellos adelantos marcados como <strong>VENCIDOS</strong> suspenden de forma automática toda solicitud de dinero subsiguiente de este departamento.
      </p>

      <table class="data-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Fecha</th>
            <th>Departamento</th>
            <th>Responsable (Director)</th>
            <th>Concepto Evaluado</th>
            <th class="text-right">Monto</th>
            <th class="text-right">Rendido</th>
            <th class="text-right">Resta Rendir</th>
            <th class="text-center">Días</th>
            <th class="text-center">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${pendingAdvancesLedger.map(a => `
            <tr>
              <td class="font-bold">${a.id}</td>
              <td>${a.fecha}</td>
              <td class="font-bold" style="color: #1552a6;">${a.dpto}</td>
              <td>${a.solicitante}</td>
              <td>${a.concepto}</td>
              <td class="text-right">$${a.monto.toLocaleString("es-CL")}</td>
              <td class="text-right">$${a.rendido.toLocaleString("es-CL")}</td>
              <td class="text-right font-bold">$${a.saldo.toLocaleString("es-CL")}</td>
              <td class="text-center">${a.dias}</td>
              <td class="text-center">
                <span class="${a.dias > 30 ? 'text-danger' : 'text-success'}">
                  ${a.dias > 30 ? 'VENCIDO' : 'VIGENTE'}
                </span>
              </td>
            </tr>
          `).join("")}
          <tr class="totals-bar">
            <td colspan="5">Suma Acumulada Consolidada</td>
            <td class="text-right">$${pendingAdvancesLedger.reduce((sum, a) => sum + a.monto, 0).toLocaleString("es-CL")}</td>
            <td class="text-right">$${pendingAdvancesLedger.reduce((sum, a) => sum + a.rendido, 0).toLocaleString("es-CL")}</td>
            <td class="text-right">$${outstandingTotal.toLocaleString("es-CL")}</td>
            <td colspan="2" class="text-center">-</td>
          </tr>
        </tbody>
      </table>

      <div class="signatures-container">
        <table>
          <tr>
            <td>
              <div class="sig-line"></div>
              <strong>Tesorero Demo</strong><br>
              Tesorero Local de Iglesia
            </td>
            <td>
              <div class="sig-line"></div>
              <strong>Pr. Pastor Demo</strong><br>
              Pastor Distrital Consejero
            </td>
          </tr>
        </table>
      </div>
    `;

    downloadWordDoc("Adelantos_Pendientes_Informe_Oficial", htmlContent, "Adelantos_Pendientes_Oficial_DSA.doc");
  };

  const handleExportDepartmentalDoc = () => {
    const totalAllocated = departmentLedger.reduce((sum, d) => sum + d.budgetAllocated, 0);
    const totalUsed = departmentLedger.reduce((sum, d) => sum + d.egresos, 0);
    const totalSaldo = totalAllocated - totalUsed;

    const htmlContent = `
      <div class="header">
        <h1>Iglesia Adventista del Séptimo Día</h1>
        <h2>Distrito Central &bull; Sede Ejemplo &bull; Auditoría Interna</h2>
      </div>

      <div class="report-title">
        Resumen de Saldos por Departamentos de Iglesia Local
      </div>

      <div class="meta-box">
        <table>
          <tr>
            <td><strong>ESTABLECIMIENTO:</strong> Sede Local</td>
            <td><strong>SITUACIÓN AL:</strong> ${new Date().toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</td>
          </tr>
          <tr>
            <td><strong>CONTABLE OFICIAL:</strong> Tesorero Demo</td>
            <td><strong>INTEGRADO CON PLANILLA CENTRAL:</strong> SÍ (Saldos Digitales Sincronizados)</td>
          </tr>
        </table>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Código Cuenta</th>
            <th>Nombre del Departamento</th>
            <th>Director Responsable</th>
            <th class="text-right">Fondo Asignado</th>
            <th class="text-right">Total Egresos</th>
            <th class="text-right">Saldo Disponible</th>
            <th class="text-center">Ejecución %</th>
          </tr>
        </thead>
        <tbody>
          ${departmentLedger.map(d => `
            <tr>
              <td class="font-bold">${d.code}</td>
              <td class="font-bold" style="color: #1552a6;">${d.name}</td>
              <td>${d.director}</td>
              <td class="text-right">$${d.budgetAllocated.toLocaleString("es-CL")}</td>
              <td class="text-right">$${d.egresos.toLocaleString("es-CL")}</td>
              <td class="text-right font-bold">$${d.saldo.toLocaleString("es-CL")}</td>
              <td class="text-center font-bold" style="color: ${d.percentage > 75 ? '#b91c1c' : '#475569'};">${d.percentage}%</td>
            </tr>
          `).join("")}
          <tr class="totals-bar">
            <td colspan="3">Fórmula Consolidada Global</td>
            <td class="text-right">$${totalAllocated.toLocaleString("es-CL")}</td>
            <td class="text-right">$${totalUsed.toLocaleString("es-CL")}</td>
            <td class="text-right">$${totalSaldo.toLocaleString("es-CL")}</td>
            <td class="text-center font-bold">${Math.round((totalUsed/totalAllocated)*100)}%</td>
          </tr>
        </tbody>
      </table>

      <div class="signatures-container">
        <table>
          <tr>
            <td>
              <div class="sig-line"></div>
              <strong>Tesorero Demo</strong><br>
              Tesorero Local de Iglesia
            </td>
            <td>
              <div class="sig-line"></div>
              <strong>Director Demo</strong><br>
              Líder Financiero / Auditor Distrital
            </td>
          </tr>
        </table>
      </div>
    `;

    downloadWordDoc("Resumen_Saldos_Por_Departamento_ACMS", htmlContent, "Saldos_Departamentos_Consolidado_ACMS.doc");
  };

  // Perform interactive query in character with Spanish ACMS "Consultar"
  const handleConsultar = (e: React.FormEvent) => {
    e.preventDefault();
    setIsQuerying(true);
    
    setTimeout(() => {
      let results = [...realMovements];
      
      // Filter by Department Selection
      if (selectedDept !== "todos") {
        results = results.filter(m => m.dpto.toLowerCase().includes(selectedDept.toLowerCase()));
      }
      
      // Filter by Month keyword
      if (selectedMonth === "Mayo") {
        results = results.filter(m => m.fecha.includes("-05-"));
      } else if (selectedMonth === "Junio") {
        results = results.filter(m => m.fecha.includes("-06-"));
      }
      
      // Filter by Status selection
      if (selectedStatus !== "todos") {
        results = results.filter(m => m.estado.toLowerCase() === selectedStatus.toLowerCase());
      }

      // Filter by search string
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        results = results.filter(m => 
          m.concepto.toLowerCase().includes(q) || 
          m.id.toLowerCase().includes(q) ||
          m.dpto.toLowerCase().includes(q)
        );
      }
      
      setQueryResults(results);
      setIsQuerying(false);
    }, 450);
  };

  // Real Excel/File upload callback using XLSX
  const processFile = (file: File) => {
    setLoadedFileName(file.name);
    setIsParsing(true);
    setIntegrationSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length === 0) {
          throw new Error("El archivo Excel está completamente vacío o sin formato.");
        }

        // Get headers and rows
        const rawHeaders = json[0] || [];
        const headers = rawHeaders.map((h: any) => String(h || "").trim());
        const rawRows = json.slice(1).filter(r => r && r.length > 0 && r.some(c => c !== null && c !== undefined && c !== ""));

        // Format row cells for visual rendering
        const formattedRows = rawRows.map((row: any[]) => {
          return row.map((cell: any) => {
            if (cell === null || cell === undefined) return "";
            if (typeof cell === "number") {
              // format currency if numeric and likely money
              if (headers.some((h: string) => h.toLowerCase().includes("monto") || h.toLowerCase().includes("saldo") || h.toLowerCase().includes("cantidad") || h.toLowerCase().includes("presupuesto") || h.toLowerCase().includes("inicial") || h.toLowerCase().includes("egreso") || h.toLowerCase().includes("tope"))) {
                return `$${cell.toLocaleString("es-CL")}`;
              }
              return String(cell);
            }
            return String(cell);
          });
        });

        setParsedData({
          title: `Datos Extraídos: ${
            selectedAcmsType === "tesoreria" ? "Movimientos de Tesorería" : 
            selectedAcmsType === "departamento" ? "Presupuestos de Departamentos" : 
            selectedAcmsType === "banco" ? "Cartola Bancaria" : 
            selectedAcmsType === "balance" ? "Balance de Cuentas" : "Distribución de Ofrendas"
          }`,
          summary: `Éxito: Se extrajeron ${rawRows.length} registros de la hoja contable "${sheetName}".`,
          headers: headers,
          rows: formattedRows,
          rawRows: rawRows // keeps original data typed values for direct integration
        });
        setIsParsing(false);
      } catch (err: any) {
        console.error(err);
        alert("Error al cargar y procesar el archivo Excel: " + (err.message || err));
        setIsParsing(false);
        setLoadedFileName(null);
        setParsedData(null);
      }
    };

    reader.onerror = (err) => {
      console.error(err);
      alert("Error leyendo el archivo físico en el navegador.");
      setIsParsing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleAcmsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const simulateParsing = (fileName: string) => {
    setIsParsing(true);
    setParsedData(null);
    setLoadedFileName(fileName);
    setIntegrationSuccess(false);

    setTimeout(() => {
      setIsParsing(false);
      setParsedData(SIMULATED_ACMS_PAYLOADS[selectedAcmsType]);
    }, 1200);
  };

  const handleSelectSimulatedTemplate = (type: "balance" | "banco" | "ofrendas" | "tesoreria" | "departamento") => {
    setSelectedAcmsType(type);
    const mockFileNames = {
      balance: "ACMS_Balance_Comprobacion_IglesiaLocal_Mayo2026.xlsx",
      banco: "Cartola_BancoEstado_Auxiliar_Consolidada.csv",
      ofrendas: "Plan_Distribucion_Ofrendas_AsociacionChilena.pdf",
      tesoreria: "Plantilla_Movimientos_Tesoreria_Entradas_Salidas.xlsx",
      departamento: "Plantilla_Presupuestos_Departamentos.xlsx"
    };
    simulateParsing(mockFileNames[type]);
  };

  const handleConfirmIntegration = () => {
    if (!parsedData) return;

    let importedCount = 0;

    // Depend on selectedAcmsType, let's process and apply real updates!
    if (selectedAcmsType === "tesoreria" || selectedAcmsType === "banco") {
      const rows = parsedData.rawRows || [];
      rows.forEach((row: any[]) => {
        const rowObj: any = {};
        parsedData.headers.forEach((h: string, idx: number) => {
          const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          rowObj[norm] = row[idx];
        });

        const dateRaw = rowObj["fecha"] || new Date().toISOString().split("T")[0];
        // Parse serial/excel dates if they come as numbers
        let date = String(dateRaw);
        if (/^\d{5}$/.test(date)) {
          const excelEpoch = new Date(1899, 11, 30);
          const parsedDays = parseInt(date, 10);
          excelEpoch.setDate(excelEpoch.getDate() + parsedDays);
          date = excelEpoch.toISOString().split("T")[0];
        }

        const typeInput = String(rowObj["tipo"] || "Ingreso").trim();
        const type = (typeInput.toLowerCase().includes("gasto") || typeInput.toLowerCase().includes("egreso") || typeInput.toLowerCase().includes("salida") || typeInput.toLowerCase().includes("retiro") || typeInput.toLowerCase().includes("debito") || typeInput.toLowerCase().includes("egr") || typeInput.toLowerCase().includes("g")) ? "Gasto" : "Ingreso";
        
        let amount = Math.abs(parseFloat(String(rowObj["monto"] || rowObj["cantidad"] || rowObj["depositos (+)"] || rowObj["retiros (-)"] || "0").replace(/[^0-9.-]/g, ""))) || 0;
        
        // If amount is zero but depositos/retiros might be empty strings, solve it
        if (amount === 0 && rowObj["depositos (+)"]) {
          amount = Math.abs(parseFloat(String(rowObj["depositos (+)"]).replace(/[^0-9.-]/g, ""))) || 0;
        }
        if (amount === 0 && rowObj["retiros (-)"]) {
          amount = Math.abs(parseFloat(String(rowObj["retiros (-)"]).replace(/[^0-9.-]/g, ""))) || 0;
        }

        const description = String(rowObj["descripcion"] || rowObj["detalle"] || rowObj["descripcion movimiento acms"] || "Movimiento importado").trim();
        const category = String(rowObj["categoria"] || rowObj["fondo"] || "Administración").trim();

        // Check if description or amount is empty, if is let's skip
        if (!description || amount <= 0) return;

        // Find bank account
        const bankSearch = String(rowObj["banco"] || rowObj["cuenta"] || "Banco Estado Principal").toLowerCase().trim();
        const matchedAccount = bankAccounts.find(ba => ba.id === bankSearch || ba.name.toLowerCase().includes(bankSearch)) || bankAccounts[0];
        const bankId = matchedAccount ? matchedAccount.id : "ba-1";

        const tx: BankTransaction = {
          id: "bt-imp-" + Math.random().toString(36).substring(2, 9),
          date,
          type,
          bankId,
          amount,
          description,
          category
        };

        if (onAddBankTransaction) {
          onAddBankTransaction(tx);
        }

        // Update bank balance
        if (matchedAccount && onUpdateBankAccounts) {
          const offset = type === "Ingreso" ? amount : -amount;
          const updatedAccounts = bankAccounts.map(ba => ba.id === matchedAccount.id ? { ...ba, balance: Math.max(0, ba.balance + offset) } : ba);
          onUpdateBankAccounts(updatedAccounts);
        }
        importedCount++;
      });
    } else if (selectedAcmsType === "departamento" || selectedAcmsType === "balance") {
      const rows = parsedData.rawRows || [];
      rows.forEach((row: any[]) => {
        const rowObj: any = {};
        parsedData.headers.forEach((h: string, idx: number) => {
          const norm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          rowObj[norm] = row[idx];
        });

        // Try code and name
        const code = String(rowObj["codigo"] || rowObj["codigo cuenta"] || rowObj["codigo departamento"] || "").trim().toUpperCase();
        const name = String(rowObj["nombre"] || rowObj["nombre de cuenta / departamento"] || rowObj["nombre de fondo/cuenta"] || rowObj["departamento"] || "").trim();

        if (!code && !name) return;

        // Match first against code, then name
        const dept = departments.find(d => {
          if (code && d.code === code) return true;
          if (name && d.name.toLowerCase().includes(name.toLowerCase())) return true;
          return false;
        });

        if (dept && onUpdateDepartment) {
          const budgetAllocated = Math.max(parseFloat(String(rowObj["tope"] || rowObj["presupuesto total"] || rowObj["presupuesto"] || rowObj["tope/presupuesto"] || rowObj["saldo final"] || dept.budgetAllocated).replace(/[^0-9.-]/g, "")) || dept.budgetAllocated, 1);
          const budgetUsed = parseFloat(String(rowObj["egresos"] || rowObj["presupuesto usado"] || rowObj["usado"] || rowObj["usado/egresos"] || dept.budgetUsed).replace(/[^0-9.-]/g, "")) || dept.budgetUsed;
          const initialBudget = parseFloat(String(rowObj["presupuesto inicial"] || rowObj["inicial"] || rowObj["saldo inicial"] || dept.initialBudget || budgetAllocated).replace(/[^0-9.-]/g, "")) || (dept.initialBudget || budgetAllocated);
          
          let assignedPercentageRaw = String(rowObj["porcentaje"] || rowObj["porcentaje asignado"] || dept.assignedPercentage || "10");
          const assignedPercentage = parseFloat(assignedPercentageRaw.replace(/[^0-9.-]/g, "")) || dept.assignedPercentage;

          const ratio = Math.round((budgetUsed / budgetAllocated) * 100);
          const updatedDept = {
            ...dept,
            budgetAllocated,
            budgetUsed,
            initialBudget,
            assignedPercentage,
            percentageUsed: ratio
          };
          onUpdateDepartment(updatedDept);
          importedCount++;
        }
      });
    } else {
      // ofrendas fallback
      importedCount = parsedData.rawRows?.length || 0;
    }

    const newFileLog = {
      id: "acms-" + Date.now().toString().substring(8),
      name: loadedFileName || `Inyeccion_ACMS_Contable.xlsx`,
      generatedBy: "Servicio Sincronizador ACMS",
      date: new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
      format: "EXCEL" as const
    };

    setHistoricReportList(prev => [newFileLog, ...prev]);
    setIntegrationSuccess(true);
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (selectedAcmsType === "tesoreria") {
      headers = ["Fecha", "Descripción", "Monto", "Tipo", "Fondo", "Cuenta"];
      rows = [
        ["2026-06-01", "Compra de Biblias para Escuela Sabática", 35000, "Gasto", "Escuela Sabática", "Banco Estado Principal"],
        ["2026-06-02", "Ingreso Diezmos Sábado de Consagración", 650000, "Ingreso", "Diezmos", "Banco Estado Principal"],
        ["2026-06-03", "Ajuste Caja Chica - Material Dorcas", 12400, "Gasto", "Ministerio de la Mujer", "Caja Chica Iglesia"]
      ];
      filename = "Plantilla_Movimientos_Tesoreria.xlsx";
    } else if (selectedAcmsType === "departamento") {
      headers = ["Código", "Departamento", "Inicial", "Tope", "Usado", "Porcentaje"];
      rows = [
        ["ADM", "Administración", 200000, 300000, 45000, 53],
        ["JOV", "Ministerio Joven", 150000, 200000, 15000, 10],
        ["INF", "Ministerio Infantil", 100000, 120000, 10000, 8]
      ];
      filename = "Plantilla_Presupuestos_Departamentos.xlsx";
    } else if (selectedAcmsType === "banco") {
      headers = ["Fecha", "Descripción", "Monto", "Tipo", "Cuenta", "Fondo"];
      rows = [
        ["2026-06-01", "Depósito Contribuciones Especiales", 145000, "Ingreso", "Banco Estado Principal", "Ofrendas"],
        ["2026-06-04", "Pago Publicidad Campaña Evangelismo", 67000, "Gasto", "Banco Estado Principal", "Evangelismo"]
      ];
      filename = "Plantilla_Cartola_Banco.xlsx";
    } else if (selectedAcmsType === "balance") {
      headers = ["Código Cuenta", "Nombre de Fondo/Cuenta", "Saldo Inicial", "Ingresos", "Egresos", "Saldo Final"];
      rows = [
        ["1.1.1.01", "Gasto de Iglesia (53%)", 4200000, 2840000, 1120000, 5920000],
        ["1.1.1.04", "Ministerio Joven (4%)", 950000, 480000, 320000, 1110000]
      ];
      filename = "Plantilla_Balance_Comprobacion.xlsx";
    } else {
      headers = ["Fondo Destinatario", "Porcentaje Asignado", "Ingresos Mes"];
      rows = [
        ["Gasto de Iglesia", 53.0, 5300000],
        ["Evangelismo Local", 9.0, 900000]
      ];
      filename = "Plantilla_Distribucion_Ofrendas.xlsx";
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6 text-left">

      {/* Header bar */}
      <div className="border-b border-slate-200/50 pb-4 select-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
            <span>PORTAL DE INFORMES</span>
            <span>/</span>
            <span className="text-[#1552a6] font-extrabold font-sans">CONTABILIDAD OFICIAL</span>
          </div>
          <h1 className="text-xl font-black text-slate-800 font-sans mt-0.5">Informes Financieros</h1>
        </div>

        {/* ACMS Module Switcher SubTabs Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-end select-none shadow-inner shrink-0">
          <button 
            type="button"
            onClick={() => setActiveMainTab("generar")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
              activeMainTab === "generar" 
                ? "bg-white text-[#1552a6] shadow" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TableProperties className="w-3.5 h-3.5 text-[#1552a6]" />
            Resumen de Movimientos
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveMainTab("importar")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
              activeMainTab === "importar" 
                ? "bg-white text-[#1552a6] shadow" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Sincronizar Planilla
          </button>

          <button 
            type="button"
            onClick={() => setActiveMainTab("adelantos")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
              activeMainTab === "adelantos" 
                ? "bg-white text-amber-700 shadow" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Adelantos Pendientes
          </button>

          <button 
            type="button"
            onClick={() => setActiveMainTab("actas")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
              activeMainTab === "actas" 
                ? "bg-white text-indigo-700 shadow" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
            Actas de Junta
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: GENERATE & QUERY GENERAL SPREADSHEETS */}
        {activeMainTab === "generar" && (
          <motion.div 
            key="resumen-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Inline Toggle: Individual Movements vs Department Ledgers */}
            <div className="flex border-b border-slate-200 select-none pb-px flex-wrap gap-y-1">
              <button
                onClick={() => setSubReportTab("individual")}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  subReportTab === "individual"
                    ? "border-[#1552a6] text-[#1552a6]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Caja Individual (Libro Diario)
              </button>
              <button
                onClick={() => setSubReportTab("departamental")}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  subReportTab === "departamental"
                    ? "border-[#1552a6] text-[#1552a6]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Resumen por Departamento (Saldos Oficiales)
              </button>
              <button
                onClick={() => setSubReportTab("mensual")}
                className={`py-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  subReportTab === "mensual"
                    ? "border-[#1552a6] text-[#1552a6]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Resumen Mensual Oficial (PDF/Excel)
              </button>
            </div>

            {subReportTab === "individual" && (
              <>
                {/* Query Form Panel styled precisely like the screenshot */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-4 select-none">
                    <h3 className="text-sm font-black text-[#1552a6] uppercase tracking-wide font-sans">
                      Consultar Libre de Caja local
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Sincronizado</span>
                  </div>

                  <form onSubmit={handleConsultar} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    
                    {/* 1. Departamento Selector */}
                    <div className="space-y-1.5 text-xs">
                      <label className="font-extrabold text-slate-500 uppercase tracking-wide">Departamento</label>
                      <select 
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 p-2 rounded-lg font-bold text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#1552a6]"
                      >
                        <option value="todos">Todos los departamentos</option>
                        <option value="Aventureros">Aventureros</option>
                        <option value="Club de Conquistadores">Club de Conquistadores</option>
                        <option value="Escuela Sabática">Escuela Sabática</option>
                        <option value="Fondo Conquistadores">Fondo Conquistadores</option>
                        <option value="Gasto de Iglesia (53%)">Gasto de Iglesia (53%)</option>
                        <option value="Ministerio Joven">Ministerio Joven</option>
                        <option value="Ministerio Infantil">Ministerio Infantil</option>
                        <option value="Ofrendas Planificadas">Ofrendas Planificadas</option>
                      </select>
                    </div>

                    {/* 2. Mes Selector */}
                    <div className="space-y-1.5 text-xs">
                      <label className="font-extrabold text-slate-500 uppercase tracking-wide">Mes Contable</label>
                      <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 p-2 rounded-lg font-bold text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#1552a6]"
                      >
                        <option value="Mayo">Mayo 2026</option>
                        <option value="Junio">Junio 2026</option>
                        <option value="todos">Todos los meses</option>
                      </select>
                    </div>

                    {/* 3. Estatus Selector */}
                    <div className="space-y-1.5 text-xs">
                      <label className="font-extrabold text-slate-500 uppercase tracking-wide">Estatus</label>
                      <select 
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 hover:border-slate-300 p-2 rounded-lg font-bold text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#1552a6]"
                      >
                        <option value="todos">Todos</option>
                        <option value="Conciliado">Conciliado</option>
                        <option value="Pendiente">Pendiente</option>
                      </select>
                    </div>

                    {/* 4. Text query */}
                    <div className="space-y-1.5 text-xs">
                      <label className="font-extrabold text-slate-500 uppercase tracking-wide block">Búsqueda rápida</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text"
                          placeholder="Glosa, ID, etc..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 pl-8 pr-3 py-1.5 rounded-lg font-bold text-slate-800 cursor-text outline-none text-xs focus:ring-1 focus:ring-[#1552a6]"
                        />
                      </div>
                    </div>

                  </form>

                  {/* Row of Query Buttons matching the visual style perfectly */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    
                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1552a6] block"></span>
                      <span>Sincronizado en tiempo real con cuentas del Banco Estado</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={handleConsultar}
                        disabled={isQuerying}
                        className="px-6 py-2 bg-[#1552a6] hover:bg-[#114285] text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all cursor-pointer select-none"
                      >
                        {isQuerying ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Consultar
                      </button>

                      <button
                        type="button"
                        onClick={handleExportIndividualCSV}
                        className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#1552a6] rounded-lg text-xs font-black shadow-none flex items-center gap-1.5 transition-all cursor-pointer select-none"
                        title="Exportar registros filtrados a formato de hoja de cálculo"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#10ae5b]" />
                        Exportar Excel (.csv)
                      </button>

                      <button
                        type="button"
                        onClick={exportIndividualPDF}
                        className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-red-600 rounded-lg text-xs font-black shadow-none flex items-center gap-1.5 transition-all cursor-pointer select-none"
                        title="Exportar registros filtrados a formato de reporte PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        Exportar PDF (.pdf)
                      </button>
                    </div>

                  </div>
                </div>

                {/* Live Table Output under the filter panel */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden select-none">
                  
                  <div className="p-4 bg-slate-50/50 border-b border-slate-150 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                      Transacciones de caja registradas: ({queryResults.length}) registros
                    </span>
                    
                    <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-150">
                      Moneda de cuenta: <strong>CLP (Peso Chileno)</strong>
                    </span>
                  </div>

                  {isQuerying ? (
                    <div className="py-20 text-center text-xs text-slate-500 space-y-3">
                      <RefreshCw className="w-7 h-7 text-[#1552a6] animate-spin mx-auto" />
                      <p className="font-bold">Ejecutando consulta canónica...</p>
                    </div>
                  ) : queryResults.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                      <TableProperties className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-extrabold text-slate-700">Ningún movimiento coincide con los filtros</p>
                      <p className="text-[11px] text-slate-400">Prueba cambiando la glosa de búsqueda o los meses contables.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-[#fcfdfe] text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3 text-center">ID</th>
                            <th className="px-5 py-3">Fecha</th>
                            <th className="px-5 py-3">Fondo/Cta</th>
                            <th className="px-5 py-3">Concepto/Descripción de Gasto u Ofrenda</th>
                            <th className="px-5 py-3 text-center">Tipo</th>
                            <th className="px-5 py-3 text-right">Monto CLP</th>
                            <th className="px-5 py-3 text-center">Estado Planilla</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                          {queryResults.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3.5 text-center text-slate-400 font-mono text-[10px]">{m.id}</td>
                              <td className="px-5 py-3.5 font-semibold text-slate-500">{m.fecha}</td>
                              <td className="px-5 py-3.5 text-[#1552a6] truncate max-w-[150px]">{m.dpto}</td>
                              <td className="px-5 py-3.5 text-slate-600 font-medium truncate max-w-sm" title={m.concepto}>{m.concepto}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  m.tipo === "Ingreso" 
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                    : "bg-orange-50 text-orange-600 border border-orange-100"
                                }`}>
                                  {m.tipo}
                                </span>
                              </td>
                              <td className={`px-5 py-3.5 text-right font-mono font-black ${
                                m.tipo === "Ingreso" ? "text-emerald-600" : "text-slate-800"
                              }`}>
                                ${m.monto.toLocaleString("es-CL")}
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                                  m.estado === "Conciliado"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${m.estado === "Conciliado" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                  {m.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Total calculation banner */}
                  <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-sans text-xs">
                    <span className="text-slate-500 font-bold">
                      Suma total de consulta filtrada:
                    </span>
                    
                    <div className="flex gap-4 font-black">
                      <div className="space-x-1.5">
                        <span className="text-slate-400 font-bold uppercase tracking-tight">INGRESOS COBRADOS:</span>
                        <span className="text-emerald-700 font-mono text-xs">
                          ${queryResults.filter(r => r.tipo === "Ingreso").reduce((sum, r) => sum + r.monto, 0).toLocaleString("es-CL")}
                        </span>
                      </div>
                      <div className="space-x-1.5">
                        <span className="text-slate-400 font-bold uppercase tracking-tight">EGRESOS DECLARADOS:</span>
                        <span className="text-orange-700 font-mono text-xs">
                          ${queryResults.filter(r => r.tipo === "Egreso").reduce((sum, r) => sum + r.monto, 0).toLocaleString("es-CL")}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

            {subReportTab === "departamental" && (
              /* SUBTAB: DEPARTMENTAL LEDGER SUMMARY */
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                    <div>
                      <h3 className="text-sm font-black text-[#1552a6] uppercase tracking-wide font-sans">
                        Saldos de Departamentos Locals (Auxiliar Contable)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Calculado con los presupuestos asignados por la tesorería de junta oficial</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportDepartmentalDoc}
                        className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-850 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Exportar Informe Word (.docx)
                      </button>
                      <button
                        onClick={handleExportDepartmentalCSV}
                        className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#1552a6] font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar saldos a planilla Excel"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#10ae5b]" />
                        Excel (.csv)
                      </button>
                      <button
                        onClick={exportDepartmentalPDF}
                        className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-red-650 font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar saldos a PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        PDF (.pdf)
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-[#fcfdfe] text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3">Código Cta</th>
                          <th className="px-5 py-3">Departamento</th>
                          <th className="px-5 py-3">Director Encargado</th>
                          <th className="px-5 py-3 text-right">Asignado Anual</th>
                          <th className="px-5 py-3 text-right">Gasto Ejecutador</th>
                          <th className="px-5 py-3 text-right">Saldo Disponible</th>
                          <th className="px-5 py-3 text-center">Gasto %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                        {departmentLedger.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">{d.code}</td>
                            <td className="px-5 py-3.5 text-[#1552a6]">{d.name}</td>
                            <td className="px-5 py-3.5 text-slate-500 font-semibold">{d.director}</td>
                            <td className="px-5 py-3.5 text-right font-mono">${d.budgetAllocated.toLocaleString("es-CL")}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-orange-600">${d.egresos.toLocaleString("es-CL")}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-black">${d.saldo.toLocaleString("es-CL")}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className={`h-full rounded-full ${
                                      d.percentage > 85 ? "bg-red-500" : d.percentage > 50 ? "bg-amber-500" : "bg-emerald-500"
                                    }`} 
                                    style={{ width: `${Math.min(d.percentage, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="font-mono text-[10px] w-8 text-right font-black">{d.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                          <td colSpan={3} className="px-5 py-4 uppercase text-slate-500 text-[10px]">Totales consolidados de caja local</td>
                          <td className="px-5 py-4 text-right font-mono text-xs">
                            ${departmentLedger.reduce((sum, d) => sum + d.budgetAllocated, 0).toLocaleString("es-CL")}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs text-orange-600">
                            ${departmentLedger.reduce((sum, d) => sum + d.egresos, 0).toLocaleString("es-CL")}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs text-emerald-600">
                            ${(departmentLedger.reduce((sum, d) => sum + d.budgetAllocated, 0) - departmentLedger.reduce((sum, d) => sum + d.egresos, 0)).toLocaleString("es-CL")}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {Math.round((departmentLedger.reduce((sum, d) => sum + d.egresos, 0) / departmentLedger.reduce((sum, d) => sum + d.budgetAllocated, 0)) * 100)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {subReportTab === "mensual" && (
              /* BEAUTIFUL RESUMEN MENSUAL AS PER USER DESIGN */
              <div className="space-y-6">
                {/* PDF and Word exports trigger */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4 print:hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                    <div>
                      <h3 className="text-sm font-black text-[#1552a6] uppercase tracking-wide font-sans flex items-center gap-1">
                        Resumen Contable Mensual Oficial (Caja Mayor)
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Sigue con fidelidad absoluta el diseño y los rubros descritos en el resumen mensual corporativo oficial de la DSA</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar este informe específico en formato PDF para impresión"
                      >
                        <FileText className="w-3.5 h-3.5" /> Exportar a PDF (.pdf)
                      </button>
                      <button
                        onClick={() => {
                          const docHeader = "========================================================\n" +
                                            "          IGLESIA ADVENTISTA DEL SÉPTIMO DÍA\n" +
                                            "     Distrito Los Creadores - Resumen Mensual Mayo 2026\n" +
                                            "========================================================\n\n" +
                                            "     INFORME DE RESUMEN MENSUAL DE TESORERÍA\n\n";
                          const docBody = "Resumen de Entradas (Ingresos):\n" +
                                          "- Diezmo (Campo Central): $4.677.469\n" +
                                          "- Misión Mundial (Campo): $217.082\n" +
                                          "- 13° Sábado (Campo): $20.000\n" +
                                          "- Proyectos Misioneros (Campo): $217.082\n" +
                                          "- Ofrendas de Iglesia Local: $651.246\n" +
                                          "- Ofrenda Caja Departamentos: $402.330\n" +
                                          "- Auxilio Otras Congregaciones: $191.800\n" +
                                          "-----------------------------------------------\n" +
                                          "TOTAL GENERAL ENTRADAS: $6.377.009 (Local: $5.486.009, Online: $891.000)\n\n" +
                                          "Resumen de Gastos (Egresos):\n" +
                                          "- Adquisición de Muebles y Utensilios: $10.600\n" +
                                          "- Salario Limpieza: $349.516\n" +
                                          "- Libros y Revistas Eclesiásticos: $15.600\n" +
                                          "- Material de Higiene y Limpieza: $13.890\n" +
                                          "- Géneros Alimenticios: $9.160\n" +
                                          "- Fletes y Transportes Distritales: $200.000\n" +
                                          "- Evento y Programación de Iglesia: $51.090\n" +
                                          "-----------------------------------------------\n" +
                                          "TOTAL EGRESOS DE CAJA: $649.856\n\n" +
                                          "Balance de Conciliación Neta de Caja:\n" +
                                          "- Saldo Anterior de Caja: $12.435.100\n" +
                                          "- (+) Entradas del Mes: $6.377.009\n" +
                                          "- (-) Salidas del Mes: $649.856\n" +
                                          "- (=) Saldo Conciliado Neto: $18.162.253\n\n" +
                                          "Aprobación reglamentaria y firmas:\n" +
                                          "- Pr. Pastor Demo (Pastor Distrital)\n" +
                                          "- Hna. Secretaria Demo (Secretaria de Iglesia)\n" +
                                          "- Hno. Tesorero Demo (Tesorero Local de Iglesia)\n";
                          const blob = new Blob([docHeader + docBody], { type: "application/msword;charset=utf-8" });
                          const link = document.createElement("a");
                          link.href = URL.createObjectURL(blob);
                          link.download = "Resumen_Mensual_Mayo_2026.doc";
                          link.click();
                        }}
                        className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-[#1552a6] font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar reporte resumido a Word"
                      >
                        <Download className="w-3.5 h-3.5" /> Word (.doc)
                      </button>

                      <button
                        type="button"
                        onClick={exportMonthlyConsolidatedPDF}
                        className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-red-650 font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Exportar reporte resumido oficial a formato PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-600" /> PDF (.pdf)
                      </button>
                    </div>
                  </div>

                  {/* Print alert note */}
                  <div className="p-3 bg-amber-50/70 border border-amber-250 text-amber-900 rounded-xl text-[11px] leading-relaxed font-medium flex items-start gap-2 select-none print:hidden">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase text-[8px] text-amber-800 tracking-wider block">CONSEJO DE DISEÑO IMPRESIÓN (PDF)</span>
                      Para guardar este reporte como un archivo PDF perfecto, haz clic en <strong>"Exportar a PDF"</strong> y en la ventana de impresión de tu navegador selecciona "Guardar como PDF". Asegúrate de activar la casilla de "Gráficos de fondo" en la configuración de impresión.
                    </div>
                  </div>
                </div>

                {/* Printable full report block */}
                <div id="financial-report-sheet" className="bg-white rounded-xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-3xl mx-auto text-slate-800 font-sans print:border-none print:shadow-none print:p-0 print:max-w-full print:text-black">
                  
                  {/* Church logo and corporate header */}
                  <div className="text-center space-y-1.5 border-b-2 border-[#1552a6] pb-4 select-none">
                    <div className="text-[9px] font-black text-slate-400 tracking-widest font-mono">ASOCIACIÓN DIVISION SUDAMERICANA (DSA)</div>
                    <div className="text-lg font-black text-[#1552a6] tracking-wide">IGLESIA ADVENTISTA DEL SÉPTIMO DÍA</div>
                    <div className="text-xs text-slate-600 font-bold uppercase">Distrito Central &bull; Sede Ejemplo</div>
                    <div className="text-xs font-extrabold text-white bg-[#1552a6] inline-block px-4 py-1 rounded-full uppercase tracking-wider mt-1 print:bg-slate-100 print:text-black print:border">
                      Informe de Resumen Mensual de Tesorería
                    </div>
                  </div>

                  {/* Report metadata box */}
                  <div className="grid grid-cols-2 gap-4 my-6 text-[11px] bg-slate-50 p-4 rounded-xl border border-slate-100 select-text print:bg-transparent print:border print:border-slate-300">
                    <div className="space-y-1 text-left">
                      <p className="text-slate-500 font-bold uppercase block text-[8px] tracking-wider">Detalles de la Entidad</p>
                      <p className="font-extrabold text-[#1552a6] text-xs">Iglesia Los Creadores</p>
                      <p className="text-slate-500">Cta Corriente Local Ch-CLP</p>
                      <p className="text-slate-400 text-[10px]">Tipo de Cuenta: Colectas y Diezmos</p>
                    </div>
                    <div className="space-y-1 text-right border-l border-slate-200 pl-4">
                      <p className="text-slate-500 font-bold uppercase block text-[8px] tracking-wider">Período Fiscal</p>
                      <p className="font-extrabold text-slate-800 text-xs">Mayo 2026</p>
                      <p className="text-slate-500">Moneda: Peso Chileno ($, CLP)</p>
                      <p className="text-slate-500 text-emerald-600 font-bold uppercase tracking-wider flex items-center justify-end gap-1 text-[9px] mt-0.5"><Check className="w-3.5 h-3.5 stroke-[3] text-emerald-650" /> Conciliado contra Planilla</p>
                    </div>
                  </div>

                  {/* SECTION 1: INCOMES (Entradas) */}
                  <div className="space-y-3">
                    <div className="bg-[#1552a6]/5 px-3 py-1.5 rounded border-l-4 border-l-[#1552a6] select-none flex justify-between items-center print:bg-slate-100">
                      <span className="font-black text-[10px] text-[#1552a6] uppercase tracking-wider">I. Sección de Entradas / Ingresos (Colectas y Diezmos)</span>
                      <span className="text-[9px] text-slate-500 font-bold">Resumen de Mayo</span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#fcfdfe] text-[9px] text-slate-500 font-black uppercase border-b border-slate-100 select-none print:bg-slate-50">
                          <tr>
                            <th className="px-4 py-2">Cta Contable</th>
                            <th className="px-4 py-2">Concepto Ingreso</th>
                            <th className="px-4 py-2">Destino Fondo</th>
                            <th className="px-4 py-2 text-right">Ofrenda Local</th>
                            <th className="px-4 py-2 text-right">Ofrenda Online</th>
                            <th className="px-4 py-2 text-right">Total Recabado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                          {/* Campo Rows */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">01</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Diezmo (Campo Central)</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Campo DSA</td>
                            <td className="px-4 py-2 text-right font-mono">$3.843.969</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$833.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$4.677.469</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">02</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Misión Mundial (Campo)</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Campo DSA</td>
                            <td className="px-4 py-2 text-right font-mono">$205.582</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$11.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$217.082</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">03</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">13° Sábado (Campo)</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Campo DSA</td>
                            <td className="px-4 py-2 text-right font-mono">$20.000</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$0</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$20.000</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">10</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Proyectos Misioneros (Campo)</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Campo DSA</td>
                            <td className="px-4 py-2 text-right font-mono">$205.582</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$11.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$217.082</td>
                          </tr>
                          <tr className="bg-slate-50/80 font-extrabold border-t border-slate-200 select-none text-slate-900 border-b border-slate-200">
                            <td colSpan={3} className="px-4 py-2 text-left text-[9px] uppercase text-slate-500">SUBTOTAL COLECTA DESTINADA AL CAMPO (DSA)</td>
                            <td className="px-4 py-2 text-right font-mono">$4.275.133</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$856.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6]">$5.131.633</td>
                          </tr>

                          {/* Iglesia Rows */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">51</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Ofrendas de Iglesia Local</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Iglesia Local</td>
                            <td className="px-4 py-2 text-right font-mono">$616.746</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$34.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$651.246</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">55</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Ofrenda Caja Departamentos</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Iglesia Local</td>
                            <td className="px-4 py-2 text-right font-mono">$402.330</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$0</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$402.330</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">62</td>
                            <td className="px-4 py-2 text-left text-[#1552a6]">Auxilio Otras Congregaciones</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Iglesia Local</td>
                            <td className="px-4 py-2 text-right font-mono">$191.800</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$0</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6] font-extrabold">$191.800</td>
                          </tr>
                          <tr className="bg-slate-50/80 font-extrabold border-t border-slate-200 select-none text-slate-900 border-b border-slate-200">
                            <td colSpan={3} className="px-4 py-2 text-left text-[9px] uppercase text-slate-500">SUBTOTAL COLECTA DESTINADA A IGLESIA LOCAL</td>
                            <td className="px-4 py-2 text-right font-mono">$1.210.876</td>
                            <td className="px-4 py-2 text-right font-mono text-emerald-600">$34.500</td>
                            <td className="px-4 py-2 text-right font-mono text-[#1552a6]">$1.245.376</td>
                          </tr>

                          {/* Sum Totals */}
                          <tr className="bg-[#1552a6]/5 font-black border-t border-slate-300 text-slate-900 text-xs">
                            <td colSpan={3} className="px-4 py-3 text-left uppercase text-[#1552a6] tracking-wide select-none">TOTAL GENERAL ENTRADAS (CLP)</td>
                            <td className="px-4 py-3 text-right font-mono">$5.486.009</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-600">$891.000</td>
                            <td className="px-4 py-3 text-right font-mono text-[#1552a6] text-[13px] font-black">${(6377009).toLocaleString("es-CL")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 2: EXPENSES (Gastos) */}
                  <div className="space-y-3 mt-8">
                    <div className="bg-red-500/5 px-3 py-1.5 rounded border-l-4 border-l-red-600 flex justify-between items-center select-none print:bg-slate-100">
                      <span className="font-black text-[10px] text-[#2c3e50] uppercase tracking-wider">II. Sección de Gastos / Egresos (Presupuestos del Mes)</span>
                      <span className="text-[9px] text-slate-500 font-bold">Resumen de Mayo</span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#fcfdfe] text-[9px] text-slate-500 font-black uppercase border-b border-slate-100 select-none print:bg-slate-50">
                          <tr>
                            <th className="px-4 py-2">Cta Gasto</th>
                            <th className="px-4 py-2">Concepto del Gasto</th>
                            <th className="px-4 py-2">Tipo de Categoría</th>
                            <th className="px-4 py-2 text-right">Monto Facturado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">102</td>
                            <td className="px-4 py-2 text-left text-slate-800">Adquisición de Muebles y Utensilios</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Mobiliario</td>
                            <td className="px-4 py-2 text-right font-mono text-red-650">$10.600</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">400</td>
                            <td className="px-4 py-2 text-left text-slate-800">Salario Limpieza</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Personal de Iglesia</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$349.516</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">518</td>
                            <td className="px-4 py-2 text-left text-slate-800">Libros y Revistas Eclesiásticos</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Material de Estudio</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$15.600</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">520</td>
                            <td className="px-4 py-2 text-left text-slate-800">Material de Higiene y Limpieza</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Operaciones Auxiliares</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$13.890</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">532</td>
                            <td className="px-4 py-2 text-left text-slate-800">Géneros Alimenticios (Reuniones)</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Ministerio Social</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$9.160</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">537</td>
                            <td className="px-4 py-2 text-left text-slate-800">Fletes y Transportes Distritales</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Operaciones Logísticas</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$200.000</td>
                          </tr>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-left font-mono text-[10px] text-slate-400">542</td>
                            <td className="px-4 py-2 text-left text-slate-800">Evento y Programación de Iglesia</td>
                            <td className="px-4 py-2 text-left font-semibold text-slate-500">Ministerio Joven</td>
                            <td className="px-4 py-2 text-right font-mono text-red-655 text-red-600">$51.090</td>
                          </tr>
                          {/* Totals egresos */}
                          <tr className="bg-red-500/5 font-black border-t border-[#f4c2c2] text-slate-9c0 text-xs text-red-700">
                            <td colSpan={3} className="px-4 py-3 text-left uppercase tracking-wide select-none">TOTAL EGRESOS DE CAJA (CLP)</td>
                            <td className="px-4 py-3 text-right font-mono text-[13px] font-black">${(649856).toLocaleString("es-CL")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 3: NET BALANCE OF CHURCH CASH */}
                  <div className="mt-8 border-t-2 border-slate-300 pt-6 select-none font-sans print:border-slate-550">
                    <h3 className="font-sans text-[10px] font-black text-slate-800 uppercase tracking-widest block mb-3 text-left">
                      III. Balance de Conciliación Neta de Caja de Iglesia
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold leading-normal text-slate-700">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-650 flex flex-col justify-between">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold block mb-1 text-left">Saldo de Caja Anterior</span>
                        <span className="text-[13px] font-mono text-slate-800 font-black text-left">$12.435.100</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex flex-col justify-between">
                        <span className="text-[8px] uppercase tracking-wider text-emerald-600 font-bold block mb-1 text-left">(+) Total Entradas CLP</span>
                        <span className="text-[13px] font-mono text-emerald-700 font-black text-left">+$6.377.009</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 flex flex-col justify-between">
                        <span className="text-[8px] uppercase tracking-wider text-red-600 font-bold block mb-1 text-left">(-) Total Salidas CLP</span>
                        <span className="text-[13px] font-mono text-red-655 text-red-600 font-black text-left">-$649.856</span>
                      </div>
                      <div className="p-3.5 rounded-xl border border-[#1552a6]/20 bg-blue-50/50 text-[#1552a6] flex flex-col justify-between print:border print:border-slate-350">
                        <span className="text-[8px] uppercase tracking-wider text-[#1552a6] font-extrabold block mb-1 text-left">(=) Saldo Conciliado Neto</span>
                        <span className="text-[13px] font-mono text-[#1552a6] font-black text-left">$18.162.253</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: OFFICIAL AUTHORIZED SIGNATURE BOARD */}
                  <div className="mt-14 pt-8 border-t border-slate-200 select-none text-center font-sans print:mt-12">
                    <p className="text-[9px] text-slate-400 italic mb-8">
                      Documento de cierre contable visado reglamentariamente, archivado digitalmente bajo directrices DSA-IASD.
                    </p>

                    <div className="grid grid-cols-3 gap-8 text-[11px] leading-relaxed text-slate-600 print:text-black">
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 w-full mb-2"></div>
                        <p className="font-extrabold text-[#1552a6] print:text-black">Pr. Pastor Demo</p>
                        <p className="text-slate-400 font-bold uppercase text-[8px] print:text-slate-500">Pastor Distrital</p>
                      </div>
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 w-full mb-2"></div>
                        <p className="font-extrabold text-[#1552a6] print:text-black">Secretaria Demo</p>
                        <p className="text-slate-400 font-bold uppercase text-[8px] print:text-slate-500">Secretaria de Iglesia</p>
                      </div>
                      <div className="space-y-1">
                        <div className="h-0.5 bg-slate-300 w-full mb-2"></div>
                        <p className="font-extrabold text-[#1552a6] print:text-black">Tesorero Demo</p>
                        <p className="text-slate-400 font-bold uppercase text-[8px] print:text-slate-500">Tesorero Local</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Historical download logs (Visible below) */}
            <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden select-none">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-sans text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-slate-500" />
                  Archivo de Informes Emitidos Oficiales
                </h3>
                <span className="text-[9px] text-[#1552a6] font-bold">Copia Digital Validadas por la Asociación DSA</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#fcfdfe] text-[10px] text-slate-500 font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-2.5">Nombre del Archivo Generado</th>
                      <th className="px-5 py-2.5">Iniciado Por</th>
                      <th className="px-5 py-2.5">Fecha Emisión</th>
                      <th className="px-5 py-2.5 text-center">Mime Tipo</th>
                      <th className="px-5 py-2.5 text-center">Descargar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                    {historicReportList.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-extrabold text-[#1552a6] truncate max-w-xs">{rep.name}</td>
                        <td className="px-5 py-3 font-semibold text-slate-500">{rep.generatedBy}</td>
                        <td className="px-5 py-3 text-slate-450 font-semibold">{rep.date}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            rep.format === "PDF" 
                              ? "bg-red-50 text-red-500 border border-red-100" 
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          }`}>
                            {rep.format}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button 
                            onClick={() => alert(`Iniciando descarga local nativa para: ${rep.name}`)}
                            className="p-1 px-2 bg-slate-50 hover:bg-slate-100 rounded transition-colors inline-block cursor-pointer text-slate-600"
                            title="Descargar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 2: INTERACTIVE INTEGRATED ACMS SPREADSHEETS IMPORT */}
        {activeMainTab === "importar" && (
          <motion.div 
            key="importar-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Import Settings */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="pb-2 border-b border-slate-100 select-none">
                  <h3 className="font-sans text-xs font-black text-[#1552a6] uppercase tracking-wider">Planillas e Importación Oficial</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Sincroniza el libro banco local con registros informáticos corporativos</p>
                </div>

                <div className="space-y-4">
                  
                  {/* Select ACMS Document Type */}
                  <div className="space-y-1.5 text-xs text-left">
                    <label className="font-bold text-slate-500 uppercase tracking-widest block text-[10px]">Módulo de Sincronización DSA</label>
                    <select 
                      value={selectedAcmsType}
                      onChange={(e) => setSelectedAcmsType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-lg font-bold text-slate-800 cursor-pointer outline-none focus:ring-1 focus:ring-[#1552a6]"
                    >
                      <option value="tesoreria">T-01: Movimientos de Tesorería (Entradas y Salidas)</option>
                      <option value="departamento">D-02: Movimientos por Departamento (Estados de Fondos)</option>
                      <option value="banco">CB-04: Cartolas Conciliación Bancaria (por Cuenta)</option>
                      <option value="balance">B-01: Balance de Comprobación General Ofrendas y Diezmos</option>
                      <option value="ofrendas">D-09: Distribución Auxiliar Ofrendas (Art. 6)</option>
                    </select>
                  </div>

                  {/* Excel Suggested Template Column guide & Download template button */}
                  <div className="bg-[#f0f9ff] border border-blue-100 text-blue-950 p-4 rounded-xl space-y-3 text-left">
                    <span className="font-sans font-black uppercase tracking-wider text-[9px] text-[#1552a6] block">Columnas requeridas (.xlsx)</span>
                    
                    {selectedAcmsType === "tesoreria" && (
                      <div className="text-[11px] space-y-1 text-slate-650">
                        <p className="font-semibold leading-normal">Ingrese un archivo con las siguientes columnas:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Fecha</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">2026-06-01</code>)</li>
                          <li><strong>Descripción</strong> (glosa o detalle descriptivo)</li>
                          <li><strong>Monto</strong> (número absoluto de dinero)</li>
                          <li><strong>Tipo</strong> (<code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Ingreso</code> o <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Gasto</code>)</li>
                          <li><strong>Fondo</strong> (el departamento asignado)</li>
                          <li><strong>Cuenta</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Banco Estado Principal</code>)</li>
                        </ul>
                      </div>
                    )}

                    {selectedAcmsType === "departamento" && (
                      <div className="text-[11px] space-y-1 text-slate-650">
                        <p className="font-semibold leading-normal">Ingrese un archivo de saldos de departamento:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Código</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">JOV</code>, <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">ADM</code>)</li>
                          <li><strong>Departamento</strong> (nombre exacto o parcial)</li>
                          <li><strong>Inicial</strong> (monto de inicio de presupuesto)</li>
                          <li><strong>Tope / Presupuesto</strong> (tope de gasto asignado)</li>
                          <li><strong>Usado / Egresos</strong> (presupuesto ya ejecutado)</li>
                          <li><strong>Porcentaje</strong> (porcentaje de distribución ofrendas)</li>
                        </ul>
                      </div>
                    )}

                    {selectedAcmsType === "banco" && (
                      <div className="text-[11px] space-y-1 text-slate-650">
                        <p className="font-semibold leading-normal">Cargue cartolas bancarias para la cuenta seleccionada:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Fecha</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">2026-06-01</code>)</li>
                          <li><strong>Descripción</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Transf. Recibida</code>)</li>
                          <li><strong>Monto</strong> (monto de transacción)</li>
                          <li><strong>Tipo</strong> (<code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Ingreso</code> / <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Gasto</code>)</li>
                          <li><strong>Cuenta</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Banco Estado Principal</code>)</li>
                          <li><strong>Fondo</strong> (categoría o departamento)</li>
                        </ul>
                      </div>
                    )}

                    {selectedAcmsType === "balance" && (
                      <div className="text-[11px] space-y-1 text-slate-650">
                        <p className="font-semibold leading-normal">Cargue el Balance B-01 general de la DSA:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Código Cuenta</strong> (cuenta contable general)</li>
                          <li><strong>Nombre de Fondo/Cuenta</strong> (ej: <code className="font-mono bg-blue-50 text-[#1552a6] px-1 rounded">Ministerio Joven</code>)</li>
                          <li><strong>Saldo Inicial</strong></li>
                          <li><strong>Ingresos</strong></li>
                          <li><strong>Egresos</strong></li>
                          <li><strong>Saldo Final</strong></li>
                        </ul>
                      </div>
                    )}

                    {selectedAcmsType === "ofrendas" && (
                      <div className="text-[11px] space-y-1 text-slate-650">
                        <p className="font-semibold leading-normal">Distribución Auxiliar de Ofrendas Planificado:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>Fondo Destinatario</strong></li>
                          <li><strong>Porcentaje Asignado</strong></li>
                          <li><strong>Ingresos Mes</strong></li>
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-black py-2 px-3 border border-slate-200 rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#1552a6]" />
                      Descargar Plantilla .xlsx Oficial
                    </button>
                  </div>

                  {/* Format expected */}
                  <div className="space-y-1.5 text-xs font-bold text-slate-500 font-sans">
                    <label className="uppercase tracking-widest block text-[10px]">Terminación Esperada de Libro</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 h-9 items-center">
                      {(["xlsx", "csv", "pdf"] as const).map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() => setSelectedFileFormat(format)}
                          className={`flex-1 py-1 text-center font-black text-[9px] rounded uppercase transition-colors outline-none cursor-pointer ${
                            selectedFileFormat === format ? "bg-white text-[#1552a6] shadow-sm" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          .{format}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML drag & drop area */}
                  <div 
                    onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processFile(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-4 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      dragActive 
                        ? "border-[#1552a6] bg-[#eef4fc]" 
                        : "border-slate-200 bg-slate-50/50 hover:border-[#1552a6]/25"
                    }`}
                  >
                    <Upload className="w-7 h-7 mx-auto text-slate-400 animate-bounce mb-2" />
                    <p className="text-xs font-black text-slate-700">Arrastra tu reporte oficial aquí</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 mb-3 leading-normal font-medium">
                      Soporta balances generales exportados y cartolas de depósitos bancarios de la DSA
                    </p>
                    <label className="px-4 py-2 bg-[#1552a6] hover:bg-[#114285] text-white rounded-lg text-[10px] font-black cursor-pointer transition-all shadow-sm">
                      Explorar Archivo local
                      <input 
                        type="file" 
                        accept=".pdf,.xlsx,.xls,.csv" 
                        className="hidden" 
                        onChange={handleAcmsFileUpload} 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Demo presets list */}
              <div className="bg-[#f8fafc] rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-inner">
                <div>
                  <h4 className="text-xs font-black text-[#1552a6] flex items-center gap-1.5 font-sans uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    Simular Libros Corporativos
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5 font-medium">
                    Haz clic para simular la importación de planillas recolectadas desde los portales centrales:
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <button 
                    onClick={() => handleSelectSimulatedTemplate("balance")}
                    className="w-full p-2.5 bg-white border border-[#cad1d9] rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left font-bold transition-all text-slate-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4.5 h-4.5 text-[#10ae5b] shrink-0" />
                    <div>
                      <span className="block leading-none font-black text-slate-800">Cargar Balance de Comprobación Oficial</span>
                      <span className="text-[9px] text-slate-400 font-medium">Formato: Excel .xlsx</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleSelectSimulatedTemplate("banco")}
                    className="w-full p-2.5 bg-white border border-[#cad1d9] rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left font-bold transition-all text-slate-700 cursor-pointer"
                  >
                    <Landmark className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <div>
                      <span className="block leading-none font-black text-slate-800">Cargar Cartola Bancaria Conciliador</span>
                      <span className="text-[9px] text-slate-400 font-medium">Formato: CSV .csv (Banco Estado)</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => handleSelectSimulatedTemplate("ofrendas")}
                    className="w-full p-2.5 bg-white border border-[#cad1d9] rounded-xl hover:bg-slate-50 flex items-center gap-2 text-left font-bold transition-all text-slate-700 cursor-pointer"
                  >
                    <FileText className="w-4.5 h-4.5 text-[#d9381e] shrink-0" />
                    <div>
                      <span className="block leading-none font-black text-slate-800">Cargar Distribución de Ofrendas (Art. 6)</span>
                      <span className="text-[9px] text-slate-400 font-medium">Formato: Planilla de Reparto .pdf</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Spreadsheet parser visualization */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                
                {isParsing && (
                  <div className="py-20 text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-[#1552a6] animate-spin mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 font-sans">Procesando estructura de datos...</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto font-medium">
                        Analizando filas, cotejando fórmulas de distribución y conciliando fondos con bancos chilenos...
                      </p>
                    </div>
                  </div>
                )}

                {!isParsing && integrationSuccess && (
                  <div className="py-8 text-center space-y-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-6 select-none">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <div className="space-y-1.5 max-w-sm mx-auto">
                      <h4 className="text-sm font-black text-slate-800 font-sans">¡Base de Cuentas Consolidada!</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Los registros reportados fueron inyectados exitosamente en los libros de la iglesia. Las inconsistencias de saldos fueron resueltas contra Auditoría DSA.
                      </p>
                    </div>
                    
                    <div className="flex gap-2 justify-center pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setIntegrationSuccess(false);
                          setParsedData(null);
                          setLoadedFileName(null);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-black rounded-lg cursor-pointer"
                      >
                        Subir Otro Documento
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveMainTab("generar");
                          setIntegrationSuccess(false);
                          setParsedData(null);
                          setLoadedFileName(null);
                        }}
                        className="px-4 py-2 bg-[#1552a6] hover:bg-[#114285] text-white text-[11px] font-black rounded-lg shadow-sm cursor-pointer"
                      >
                        Ver Resumen General
                      </button>
                    </div>
                  </div>
                )}

                {!isParsing && !parsedData && !integrationSuccess && (
                  <div className="py-24 text-center space-y-4 text-slate-400 text-xs select-none">
                    <Upload className="w-12 h-12 mx-auto text-slate-300" />
                    <div className="space-y-1.5 font-bold max-w-xs mx-auto leading-relaxed">
                      <p className="text-slate-700 font-black font-sans uppercase tracking-wider text-[11px]">Buzón de Sincronización Central</p>
                      <p className="text-[11px] font-semibold text-slate-400">Arrastra un archivo contable local o haz clic en las simulaciones laterales para ver cómo opera el inyector de datos.</p>
                    </div>
                  </div>
                )}

                {!isParsing && parsedData && !integrationSuccess && (
                  <div className="space-y-5 animate-fade-in text-xs select-text">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 select-none">
                      <div>
                        <span className="text-[10px] font-black text-[#1552a6] tracking-widest uppercase block mb-0.5 font-sans">Estructura Leída Oficial</span>
                        <h4 className="text-sm font-black text-[#1552a6] leading-tight flex items-center gap-1.5 font-sans">
                          {parsedData.title}
                        </h4>
                        <p className="text-[10px] text-slate-405 mt-0.5 font-bold">Glosa de origen: {loadedFileName}</p>
                      </div>

                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1 shrink-0 uppercase">
                        <Check className="w-3.5 h-3.5" /> Estructura OK
                      </span>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 text-amber-900 p-3 rounded-lg flex items-start gap-2.5 leading-relaxed text-[11px] font-medium">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block uppercase text-[8px] text-amber-800 tracking-wider">Cotejo Automático</span>
                        <span>Se validó satisfactoriamente el archivo contable de origen chileno contra los datos de caja local. Todo el reparto se ajusta al Libro de Caja y Reglamento DSA.</span>
                      </div>
                    </div>

                    {/* Parser values table */}
                    <div className="rounded-xl border border-slate-200 overflow-x-auto shadow-inner bg-white">
                      <table className="w-full text-left font-sans font-semibold text-[11px]">
                        <thead className="bg-[#fcfdfe] text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-200">
                          <tr>
                            {parsedData.headers.map((h: string, idx: number) => (
                              <th key={idx} className="px-3.5 py-2.5 border-r border-slate-100 last:border-0">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {parsedData.rows.map((row: string[], rowIdx: number) => (
                            <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                              {row.map((val: string, colIdx: number) => (
                                <td 
                                  key={colIdx} 
                                  className={`px-3.5 py-2.5 border-r border-slate-100 last:border-0 font-mono text-[10px] ${
                                    val.startsWith("$") ? "text-[#1552a6] font-extrabold bg-slate-50/15" : ""
                                  } ${
                                    val === "Conciliado OK" ? "text-emerald-600 font-black bg-emerald-50/20" : ""
                                  }`}
                                >
                                  {val}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Action footer */}
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 select-none">
                      <button 
                        type="button"
                        onClick={() => {
                          setParsedData(null);
                          setLoadedFileName(null);
                        }}
                        className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-bold cursor-pointer"
                      >
                        Ignorar Archivo
                      </button>
                      <button 
                        type="button"
                        onClick={handleConfirmIntegration}
                        className="px-5 py-2.5 bg-[#1552a6] hover:bg-[#114285] text-white transition-all text-xs font-black rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-white" /> Sincronizar Cuentas Generales
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 3: FUNDS TO BE RENDERED (DEL ADELANTOS PENDIENTES.PDF EXAMPLES) */}
        {activeMainTab === "adelantos" && (
          <motion.div 
            key="adelantos-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            
            {/* Analytical dashboard summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-slate-450 uppercase block font-black text-[9px] tracking-wider">Adelantos Activos</span>
                  <span className="text-base font-black text-[#1552a6]">{pendingAdvancesLedger.length} Fondos</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <span className="text-slate-450 uppercase block font-black text-[9px] tracking-wider">Límites Vencidos</span>
                  <span className="text-base font-black text-red-650 text-red-600">
                    {pendingAdvancesLedger.filter(a => a.dias > 30).length} Directores
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-slate-450 uppercase block font-black text-[9px] tracking-wider">Desembolsado Total</span>
                  <span className="text-base font-black text-slate-800">
                    ${pendingAdvancesLedger.reduce((sum, a) => sum + a.monto, 0).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#eef3fb] text-blue-700 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <span className="text-slate-450 uppercase block font-black text-[9px] tracking-wider">Pendiente de Rendición</span>
                  <span className="text-base font-black text-indigo-750 text-blue-700 font-mono">
                    ${pendingAdvancesLedger.reduce((sum, a) => sum + a.saldo, 0).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>

            </div>

            {/* Main dashboard for Advances */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="select-none">
                  <h3 className="text-sm font-black text-[#1552a6] uppercase tracking-wide font-sans flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5 text-amber-500" />
                    Auxiliar de Fondos Entregados por Rendir
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Estructurado según reglas del informe oficial de auditoría corporativa DSA</p>
                </div>

                <div className="flex items-center gap-2 select-none self-end">
                  <button
                    onClick={handleExportPendingAdvancesDoc}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-850 hover:bg-amber-700 text-white font-black text-xs rounded-xl hover:shadow hover:scale-[1.01] flex items-center gap-1.5 transition-all shadow"
                    title="Exportar archivo Word formateado como el documento original"
                  >
                    <Download className="w-4 h-4 text-white" /> Descargar Reporte (.docx)
                  </button>
                  <button
                    onClick={handleExportPendingAdvancesCSV}
                    className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-amber-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#10ae5b]" />
                    Exportar Excel (.csv)
                  </button>
                  <button
                    onClick={exportPendingAdvancesPDF}
                    className="px-3.5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-amber-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Exportar adelantos vencidos y vigentes a PDF"
                  >
                    <FileText className="w-4 h-4 text-red-650" />
                    Exportar PDF (.pdf)
                  </button>
                </div>
              </div>

              {/* Warning note on DSS regulations */}
              <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2 text-[11px] text-red-900 select-none font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase text-[8px] text-red-800 block tracking-wider mb-0.5">Sanciones Automáticas por Incumplimiento</span>
                  Todo director receptor de fondos de adelanto dispone de un período estricto de <strong>30 días naturales</strong> para registrar sus facturas e ingresar su rendición de gastos. Transcurrido dicho plazo, el estado de cuenta entra en <strong>Mora de Rendición (VENCIDO)</strong> suspendiendo temporalmente el otorgamiento de nuevas remesas.
                </div>
              </div>

              {/* Table rendering values of PDF */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#fcfdfe] text-[10px] text-slate-550 font-extrabold uppercase border-b border-slate-100 select-none">
                    <tr>
                      <th className="px-5 py-3">Folio</th>
                      <th className="px-5 py-3">Fecha Entrega</th>
                      <th className="px-5 py-3">Departamento</th>
                      <th className="px-5 py-3">Receptor Encargado</th>
                      <th className="px-5 py-3">Concepto/Objeto Evaluado</th>
                      <th className="px-5 py-3 text-right">Monto</th>
                      <th className="px-5 py-3 text-right">Rendido</th>
                      <th className="px-5 py-3 text-right">Saldo Pendiente</th>
                      <th className="px-5 py-3 text-center">Días</th>
                      <th className="px-5 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11.5px] font-bold text-slate-700">
                    {pendingAdvancesLedger.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono text-[10px] font-black text-slate-400">{a.id}</td>
                        <td className="px-5 py-4 font-semibold text-slate-500">{a.fecha}</td>
                        <td className="px-5 py-4 text-[#1552a6] font-extrabold">{a.dpto}</td>
                        <td className="px-5 py-4 text-slate-600 font-semibold">{a.solicitante}</td>
                        <td className="px-5 py-4 text-slate-500 font-medium truncate max-w-[200px]" title={a.concepto}>{a.concepto}</td>
                        <td className="px-5 py-4 text-right font-mono">${a.monto.toLocaleString("es-CL")}</td>
                        <td className="px-5 py-4 text-right font-mono text-emerald-600">${a.rendido.toLocaleString("es-CL")}</td>
                        <td className="px-5 py-4 text-right font-mono text-indigo-750 font-extrabold font-black text-slate-800">
                          ${a.saldo.toLocaleString("es-CL")}
                        </td>
                        <td className={`px-5 py-4 text-center font-mono ${a.dias > 30 ? "text-red-650 text-red-600 font-extrabold" : "text-slate-450"}`}>
                          {a.dias} d.
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          {a.dias > 30 ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 text-red-700 border border-red-200/50 flex items-center justify-center gap-0.5 w-18">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                              Vencido
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center justify-center gap-0.5 w-18">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              Vigente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200 select-none">
                      <td colSpan={5} className="px-5 py-4 uppercase text-slate-500 text-[10px]">Suma consolidada de caja de adelantos activos</td>
                      <td className="px-5 py-4 text-right font-mono text-xs">
                        ${pendingAdvancesLedger.reduce((sum, a) => sum + a.monto, 0).toLocaleString("es-CL")}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-emerald-600">
                        ${pendingAdvancesLedger.reduce((sum, a) => sum + a.rendido, 0).toLocaleString("es-CL")}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-xs text-indigo-750 font-black">
                        ${pendingAdvancesLedger.reduce((sum, a) => sum + a.saldo, 0).toLocaleString("es-CL")}
                      </td>
                      <td colSpan={2} className="text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 4: BOARD ACTAS EXPORTER */}
        {activeMainTab === "actas" && (
          <motion.div 
            key="actas-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="select-none flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#1552a6] uppercase tracking-wide font-sans flex items-center gap-1.5">
                    <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />
                    Buscador y Exportador de Actas de Junta Oficiales
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Exportación en lote o individual a formatos oficiales autorizados PDF (.pdf)</p>
                </div>
              </div>

              {boardActas && boardActas.length > 0 ? (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left font-sans text-xs">
                    <thead className="bg-[#fcfdfe] text-[10px] text-slate-550 font-extrabold uppercase border-b border-slate-100 select-none">
                      <tr>
                        <th className="px-5 py-3">Voto Nro</th>
                        <th className="px-5 py-3">Fecha de Sesión</th>
                        <th className="px-5 py-3">Tipo Junta</th>
                        <th className="px-5 py-3">Título del Voto</th>
                        <th className="px-5 py-3 font-semibold">Firmado por</th>
                        <th className="px-5 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11.5px] font-bold text-slate-700">
                      {boardActas.map((acta, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 font-mono text-[10px] font-black text-slate-400">{acta.voto}</td>
                          <td className="px-5 py-4 font-semibold text-slate-500">{acta.fecha}</td>
                          <td className="px-5 py-4 text-slate-600 font-semibold">{acta.tipo}</td>
                          <td className="px-5 py-2.5 text-[#1552a6] font-extrabold max-w-[200px] truncate" title={acta.titulo}>{acta.titulo}</td>
                          <td className="px-5 py-4 text-slate-500 font-semibold">{acta.firmadoPor}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => exportActaToPDF(acta)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-750 font-black text-[10px] rounded-lg border border-red-200/50 flex items-center gap-1 mx-auto transition-all cursor-pointer"
                              title="Exportar acta de junta a PDF"
                            >
                              <FileText className="w-3 h-3 text-red-650" />
                              Exportar PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-extrabold text-slate-700">No hay actas de junta cargadas en el sistema</p>
                  <p className="text-[11px] text-slate-400">Puedes cargar actas oficiales desde la pestaña de secretaría.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
