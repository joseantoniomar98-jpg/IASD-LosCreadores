/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { ExpenseRendition, ExpenseItem, Department, User, Cargo, FundRequest, BoardVoto } from "../types";
import { 
  FileCheck, CheckSquare, Square, AlertTriangle, Landmark, Eye, Trash, 
  Plus, Check, X, Info, FileText, Image as ImageIcon, Sliders, Send, CreditCard 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RendicionesProps {
  departments: Department[];
  renditions: ExpenseRendition[];
  onAddRendition: (rendition: ExpenseRendition) => void;
  onUpdateRenditionStatus: (id: string, status: "Aprobada" | "Observada" | "Rechazada", obs?: string) => void;
  currentUser?: User;
  mode?: "resumen" | "gestion" | "nueva";
  cargos?: Cargo[];
  fundRequests?: FundRequest[];
  onUpdateRenditionFields?: (id: string, fields: Partial<ExpenseRendition>) => void;
  expenseCategories?: string[];
  bankList?: string[];
  documentTypes?: string[];
  boardVotos?: BoardVoto[];
}

export const RendicionesView: React.FC<RendicionesProps> = ({
  departments,
  renditions,
  onAddRendition,
  onUpdateRenditionStatus,
  currentUser,
  mode = "resumen",
  cargos = [],
  fundRequests = [],
  onUpdateRenditionFields,
  boardVotos = [],
  expenseCategories = [
    "Alimentación",
    "Transporte",
    "Útiles de Oficina",
    "Material de Construcción",
    "Limpieza / Aseo",
    "Eventos / Programas",
    "Otros"
  ],
  bankList = [
    "Banco Estado",
    "Banco de Chile",
    "Banco Santander",
    "Banco BCI",
    "Banco Itaú",
    "Banco Falabella",
    "Banco Scotiabank",
    "Banco Security",
    "Banco BICE"
  ],
  documentTypes = [
    "Boleta",
    "Factura",
    "Ticket",
    "Recibo",
    "Otro"
  ]
}) => {
  // Determine if the user is a global administrative officer/auditor
  const isGlobalManager = (currentUser?.roles.some(r => 
    r.toLowerCase().includes("tesorero") || 
    r.toLowerCase().includes("pastor") || 
    r.toLowerCase().includes("anciano") ||
    r.toLowerCase().includes("secretar") ||
    r.toLowerCase().includes("asistente")
  ) || (currentUser && currentUser.roles.some(roleName => {
    const matchedCargo = cargos.find(c => c.name.toLowerCase() === roleName.toLowerCase());
    return matchedCargo?.permissions.includes("ver_todos_departamentos");
  }))) ?? true;

  // Filter departments (funds) related to the user's assigned departments (formerly categories)
  const matchedDepts = isGlobalManager 
    ? departments 
    : departments.filter(d => currentUser?.departments.includes(d.category));

  // Renditions in user's departments (funds)
  const matchedRenditions = isGlobalManager
    ? renditions
    : renditions.filter(r => {
        const dObj = departments.find(d => d.name === r.department);
        return dObj && currentUser?.departments.includes(dObj.category);
      });

  // Navigation: "bandeja" (Review Audits) or "crear" (Create Rendition)
  const [activeTab, setActiveTab] = useState<"bandeja" | "crear">(() => mode === "nueva" ? "crear" : "bandeja");

  React.useEffect(() => {
    setActiveTab(mode === "nueva" ? "crear" : "bandeja");
  }, [mode]);

  // Filter state for status tabs
  const [filterState, setFilterState] = useState<"todos" | "Pendiente" | "Aprobada" | "Observada" | "Rechazada">("todos");

  // Dynamic filtered renditions list using useMemo
  const filteredRenditions = React.useMemo(() => {
    if (filterState === "todos") return matchedRenditions;
    return matchedRenditions.filter(r => r.status === filterState);
  }, [matchedRenditions, filterState]);

  // Selected audit overview
  const [selectedRendId, setSelectedRendId] = useState<string>("");
  const activeRend = filteredRenditions.find(r => r.id === selectedRendId) || filteredRenditions[0];

  // --- TREASURER EDIT MODE STATES ---
  const [isEditingRend, setIsEditingRend] = useState(false);
  const [editApplicant, setEditApplicant] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editItems, setEditItems] = useState<ExpenseItem[]>([]);

  // --- TREASURER OBSERVATIONS COMMENTS DIRECT ACCESS STATE ---
  const [treasurerComment, setTreasurerComment] = useState("");

  // --- DRAFT VOTO ASOCIADO STATE ---
  const [draftVotoAsociadoId, setDraftVotoAsociadoId] = useState<string>("");

  React.useEffect(() => {
    if (activeRend) {
      setTreasurerComment(activeRend.observations || "");
    }
  }, [selectedRendId, activeRend]);

  const startEditing = () => {
    if (!activeRend) return;
    setEditApplicant(activeRend.applicant);
    setEditProject(activeRend.project);
    setEditDepartment(activeRend.department);
    setEditItems([...activeRend.items]);
    setIsEditingRend(true);
  };

  const saveRenditionEdits = () => {
    if (!activeRend || !onUpdateRenditionFields) return;
    const total = editItems.reduce((sum, item) => sum + item.amount, 0);
    onUpdateRenditionFields(activeRend.id, {
      applicant: editApplicant,
      project: editProject,
      department: editDepartment,
      items: editItems,
      totalAmount: total
    });
    setIsEditingRend(false);
    alert("¡Rendición de gastos modificada con éxito!");
  };

  const updateEditItemField = (itemId: string, field: keyof ExpenseItem, value: any) => {
    setEditItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const deleteEditItem = (itemId: string) => {
    setEditItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addEditItem = () => {
    const newItem: ExpenseItem = {
      id: "item-edit-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      category: "Otros",
      docType: "Boleta",
      rut: "76.000.000-1",
      amount: 0,
      receiptUploaded: false,
      description: "Nuevo gasto editado"
    };
    setEditItems(prev => [...prev, newItem]);
  };

  const getBase64FromUrl = async (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL("image/jpeg", 0.75);
            resolve(dataURL);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("Canvas conversion error", err);
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  };

  const generateRealRendicionPDF = async (rend: ExpenseRendition) => {
    if (!rend) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // 1. Draw header background decoration and logo text info
    const drawPDFHeader = () => {
      // Top deep corporate blue accent block
      doc.setFillColor(21, 82, 166);
      doc.rect(10, 10, 190, 4, "F");

      // Custom geometric seal representation in gold/blue
      doc.setFillColor(197, 160, 89); // gold / brown
      doc.rect(15, 17, 3, 10, "F");
      doc.setFillColor(21, 82, 166); // deep blue
      doc.rect(19, 17, 1.5, 10, "F");
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.45);
      doc.line(15, 17, 28, 19);
      doc.line(15, 22, 28, 22);
      doc.line(15, 27, 28, 25);

      // Main branding info
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text("IGLESIA ADVENTISTA DEL SÉPTIMO DÍA", 33, 21);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("DEPARTAMENTO DE TESORERÍA - ASOCIACIÓN SUR CHILE (IASD)", 33, 25);

      doc.setFontSize(14);
      doc.setTextColor(21, 82, 166); // IASD blue
      doc.text("RENDICIÓN DE GASTOS", 33, 33);

      // Date stamp & file reference
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(112, 128, 144);
      
      const rendDateStr = rend.dateSent || new Date().toLocaleDateString("es-CL");
      doc.text(`Fecha Rendición: ${rendDateStr}`, 145, 21);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Expediente N°: ${rend.folio}`, 145, 26);

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(10, 37, 200, 37);
    };

    drawPDFHeader();

    // 2. Render details fields
    let y = 43;
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, 190, 24, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 24, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Data definitions Left Columns
    doc.text("PERSONA QUE RINDE:", 14, y + 6);
    doc.text("FONDO DE TESORERÍA:", 14, y + 12);
    doc.text("CONCEPTO / ACTIVIDAD:", 14, y + 18);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(rend.applicant.toUpperCase(), 62, y + 6);
    doc.text(rend.department.toUpperCase(), 62, y + 12);
    doc.text((rend.project || "Proyecto General de Iglesia").toUpperCase(), 62, y + 18);

    // Right Column of Metadata Panel
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("ESTADO INFORME:", 142, y + 6);
    doc.text("MEDIO DE PAGO:", 142, y + 12);
    doc.text("VOTO ACMS:", 142, y + 18);

    doc.setFont("Helvetica", "bold");
    if (rend.status === "Aprobada") {
      doc.setTextColor(21, 128, 61);
    } else if (rend.status === "Observada") {
      doc.setTextColor(194, 120, 3);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(rend.status.toUpperCase(), 176, y + 6);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(rend.pagada ? "PAGADA / REEMBOLSADA" : "PENDIENTE DE PAGO", 176, y + 12);
    doc.text(rend.votoAsociadoId || "S/V (Asignación)", 176, y + 18);

    // 3. Table representation
    y += 30;
    doc.setFillColor(21, 82, 166);
    doc.rect(10, y, 190, 7.5, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    const headers = ["FECHA", "DOC / COMPROBANTE", "RUT PROVEEDOR", "DETALLE / GLOSA DE GASTO", "MONTO CLP"];
    const colWidths = [24, 45, 28, 63, 30];

    let currentX = 10;
    headers.forEach((h, idx) => {
      const align = (idx === 4) ? "right" : "left";
      const txtX = align === "right" ? currentX + colWidths[idx] - 3 : currentX + 3;
      doc.text(h, txtX, y + 4.8, { align });
      currentX += colWidths[idx];
    });

    y += 7.5;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    const approvedSum = rend.items
      .filter(it => it.approved !== false)
      .reduce((sum, it) => sum + it.amount, 0);

    rend.items.forEach((it, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y, 190, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 6.5, 200, y + 6.5);

      let colX = 10;
      doc.text(it.date || "S/F", colX + 3, y + 4.5);
      colX += colWidths[0];

      doc.text(`${it.docType || "Boleta"} ${it.category ? `(${it.category})` : ""}`.substring(0, 22), colX + 3, y + 4.5);
      colX += colWidths[1];

      doc.text(it.rut || "76.000.000-1", colX + 3, y + 4.5);
      colX += colWidths[2];

      doc.text((it.description || "Gasto declarado").substring(0, 36), colX + 3, y + 4.5);
      colX += colWidths[3];

      doc.setFont("Helvetica", "bold");
      doc.text(`$ ${it.amount.toLocaleString("es-CL")}`, colX + colWidths[4] - 3, y + 4.5, { align: "right" });
      doc.setFont("Helvetica", "normal");

      y += 6.5;
    });

    // Subcontract lines for empty space to keep nice table visual rhythm
    const remainingEmptyLines = Math.max(0, 8 - rend.items.length);
    for (let l = 0; l < remainingEmptyLines; l++) {
      if ((rend.items.length + l) % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y, 190, 6.5, "F");
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 6.5, 200, y + 6.5);
      y += 6.5;
    }

    // Totals line
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 190, 8.5, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, 190, 8.5, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CERTIFICACIÓN: TOTAL DE COMPROBANTES DE LA RENDICIÓN", 14, y + 5.5);

    doc.setTextColor(21, 82, 166);
    doc.setFontSize(10);
    doc.text(`$ ${approvedSum.toLocaleString("es-CL")} CLP`, 197, y + 5.8, { align: "right" });

    // 4. Notes & Observations
    y += 14;
    doc.setFillColor(254, 254, 251);
    doc.rect(10, y, 190, 16, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 16, "S");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("OBSERVACIONES / RESOLUCIÓN GENERAL:", 13, y + 5);

    doc.setFont("Helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    const obsText = rend.observations || "Sin observaciones registradas. Traspasado conforme a las regulaciones de la iglesia.";
    doc.text(obsText.substring(0, 125), 13, y + 11);

    // 5. Signature Lines (líneas de firma del tesorero, director y tesorero dpto si aplica)
    const activeDeptObj = departments.find(d => d.name === rend.department);
    const hasDeptTreasurer = activeDeptObj && activeDeptObj.tesorero && activeDeptObj.tesorero !== "Sin Asignar";

    y += 22;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    if (hasDeptTreasurer) {
      const wBox = 55;
      
      // Line 1: Director
      doc.line(15, y + 15, 15 + wBox, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("DIRECTOR QUE RINDE", 15 + (wBox / 2), y + 19, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(rend.applicant.substring(0, 24), 15 + (wBox / 2), y + 23, { align: "center" });

      // Line 2: Tesorero Depto (si aplica)
      doc.line(77, y + 15, 77 + wBox, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("TESORERO DEPARTAMENTO", 77 + (wBox / 2), y + 19, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(activeDeptObj.tesorero.substring(0, 24), 77 + (wBox / 2), y + 23, { align: "center" });

      // Line 3: Tesorero de iglesia
      doc.line(140, y + 15, 140 + wBox, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("TESORERO DE IGLESIA", 140 + (wBox / 2), y + 19, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text("Tesorero Central / Asistente", 140 + (wBox / 2), y + 23, { align: "center" });
    } else {
      const wBox = 75;

      // Line 1: Director
      doc.line(20, y + 15, 20 + wBox, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("DIRECTOR QUE RINDE (SOLICITANTE)", 20 + (wBox / 2), y + 19, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text(rend.applicant.substring(0, 28), 20 + (wBox / 2), y + 23, { align: "center" });

      // Line 2: Tesorero de iglesia
      doc.line(115, y + 15, 115 + wBox, y + 15);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(51, 65, 85);
      doc.text("TESORERO DE IGLESIA GENERAL", 115 + (wBox / 2), y + 19, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.text("Tesorero Central / Asistentes", 115 + (wBox / 2), y + 23, { align: "center" });
    }

    // 6. Support Receipts Attachment Pictures (en las hojas siguientes las fotos de las boletas)
    const itemsWithImages = rend.items.filter(it => it.receiptUrl || it.receiptUploaded);

    for (let i = 0; i < itemsWithImages.length; i++) {
      const it = itemsWithImages[i];
      doc.addPage();

      // Top colored banner for attachments page
      doc.setFillColor(21, 82, 166);
      doc.rect(10, 10, 190, 3, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(21, 82, 166);
      doc.text(`RESPALDO DIGITAL DE COMPROBANTE - BOLETA N° ${i + 1} DE ${itemsWithImages.length}`, 15, 20);

      doc.setDrawColor(226, 232, 240);
      doc.line(10, 24, 200, 24);

      // Detail fields
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("DETALLE DEL COMPROBANTE:", 15, 30);
      doc.text("TIPO / CERTIFICADO:", 15, 35);
      doc.text("VALOR DECLARADO:", 15, 40);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text((it.description || "Gasto de departamento").toUpperCase(), 64, 30);
      doc.text(`${it.docType || "Boleta / Factura"} N° ${it.rut || "S/N"}`, 64, 35);
      doc.text(`$ ${it.amount.toLocaleString("es-CL")} CLP`, 64, 40);

      const frameY = 46;
      const frameHeight = 210;

      // Attempt to draw image
      const couponUrl = it.receiptUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuA1byOPm4PZWJ1Th8WYr6yvmJiccPfF7IRBBPg__YmsLshS1_zu3553zuCh_WdAlhLQmrIzw46AFuUL64H43TdDvLs5WlVlRraZmVGCt-ZDhZwo17OWK1dSH3O_5XKri6wLtjJiUykqVTDTg0uhqdo6fSKzdZQIU3YhIY2vEHdQ9Cyfx9C4_k4l2bb80zFioL91mNpBe4K9kAmb3N9pcGx1XtoH-M3KT7kRvv5PvN4vwA70IpXRVTAY2R7187odpP4LrA8rAXBo3LzJ";
      const imgBase64 = await getBase64FromUrl(couponUrl);

      if (imgBase64) {
        try {
          doc.addImage(imgBase64, "JPEG", 15, frameY + 5, 180, frameHeight - 15);
        } catch (imgErr) {
          console.error("Embedding fallback frame", imgErr);
          doc.setDrawColor(203, 213, 225);
          doc.rect(15, frameY, 180, frameHeight, "S");
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text("No se pudo cargar la imagen del comprobante por limitación de formato de datos.", 25, frameY + 25);
          doc.text(`Enlace de respaldo: ${couponUrl.substring(0, 80)}`, 25, frameY + 32);
        }
      } else {
        // High craft bordered layout if CORS or loading is blocked
        doc.setDrawColor(203, 213, 225);
        doc.rect(15, frameY, 180, frameHeight, "S");

        doc.setFillColor(248, 250, 252);
        doc.rect(17, frameY + 2, 176, frameHeight - 4, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text("IMAGEN DE COMPROBANTE CARGADO EN ARCHIVO DIGITAL", 25, frameY + 20);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Este archivo digital está resguardado en el repositorio de la Iglesia.", 25, frameY + 28);
        doc.text("Enlace al documento original en el servidor:", 25, frameY + 36);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(21, 82, 166);
        const splitText = doc.splitTextToSize(couponUrl, 160);
        doc.text(splitText, 25, frameY + 42);

        // Graphic background indicator box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(239, 246, 255);
        doc.rect(35, frameY + 65, 140, 95, "F");
        doc.rect(35, frameY + 65, 140, 95, "S");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(21, 82, 166);
        doc.text("🔗 IMAGEN DE BOLETA ASOCIADA", 105, frameY + 110, { align: "center" });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(112, 128, 144);
        doc.text("Haga click en el vínculo superior para abrir el archivo original interactivo.", 105, frameY + 118, { align: "center" });
      }
    }

    doc.save(`IASD_Comprobante_Rendicion_${rend.folio}.pdf`);
  };

  const handlePrintRendicionPDF = (rend: ExpenseRendition) => {
    if (!rend) return;
    
    const formattedDate = new Date().toLocaleDateString("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const approvedSum = rend.items
      .filter(it => it.approved !== false)
      .reduce((sum, it) => sum + it.amount, 0);

    const isDeptTreasurer = currentUser?.roles.some(r => 
      r.toLowerCase().includes("departamento") || r.toLowerCase().includes("depto")
    ) || false;

    const htmlContent = `
      <html>
        <head>
          <title>Rendicion_LosCreadores_${rend.folio}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.5; color: #000; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .logo-text { font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #112435; text-transform: uppercase; line-height: 1.2; }
            .logo-sub { font-size: 8px; color: #555; }
            .date-stamp { text-align: right; font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #000; }
            
            .main-title { text-align: center; font-family: Arial, sans-serif; font-size: 16px; font-weight: 200; border-bottom: 2px solid #000; padding-bottom: 5px; margin: 25px 0 15px 0; letter-spacing: 1.5px; font-weight: bold; }
            
            .meta-section { margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; }
            .meta-row { display: flex; margin: 6px 0; border-bottom: 1.2px dotted #aaa; padding-bottom: 3px; }
            .meta-label { font-weight: bold; width: 180px; text-transform: uppercase; color: #333; }
            .meta-val { flex-grow: 1; }

            .expense-table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 10px; }
            .expense-table th { background-color: #112435; color: white; border: 1px solid #112435; padding: 6px 4px; text-transform: uppercase; font-size: 10px; font-weight: bold; text-align: center; }
            .expense-table td { border: 1px solid #000; padding: 6px 5px; text-align: left; }
            .total-cell { font-weight: bold; background-color: #f1f5f9; }
            .text-right { text-align: right !important; }
            .text-center { text-align: center !important; }
            
            .word-sum { margin: 25px 0; font-family: Arial, sans-serif; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 8px; }
            .obs-section { margin: 20px 0; font-family: Arial, sans-serif; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 2px; }
            .obs-title { font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .obs-body { margin-left: 20px; white-space: pre-wrap; font-style: italic; }

            .signatures-container { margin-top: 60px; display: flex; justify-content: space-between; gap: 30px; font-family: Arial, sans-serif; font-size: 10px; page-break-inside: avoid; }
            .signature-box { border: 1.2px solid #000; padding: 12px 6px; text-align: center; width: 31%; border-radius: 5px; background: #fafafa; }
            .sig-title { font-weight: bold; color: #444; border-top: 1px solid #aaa; margin-top: 55px; padding-top: 6px; text-transform: uppercase; font-size: 9px; }
            
            @media print {
              body { padding: 0; }
              .logo { filter: grayscale(100%); }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: middle;">
                <div class="logo-text">
                  Iglesia Adventista<br/>del Séptimo Día
                </div>
                <div class="logo-sub">DEPARTAMENTO DE TESORERÍA<br/>LOS CREADORES - TEMUCO</div>
              </td>
              <td class="date-stamp" style="vertical-align: middle;">
                ${formattedDate}
              </td>
            </tr>
          </table>

          <div class="main-title">RENDICIÓN DE GASTOS</div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-label">Presentada por:</span>
              <span class="meta-val"><strong>${rend.applicant.toUpperCase()}</strong></span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Departamento:</span>
              <span class="meta-val"><strong>${rend.department.toUpperCase()}</strong></span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Proyecto / Actividad:</span>
              <span class="meta-val">${rend.project}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Folio Rendición:</span>
              <span class="meta-val" style="font-family: monospace;"><strong>${rend.folio}</strong></span>
            </div>
            ${rend.votoAsociadoId ? `
              <div class="meta-row">
                <span class="meta-label">Voto de Junta Asociado:</span>
                <span class="meta-val" style="font-family: monospace;">${rend.votoAsociadoId}</span>
              </div>
            ` : ""}
          </div>

          <table class="expense-table">
            <thead>
              <tr>
                <th style="width: 12%">FECHA GASTO</th>
                <th style="width: 14%">VALOR $</th>
                <th style="width: 16%">Nº BOL/FACT.</th>
                <th style="width: 16%">RUT</th>
                <th style="width: 20%">PROVEEDOR</th>
                <th style="width: 22%">DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              ${rend.items.map(it => `
                <tr ${it.approved === false ? 'style="color: #999; text-decoration: line-through; background-color: #fcf8f8;"' : ''}>
                  <td class="text-center" style="font-family: monospace;">${it.date}</td>
                  <td class="text-right" style="font-family: monospace; font-weight: bold;">$ ${it.amount.toLocaleString("es-CL")}</td>
                  <td class="text-center">${it.docType}</td>
                  <td class="text-center" style="font-family: monospace;">${it.rut || "S/N"}</td>
                  <td>${it.category}</td>
                  <td>${it.description || "Gasto declarado"} ${it.approved === false ? "<strong>(RECHAZADA)</strong>" : ""}</td>
                </tr>
              `).join("")}
              
              <!-- Blank spacing lines according to formal screenshot -->
              ${Array.from({ length: Math.max(0, 10 - rend.items.length) }).map(() => `
                <tr>
                  <td class="text-center" style="height: 18px;">&nbsp;</td>
                  <td class="text-right">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td class="text-center">&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              `).join("")}

              <tr class="total-row">
                <td class="text-right total-cell" colspan="1" style="font-family: Arial; font-size: 11px;">TOTAL</td>
                <td class="text-right total-cell" style="font-family: monospace; font-size: 11px; color: #112435;">
                  $ ${approvedSum.toLocaleString("es-CL")}
                </td>
                <td colspan="4" class="total-cell" style="font-size: 9px; color: #555; padding-left: 10px;">
                  ${approvedSum !== rend.totalAmount ? `(*Excluyendo $ ${(rend.totalAmount - approvedSum).toLocaleString("es-CL")} de boletas rechazadas)` : ""}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="word-sum">
            Certifico que estos gastos suman <strong>$ ${approvedSum.toLocaleString("es-CL")}</strong> pesos.
          </div>

          <div class="obs-section">
            <div class="obs-title">Observación:</div>
            <p class="obs-body">${rend.observations || "Sin observaciones adicionales registrados por Auditoría de Tesorería."}</p>
          </div>

          <div class="signatures-container">
            <div class="signature-box">
              <div style="height: 10px;"></div>
              <div class="sig-title">Firma de quien rinde<br/><strong>${rend.applicant}</strong></div>
            </div>

            <!-- Department Director dynamic signature box as requested (Tesorero de dpto, Director, Tesorero) -->
            ${(isDeptTreasurer || rend.department.toLowerCase().includes("jóvenes") || rend.department.toLowerCase().includes("aventureros") || rend.department.toLowerCase().includes("escuela") || rend.department.toLowerCase().includes("ministerio")) ? `
              <div class="signature-box">
                <div style="height: 10px;"></div>
                <div class="sig-title">Director del Departamento<br/><strong>Firma de Autorización</strong></div>
              </div>
            ` : ""}

            <div class="signature-box">
              <div style="height: 10px;"></div>
              <div class="sig-title">Firma Tesorero de Iglesia<br/><strong>Tesorero General / Asistente</strong></div>
            </div>
          </div>
        </body>
      </html>
    `;

    let printFrame = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "print-iframe";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }
    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 250);
    }
  };

  // Audit Checklist checklist state
  const [checklist, setChecklist] = useState({
    receiptsOk: true,
    voteAligned: true,
    rutValidated: false,
  });

  // Lightbox Modal for Receipt coupons
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  // --- NEW RENDITION DRAFT BUILDER STATE ---
  const [newApplicant, setNewApplicant] = useState(() => currentUser?.name || "Juan Pérez");
  const [newDept, setNewDept] = useState(() => matchedDepts[0]?.name || "Ministerio Joven");

  // --- NEW DRAG & DROP FOR DRIVE ---
  const [uploadedComprobantes, setUploadedComprobantes] = useState<string[]>([]);
  const [comprobantesDragging, setComprobantesDragging] = useState(false);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setNewApplicant(currentUser.name);
      const userDepts = isGlobalManager 
        ? departments 
        : departments.filter(d => currentUser.departments.includes(d.category));
      if (userDepts.length > 0) {
        setNewDept(userDepts[0].name);
      }
    }
  }, [currentUser, departments]);

  const [newProject, setNewProject] = useState("");
  const [draftItems, setDraftItems] = useState<ExpenseItem[]>([]);

  // Associated fund request and banking/devolution states
  const [selectedFondoId, setSelectedFondoId] = useState<string>("");
  const [selectedVotoAsociadoId, setSelectedVotoAsociadoId] = useState<string>("");
  const [devolucionExcedenteFile, setDevolucionExcedenteFile] = useState<string>("");
  
  // Banking transfer state for reimbursement
  const [recipientType, setRecipientType] = useState<"director" | "otra_persona">("director");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRut, setRecipientRut] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [bank, setBank] = useState("");
  const [accountType, setAccountType] = useState("Cuenta Corriente");
  const [accountNumber, setAccountNumber] = useState("");

  // Synchronize beneficiary name if director is chosen
  React.useEffect(() => {
    if (recipientType === "director") {
      setRecipientName(newApplicant);
    }
  }, [recipientType, newApplicant]);

  // Add Item to Draft line
  const [itemDate, setItemDate] = useState("");
  const [itemCategory, setItemCategory] = useState("Alimentación");
  const [itemDocType, setItemDocType] = useState("Boleta");
  const [itemRut, setItemRut] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemReceiptUrl, setItemReceiptUrl] = useState("");

  const handleAddDraftLine = () => {
    const parsedAmount = parseFloat(itemAmount);
    if (!itemDate || !itemRut || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor rellene los campos de línea de gasto con montos correctos.");
      return;
    }

    const newItem: ExpenseItem = {
      id: "item-draft-" + Date.now(),
      date: itemDate,
      category: itemCategory,
      docType: itemDocType,
      rut: itemRut,
      amount: parsedAmount,
      receiptUploaded: !!itemReceiptUrl,
      receiptUrl: itemReceiptUrl || "",
      description: itemDesc || "Gasto general"
    };

    setDraftItems([...draftItems, newItem]);
    setItemRut("");
    setItemAmount("");
    setItemDesc("");
    setItemReceiptUrl("");
  };

  const handleRemoveDraftLine = (id: string) => {
    setDraftItems(draftItems.filter(i => i.id !== id));
  };

  const draftTotalSum = draftItems.reduce((acc, i) => acc + i.amount, 0);

  // Submit rendition draft
  const handleCreateRendition = () => {
    if (draftItems.length === 0) {
      alert("No puede enviar una rendición vacía sin líneas de gasto.");
      return;
    }

    let isLinkRequested = selectedFondoId !== "";
    let associatedFondo = isLinkRequested ? fundRequests.find(fr => fr.id === selectedFondoId) : undefined;
    let devFile = "";
    let savedTransferDetails = false;

    if (associatedFondo) {
      if (draftTotalSum < associatedFondo.amount) {
        // Must have uploaded/defined devolution document
        if (!devolucionExcedenteFile.trim()) {
          alert(`⚠️ COMPROBANTE DE DEVOLUCIÓN REQUERIDO: El monto rendido ($${draftTotalSum.toLocaleString("es-CL")}) es menor al monto asignado en el Fondo por Rendir ($${associatedFondo.amount.toLocaleString("es-CL")}). Por favor adjunte o indique el comprobante de devolución del excedente.`);
          return;
        }
        devFile = devolucionExcedenteFile;
      } else if (draftTotalSum > associatedFondo.amount) {
        // Must have filled transfer coordinates for reimbursement of excess
        if (!bank.trim() || !accountNumber.trim() || !recipientName.trim() || !recipientRut.trim() || !recipientEmail.trim()) {
          alert(`⚠️ DATOS TRANSFERENCIA REQUERIDOS: El monto rendido ($${draftTotalSum.toLocaleString("es-CL")}) supera el monto del Fondo por Rendir ($${associatedFondo.amount.toLocaleString("es-CL")}). Registre los datos bancarios para transferir el reembolso del saldo.`);
          return;
        }
        savedTransferDetails = true;
      }
    } else {
      // Direct rendition - transfer is needed to pay for the whole rendered fee
      if (!bank.trim() || !accountNumber.trim() || !recipientName.trim() || !recipientRut.trim() || !recipientEmail.trim()) {
        alert("⚠️ DATOS TRANSFERENCIA REQUERIDOS: Al no asociar la rendición a ningún Fondo, es obligatorio indicar los datos bancarios para transferir el reembolso de los gastos rendidos.");
        return;
      }
      savedTransferDetails = true;
    }

    const driveFolderSlug = newDept.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const newRend: ExpenseRendition = {
      id: "rend-" + (renditions.length + 10),
      folio: "RD-2024-" + (renditions.length + 1204),
      dateSent: new Date().toISOString().split("T")[0],
      applicant: newApplicant,
      department: newDept,
      project: newProject,
      items: draftItems.map(it => ({ ...it, receiptUploaded: true })),
      totalAmount: draftTotalSum,
      status: "Pendiente",
      comprobantesDriveUrl: uploadedComprobantes.length > 0 
        ? `https://drive.google.com/drive/folders/tesoreria_rendiciones_${driveFolderSlug}`
        : `https://drive.google.com/drive/folders/tesoreria_rendiciones_general`,
      acmsStatus: "Pendiente",
      pagada: false,
      
      asociadaFondoId: selectedFondoId || undefined,
      votoAsociadoId: selectedVotoAsociadoId || undefined,
      devolucionExcedenteUrl: devFile || undefined,
      hasTransferDetails: savedTransferDetails,
      recipientType: savedTransferDetails ? recipientType : undefined,
      recipientName: savedTransferDetails ? recipientName : undefined,
      recipientRut: savedTransferDetails ? recipientRut : undefined,
      recipientEmail: savedTransferDetails ? recipientEmail : undefined,
      bank: savedTransferDetails ? bank : undefined,
      accountType: savedTransferDetails ? accountType : undefined,
      accountNumber: savedTransferDetails ? accountNumber : undefined
    };

    onAddRendition(newRend);
    setSelectedRendId(newRend.id);
    alert(`Rendición enviada con éxito! Comprobantes guardados reglamentariamente en la carpeta Google Drive de Tesorería.\nFolio asignado: ${newRend.folio}`);
    setDraftItems([]);
    setUploadedComprobantes([]);
    setSelectedFondoId("");
    setSelectedVotoAsociadoId("");
    setDevolucionExcedenteFile("");
    setRecipientType("director");
    setRecipientName("");
    setRecipientRut("");
    setRecipientEmail("");
    setBank("");
    setAccountType("Cuenta Corriente");
    setAccountNumber("");
    setActiveTab("bandeja"); // swap to list
  };

  // Perform auditor updates
  const handleUpdateStatus = (status: "Aprobada" | "Observada" | "Rechazada") => {
    if (!activeRend) return;
    onUpdateRenditionStatus(activeRend.id, status, "Verificado por auditoría.");
    alert(`Rendición de gastos ${activeRend.folio} cambiada a: ${status.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">

      {/* Primary Header and Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2 text-sm text-outline font-medium">
            <span>TESORERÍA Y AUDITORÍA</span>
            <span>/</span>
            <span className="text-secondary font-bold">
              {mode === "resumen" && "RESUMEN RENDICIONES"}
              {mode === "gestion" && "GESTIÓN DE RENDICIONES"}
              {mode === "nueva" && "NUEVA RENDICIÓN"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-primary mt-1">
            {mode === "resumen" && "Resumen de Rendiciones de Gastos"}
            {mode === "gestion" && "Gestión y Auditoría de Rendiciones"}
            {mode === "nueva" && "Nueva Rendición de Gastos realizada"}
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            {mode === "resumen" && "Historial general y estados de revisión de rendiciones con comprobantes adjuntos."}
            {mode === "gestion" && "Panel del Tesorero para auditar comprobantes, cotejar RUTs ante el SII y aprobar cajas."}
            {mode === "nueva" && "Registre boletas o facturas físicas ingresando RUT, montos y subiendo los comprobantes digitales."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: AUDIT RENDITIONS SCREEN (Mockup 3 & 8) */}
        {activeTab === "bandeja" && (
          <motion.div 
            key="audit-board"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left side list columns: lists drafts & submitted renditions */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-5 select-none">
                <h4 className="text-xs font-black text-primary tracking-widest uppercase mb-3">Expedientes Recibidos</h4>
                
                {/* Table filtering */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 rounded-xl p-1 mb-4 border border-outline-variant/20">
                  {["Todos", "Pendiente", "Aprobada", "Observada", "Rechazada"].map((st) => (
                    <button 
                      key={st}
                      type="button"
                      onClick={() => setFilterState(st === "Todos" ? "todos" : st as any)}
                      className={`flex-1 min-w-[50px] text-center px-1.5 py-1 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all ${
                        filterState.toLowerCase() === (st === "Todos" ? "todos" : st).toLowerCase()
                          ? "bg-white text-slate-900 shadow-sm font-black border border-slate-200" 
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {st === "Aprobada" ? "Apro" : st === "Pendiente" ? "Pend" : st === "Observada" ? "Obs" : st === "Rechazada" ? "Rech" : st}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredRenditions.length === 0 ? (
                    <div className="text-center py-8 px-4 text-on-surface-variant font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No hay expedientes con este estado.
                    </div>
                  ) : (
                    filteredRenditions.map((rend) => (
                      <div 
                        key={rend.id}
                        onClick={() => setSelectedRendId(rend.id)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedRendId === rend.id 
                            ? "bg-primary-container/[0.04] border-primary shadow-sm font-semibold" 
                            : "bg-surface-container-low hover:bg-surface-container-high border-outline-variant/40"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-primary">{rend.folio}</span>
                          <div className="flex flex-col items-end gap-1 select-none">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              rend.status === "Aprobada" 
                                ? "bg-tertiary-fixed text-on-tertiary-fixed" 
                                : rend.status === "Observada" 
                                ? "bg-error-container text-error" 
                                : "bg-secondary-fixed text-primary"
                            }`}>
                              {rend.status}
                            </span>
                            <div className="flex flex-wrap gap-1 md:justify-end">
                              {rend.pagada && (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[7px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider scale-95 origin-right">
                                  Paid
                                </span>
                              )}
                              {rend.acmsStatus === "Ingresado" && (
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[7px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider scale-95 origin-right">
                                  ACMS
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-extrabold text-primary truncate mt-1.5">{rend.project}</p>
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant mt-2">
                          <span>{rend.department}</span>
                          <span className="font-mono font-black">${rend.totalAmount.toLocaleString("es-CL")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box Info compliance tips check list */}
              <div className="bg-secondary-fixed text-on-secondary-fixed p-5 rounded-2xl border border-secondary-fixed-dim/30 shadow-subtle select-none">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-primary mb-1">Criterios de Rendimiento</h5>
                    <p className="text-[11px] text-on-surface opacity-90 leading-relaxed">
                      El tesorero central revisará minuciosamente que cada boleta pertenezca a la actividad y cuente con el RUT legal de la iglesia adventista o el emisor directo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side detail workspace (Mockup 3 / 8 style) */}
            <div className="lg:col-span-8 space-y-6">
              
              {activeRend ? (
                <div className="bg-white rounded-2xl border border-outline-variant/60 shadow-sm p-6 sm:p-8 space-y-6 position-relative">
                  
                  {/* Top Bar Details */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-5 select-none text-left">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-container-high px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider text-primary">
                          Voto: {activeRend.id === "rend-1" ? "V-2024-05" : "Asignación Directa"}
                        </span>
                        <span className="text-xs text-outline font-medium">{activeRend.dateSent}</span>
                      </div>
                      <h2 className="text-xl font-black text-primary font-sans mt-2">{activeRend.folio} - {activeRend.project}</h2>
                    </div>
                    {/* Dynamic approved totals displayed when boletas are rejected */}
                    <div className="text-right select-none">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Total Declarado</span>
                      <span className={`text-base font-bold text-slate-500 font-mono block ${(() => {
                        const approvedSum = activeRend.items.filter(it => it.approved !== false).reduce((sum, it) => sum + it.amount, 0);
                        return approvedSum !== activeRend.totalAmount ? 'line-through' : '';
                      })()}`}>
                        ${activeRend.totalAmount.toLocaleString("es-CL")}
                      </span>
                      {(() => {
                        const approvedSum = activeRend.items.filter(it => it.approved !== false).reduce((sum, it) => sum + it.amount, 0);
                        if (approvedSum !== activeRend.totalAmount) {
                          return (
                            <div className="mt-1">
                              <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">Total Aprobado</span>
                              <span className="text-2xl font-black text-emerald-600 font-mono block">
                                ${approvedSum.toLocaleString("es-CL")}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Action/Control Bar for All Users (e.g., Printable PDF) */}
                  <div className="flex flex-wrap gap-2 pb-4 border-b border-outline-variant/20">
                    <button
                      type="button"
                      onClick={() => generateRealRendicionPDF(activeRend)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> Descargar PDF Digital (jsPDF)
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintRendicionPDF(activeRend)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> Imprimir Formato Físico (Navegador)
                    </button>

                    {mode === "gestion" && (
                      <>
                        {isEditingRend ? (
                          <>
                            <button
                              type="button"
                              onClick={saveRenditionEdits}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors animate-pulse"
                            >
                              <Check className="w-3.5 h-3.5" /> Guardar Edición
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingRend(false)}
                              className="px-3.5 py-2 bg-slate-500 hover:bg-slate-650 text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={startEditing}
                            className="px-3.5 py-2 bg-[#112435] hover:bg-[#1c374f] text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" /> Editar Rendición (Tesorero)
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Information block */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs border-b border-outline-variant/20 pb-5 select-none text-left">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Responsable del Gasto</p>
                      {isEditingRend ? (
                        <input
                          type="text"
                          value={editApplicant}
                          onChange={(e) => setEditApplicant(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-primary outline-none mt-1"
                        />
                      ) : (
                        <p className="font-extrabold text-primary mt-1">{activeRend.applicant}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Departamento</p>
                      {isEditingRend ? (
                        <select
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-primary outline-none mt-1"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="font-extrabold text-primary mt-1">{activeRend.department}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Actividad / Estado</p>
                      {isEditingRend ? (
                        <input
                          type="text"
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value)}
                          placeholder="Proyecto"
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-bold text-primary outline-none mt-1"
                        />
                      ) : (
                        <p className="font-extrabold text-[#112435] mt-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                          {activeRend.status}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Additional Metadata linkage row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs select-none text-left pb-1">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Voto de Junta Asociado</p>
                      <p className="font-extrabold text-slate-750 mt-1 flex items-center gap-1.5">
                        {activeRend.votoAsociadoId ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded inline-flex items-center gap-1 font-mono text-[10.5px]">
                            🗳️ {activeRend.votoAsociadoId}
                            {(() => {
                              const foundVoto = boardVotos?.find(v => v.id === activeRend.votoAsociadoId);
                              return foundVoto ? ` - ${foundVoto.descripcion.substring(0, 30)}...` : '';
                            })()}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium italic">Ningún Voto Asociado (Opcional)</span>
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Adelanto de Fondos Linkeado</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {activeRend.asociadaFondoId ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded inline-block font-mono text-[10.5px]">
                            📂 Folio {activeRend.asociadaFondoId}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium italic">Sin adelanto previo (Reembolso directo 100%)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Table Invoices Lines */}
                  <div className="text-left">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3.5 select-none">Boletas y Documentos Justificados</h3>
                    
                    <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
                      <table className="w-full text-left font-sans text-xs">
                        <thead className="bg-[#f8fafc] text-[10px] text-on-surface-variant font-bold uppercase border-b border-outline-variant/35">
                          <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Detalle / Documento</th>
                            <th className="px-4 py-3">Categoría</th>
                            <th className="px-4 py-3">RUT Proveedor</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                            <th className="px-4 py-3 text-center">Auditoría / Comprobante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {isEditingRend ? (
                            editItems.map((it) => (
                              <tr key={it.id} className="bg-amber-50/20">
                                <td className="px-2 py-2">
                                  <input
                                    type="date"
                                    value={it.date}
                                    onChange={(e) => updateEditItemField(it.id, "date", e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded p-1 font-mono font-bold text-primary text-[11px]"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="space-y-1">
                                    <select
                                      value={it.docType}
                                      onChange={(e) => updateEditItemField(it.id, "docType", e.target.value)}
                                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold"
                                    >
                                      {documentTypes.map(dt => (
                                        <option key={dt} value={dt}>{dt}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={it.description || ""}
                                      onChange={(e) => updateEditItemField(it.id, "description", e.target.value)}
                                      placeholder="Descripción de gasto"
                                      className="w-full bg-white border border-slate-300 rounded p-1 text-[11px]"
                                    />
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={it.category}
                                    onChange={(e) => updateEditItemField(it.id, "category", e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold"
                                  >
                                    {expenseCategories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={it.rut}
                                    onChange={(e) => updateEditItemField(it.id, "rut", e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded p-1 font-mono font-bold text-[11px]"
                                    placeholder="RUT Proveedor"
                                  />
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <input
                                    type="number"
                                    value={it.amount}
                                    onChange={(e) => updateEditItemField(it.id, "amount", parseFloat(e.target.value) || 0)}
                                    className="w-24 bg-white border border-slate-300 rounded p-1 text-right font-mono font-bold text-primary text-[11px]"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => deleteEditItem(it.id)}
                                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded shrink-0 transition-colors"
                                    title="Quitar esta línea de gasto"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            activeRend.items.map((it) => (
                              <tr key={it.id} className={`hover:bg-primary-container/[0.01] transition-all ${
                                it.approved === false ? "opacity-50 line-through bg-red-50/10" : ""
                              }`}>
                                <td className="px-4 py-3.5 font-bold text-on-surface-variant font-mono">{it.date}</td>
                                <td className="px-4 py-3.5">
                                  <div className="font-extrabold text-primary">{it.docType}: {it.description || "Gasto declarado"}</div>
                                  {it.approved === false && (
                                    <span className="bg-red-100 text-red-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 inline-block">
                                      ❌ Boleta Rechazada (No elegible para reembolso)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className="bg-surface-container-high text-primary font-bold px-2 py-0.5 rounded text-[10px]">
                                    {it.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-on-surface-variant font-medium">{it.rut}</td>
                                <td className="px-4 py-3.5 text-right font-mono font-bold text-primary">
                                  ${it.amount.toLocaleString("es-CL")}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {it.receiptUploaded ? (
                                      <button 
                                        type="button"
                                        onClick={() => setActiveReceiptUrl(it.receiptUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuA1byOPm4PZWJ1Th8WYr6yvmJiccPfF7IRBBPg__YmsLshS1_zu3553zuCh_WdAlhLQmrIzw46AFuUL64H43TdDvLs5WlVlRraZmVGCt-ZDhZwo17OWK1dSH3O_5XKri6wLtjJiUykqVTDTg0uhqdo6fSKzdZQIU3YhIY2vEHdQ9Cyfx9C4_k4l2bb80zFioL91mNpBe4K9kAmb3N9pcGx1XtoH-M3KT7kRvv5PvN4vwA70IpXRVTAY2R7187odpP4LrA8rAXBo3LzJ")}
                                        className="p-1 px-2.5 bg-secondary-fixed hover:bg-secondary-fixed/50 rounded text-secondary font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                                        title="Haz clic para ver la boleta real"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Ver boleta
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-error font-extrabold flex items-center justify-center gap-0.5">
                                        <AlertTriangle className="w-3 h-3" /> Sin archivo
                                      </span>
                                    )}

                                    {/* Action of Approve or Reject Single Receipt by Treasurer */}
                                    {mode === "gestion" && onUpdateRenditionFields && (
                                      <div className="flex gap-1 items-center border-l border-slate-200 pl-1.5 shrink-0 select-none">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedItems = activeRend.items.map(item => 
                                              item.id === it.id ? { ...item, approved: true } : item
                                            );
                                            onUpdateRenditionFields(activeRend.id, { items: updatedItems });
                                          }}
                                          className={`p-1 rounded transition-all cursor-pointer ${
                                            it.approved !== false 
                                              ? "bg-emerald-500 text-white font-bold scale-105" 
                                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
                                          }`}
                                          title="Aprobar esta boleta/documento"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedItems = activeRend.items.map(item => 
                                              item.id === it.id ? { ...item, approved: false } : item
                                            );
                                            onUpdateRenditionFields(activeRend.id, { items: updatedItems });
                                          }}
                                          className={`p-1 rounded transition-all cursor-pointer ${
                                            it.approved === false 
                                              ? "bg-red-500 text-white font-bold scale-105" 
                                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-800"
                                          }`}
                                          title="Rechazar esta boleta/documento"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {isEditingRend && (
                      <div className="flex justify-start px-2 py-2 bg-slate-50 border border-t-0 border-outline-variant/40 rounded-b-xl">
                        <button
                          type="button"
                          onClick={addEditItem}
                          className="px-3 py-1.5 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-[#112435] font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar Línea de Gasto en Edición
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Compliance Audit gallery section */}
                  <div className="pt-2 border-t border-outline-variant/30 text-left">
                    {/* Receipt images board thumbnail preview panel */}
                    <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/40 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black text-primary tracking-wider uppercase flex items-center gap-1.5 mb-2.5 select-none">
                          <ImageIcon className="w-4 h-4 text-secondary shrink-0" /> Galería de Comprobantes
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed mb-4">
                          Haga clic en cualquiera de estas boletas reales capturadas por el director para realizar zoom de inspección legible:
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <img 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1byOPm4PZWJ1Th8WYr6yvmJiccPfF7IRBBPg__YmsLshS1_zu3553zuCh_WdAlhLQmrIzw46AFuUL64H43TdDvLs5WlVlRraZmVGCt-ZDhZwo17OWK1dSH3O_5XKri6wLtjJiUykqVTDTg0uhqdo6fSKzdZQIU3YhIY2vEHdQ9Cyfx9C4_k4l2bb80zFioL91mNpBe4K9kAmb3N9pcGx1XtoH-M3KT7kRvv5PvN4vwA70IpXRVTAY2R7187odpP4LrA8rAXBo3LzJ" 
                          alt="Boleta de muestra 1"
                          onClick={() => setActiveReceiptUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuA1byOPm4PZWJ1Th8WYr6yvmJiccPfF7IRBBPg__YmsLshS1_zu3553zuCh_WdAlhLQmrIzw46AFuUL64H43TdDvLs5WlVlRraZmVGCt-ZDhZwo17OWK1dSH3O_5XKri6wLtjJiUykqVTDTg0uhqdo6fSKzdZQIU3YhIY2vEHdQ9Cyfx9C4_k4l2bb80zFioL91mNpBe4K9kAmb3N9pcGx1XtoH-M3KT7kRvv5PvN4vwA70IpXRVTAY2R7187odpP4LrA8rAXBo3LzJ")}
                          className="w-20 h-20 object-cover rounded-lg border border-outline-variant hover:scale-105 cursor-pointer shadow-sm transition-transform shrink-0"
                        />
                        <img 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTiyBIZ1q1M_0i_QP3ckq6sORWw_5AG45PvEJbK8DdSbsrymUBaEsev92YZB_9j1ejgUxB53vu38kpRDkOeks3HeHM17QI3OCegrkJqQhDhiQ03pAIxbs64SttdmUDMmAmLSzfZlJXV1QPTTFBEZ6DVjsbUxaYfskFvGfnzmm_dNRKIDGpqwpBjEee8XiIf1cMeWem5VTXMMMu5XdJ3Y4LI2DLi7RlOqgsjYopQyuno9vhZmiiR_N52tDGI7qOW3bh53rIV5rp6i5g" 
                          alt="Boleta de muestra 2"
                          onClick={() => setActiveReceiptUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuBTiyBIZ1q1M_0i_QP3ckq6sORWw_5AG45PvEJbK8DdSbsrymUBaEsev92YZB_9j1ejgUxB53vu38kpRDkOeks3HeHM17QI3OCegrkJqQhDhiQ03pAIxbs64SttdmUDMmAmLSzfZlJXV1QPTTFBEZ6DVjsbUxaYfskFvGfnzmm_dNRKIDGpqwpBjEee8XiIf1cMeWem5VTXMMMu5XdJ3Y4LI2DLi7RlOqgsjYopQyuno9vhZmiiR_N52tDGI7qOW3bh53rIV5rp6i5g")}
                          className="w-20 h-20 object-cover rounded-lg border border-outline-variant hover:scale-105 cursor-pointer shadow-sm transition-transform shrink-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Banking Transfer or Devolution Details Panel */}
                  {(activeRend.asociadaFondoId || activeRend.hasTransferDetails || activeRend.devolucionExcedenteUrl) && (
                    <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/40 mt-6 text-left text-xs space-y-4">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-outline-variant/30">
                        <Landmark className="w-4.5 h-4.5 text-secondary shrink-0" />
                        <h4 className="text-xs font-black text-primary tracking-wider uppercase font-sans">
                          Saldos, Devoluciones y Datos Bancarios
                        </h4>
                      </div>

                      {activeRend.asociadaFondoId && (
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/60 font-medium">
                          <p className="text-blue-900 font-bold mb-1">📂 Fondo Asociado: {activeRend.asociadaFondoId}</p>
                          {(() => {
                            const linkedFondo = fundRequests?.find(f => f.id === activeRend.asociadaFondoId);
                            if (linkedFondo) {
                              return (
                                <p className="text-gray-600 text-[11px] leading-relaxed">
                                  Monto del fondo adelantado: <strong className="text-gray-900 font-mono">${linkedFondo.amount.toLocaleString("es-CL")} CLP</strong><br />
                                  Monto total rendido: <strong className="text-gray-900 font-mono">${activeRend.totalAmount.toLocaleString("es-CL")} CLP</strong><br />
                                  Diferencia:{" "}
                                  <strong className={activeRend.totalAmount < linkedFondo.amount ? "text-amber-700" : activeRend.totalAmount > linkedFondo.amount ? "text-blue-700" : "text-emerald-700"}>
                                    ${(activeRend.totalAmount - linkedFondo.amount).toLocaleString("es-CL")} CLP
                                  </strong>
                                </p>
                              );
                            }
                            return <p className="text-gray-500 text-[10px]">Cargando detalles adicionales del adelanto...</p>;
                          })()}
                        </div>
                      )}

                      {activeRend.devolucionExcedenteUrl && (
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/65 flex flex-col gap-1 inline-block">
                          <span className="text-xs font-bold text-amber-900">📄 Comprobante de Devolución de Excedente:</span>
                          <span className="font-mono text-gray-700 font-bold select-all bg-white px-2 py-1 rounded inline-block mt-1 border border-amber-200">
                            {activeRend.devolucionExcedenteUrl}
                          </span>
                        </div>
                      )}

                      {activeRend.hasTransferDetails && (
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase text-secondary tracking-widest block">
                            💳 Datos para Transferencia Bancaria:
                          </span>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 bg-white p-4 rounded-xl border border-outline-variant/30 text-[11px] leading-snug">
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block">Destinatario</span>
                              <span className="font-bold text-primary">
                                {activeRend.recipientType === "director" ? "Director de Departamento" : "Otra Persona / Proveedor"}
                              </span>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <span className="text-[9px] text-gray-400 font-bold uppercase block">Nombre Completo</span>
                              <span className="font-bold text-primary select-all">{activeRend.recipientName || "No registrado"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block font-sans">RUT / Identificación</span>
                              <span className="font-bold text-primary font-mono select-all">{activeRend.recipientRut || "No registrado"}</span>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                              <span className="text-[9px] text-gray-400 font-bold uppercase block font-sans">Correo Electrónico</span>
                              <span className="font-bold text-primary select-all">{activeRend.recipientEmail || "No registrado"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block font-sans">Banco</span>
                              <span className="font-bold text-primary">{activeRend.bank || "No registrado"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block font-sans">Tipo Cuenta</span>
                              <span className="font-bold text-primary">{activeRend.accountType || "No registrado"}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block font-sans">N° de Cuenta</span>
                              <span className="font-bold text-primary font-mono select-all">{activeRend.accountNumber || "No registrado"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Controls for Treasurer Management (Association, Payment, ACMS) */}
                  {mode === "gestion" && onUpdateRenditionFields && (
                    <div className="bg-slate-50/70 p-5 rounded-2xl border border-outline-variant/40 space-y-4 text-xs text-left select-none mt-6">
                      <h4 className="text-xs font-black text-primary tracking-wider uppercase flex items-center gap-1.5 border-b border-outline-variant/30 pb-2">
                        🛡️ Gestión de Tesorería (Auditoría)
                      </h4>

                      {/* 1. ASOCIAR CON UN FONDO POR RENDIR */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider block">
                          📂 Vincular con Adelanto (Fondo por Rendir)
                        </label>
                        <select
                          value={activeRend.asociadaFondoId || ""}
                          onChange={(e) => {
                            onUpdateRenditionFields(activeRend.id, { asociadaFondoId: e.target.value || undefined });
                          }}
                          className="w-full bg-white border border-outline p-2 hover:border-secondary rounded outline-none font-semibold text-primary cursor-pointer text-xs transition-colors"
                        >
                          <option value="">-- Sin asociar --</option>
                          {fundRequests
                            .filter(req => req.department === activeRend.department)
                            .map(req => (
                              <option key={req.id} value={req.id}>
                                Folio: {req.id} - {req.applicant} (${req.amount.toLocaleString("es-CL")})
                              </option>
                            ))}
                        </select>
                        <p className="text-[9px] text-gray-500 leading-snug">Muestra exclusivamente adelantos de fondos asignados al departamento de {activeRend.department}.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* 2. MARCAR COMO PAGADA */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider block">
                            💵 Estado de Pago
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateRenditionFields(activeRend.id, { pagada: !activeRend.pagada });
                            }}
                            className={`w-full py-2.5 rounded-lg text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                              activeRend.pagada
                                ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                                : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100/50"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${activeRend.pagada ? "bg-emerald-600 animate-pulse" : "bg-red-600"}`} />
                            {activeRend.pagada ? "PAGADA" : "MARCAR PAGADA"}
                          </button>
                        </div>

                        {/* 3. CAMBIAR ESTADO REGISTRO SISTEMA ACMS */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant font-black uppercase tracking-wider block">
                            🖥️ Registro ACMS
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const nextACMS = (activeRend.acmsStatus || "Pendiente") === "Pendiente" ? "Ingresado" : "Pendiente";
                              onUpdateRenditionFields(activeRend.id, { acmsStatus: nextACMS });
                            }}
                            className={`w-full py-2.5 rounded-lg text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                              activeRend.acmsStatus === "Ingresado"
                                ? "bg-purple-100 text-[#301934] border-purple-300"
                                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/50"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${activeRend.acmsStatus === "Ingresado" ? "bg-purple-600 animate-pulse" : "bg-amber-600"}`} />
                            {activeRend.acmsStatus === "Ingresado" ? "INGRESADO" : "PENDIENTE"}
                          </button>
                        </div>
                      </div>

                      {/* Display Google Drive Folder if any */}
                      <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 font-medium">📁 Resguardo Drive:</span>
                        <a 
                          href={activeRend.comprobantesDriveUrl || `https://drive.google.com/drive/folders/tesoreria_rendiciones_${activeRend.department.toLowerCase().replace(/[^a-z0-9]/g, "_")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1e73e8] hover:text-[#1552a6] font-black hover:underline inline-flex items-center gap-1"
                        >
                          📂 Carpeta Google Drive
                        </a>
                      </div>

                    </div>
                  )}

                  {/* Auditing Actions Button Block only active for Pending records */}
                  {activeRend.status === "Pendiente" && mode !== "resumen" ? (
                    <div className="flex border-t border-outline-variant/30 pt-6 gap-4">
                      <button 
                        onClick={() => handleUpdateStatus("Aprobada")}
                        className="flex-1 h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 select-none shadow-md text-sm"
                      >
                        <Check className="w-5 h-5 text-tertiary-fixed-dim" />
                        Aprobar y Registrar Gasto
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus("Observada")}
                        className="bg-error-container text-on-error-container border border-error/20 px-6 h-12 rounded-xl font-bold hover:bg-error/15 active:scale-95 transition-all text-xs flex items-center gap-1.5 select-none"
                      >
                        <X className="w-4 h-4 text-error" />
                        Observar Rendición
                      </button>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl text-center font-bold text-xs border ${
                      activeRend.status === "Aprobada" 
                        ? "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary/20" 
                        : "bg-error-container text-error border-error/20"
                    }`}>
                      Esta rendición de gastos ya se resolvió bajo estado: {activeRend.status.toUpperCase()}
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white rounded-2xl border text-center p-8 text-on-surface-variant font-medium">
                  Por favor seleccione una rendición de la izquierda para desplegar sus detalles de auditoría.
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* VIEW 2: CREATE RENDITION WORKBENCH SHEET */}
        {activeTab === "crear" && (
          <motion.div 
            key="create-rendition-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Form Header details */}
            <div className="lg:col-span-8 bg-white border border-outline-variant/60 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              
              <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30 select-none">
                <FileCheck className="w-5 h-5 text-secondary shrink-0" />
                <h3 className="text-base font-black text-primary uppercase tracking-wider">Borrador de Rendición de Gastos</h3>
              </div>

              {/* Top metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Solicitante</label>
                  <input 
                    type="text"
                    value={newApplicant}
                    onChange={(e) => setNewApplicant(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Departamento</label>
                  <select 
                    value={newDept}
                    onChange={(e) => {
                      setNewDept(e.target.value);
                      setSelectedFondoId("");
                    }}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary text-[11px]"
                  >
                    {matchedDepts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider font-sans">Proyecto / Actividad</label>
                  <input 
                    type="text"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Asociar Fondo por Rendir</label>
                  <select
                    value={selectedFondoId}
                    onChange={(e) => {
                      setSelectedFondoId(e.target.value);
                      const linked = fundRequests.find(fr => fr.id === e.target.value);
                      if (linked) {
                        setNewProject(linked.description);
                      }
                    }}
                    className="w-full bg-surface border-secondary border rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary text-[11px]"
                  >
                    <option value="">-- Sin Fondo (Rendición Directa) --</option>
                    {fundRequests.filter(fr => fr.department === newDept && fr.status === "Aprobada").map((fr) => (
                      <option key={fr.id} value={fr.id}>
                        {fr.id} (${fr.amount.toLocaleString("es-CL")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Associated Vote dropdown */}
                <div className="space-y-1 col-span-1 font-sans">
                  <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Voto de Junta (Opcional)</label>
                  <select
                    value={selectedVotoAsociadoId}
                    onChange={(e) => setSelectedVotoAsociadoId(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary text-[11px]"
                  >
                    <option value="">-- Ninguno --</option>
                    {boardVotos?.map((voto) => (
                      <option key={voto.id} value={voto.id}>
                        {voto.id} - {voto.descripcion.substring(0, 24)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inline Table Row Draft Adder Form */}
              <div className="bg-[#f8fafc] rounded-xl p-4 border border-outline-variant/50 space-y-4">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-secondary shrink-0" /> Añadir Nueva Línea de Boleta
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                  
                  {/* Item Date */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">Fecha Gasto</span>
                    <input 
                      type="date" 
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none" 
                    />
                  </div>

                  {/* Item Category */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">Categoría</span>
                    <select 
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none cursor-pointer"
                    >
                      {expenseCategories.map((ec) => (
                        <option key={ec} value={ec}>{ec}</option>
                      ))}
                    </select>
                  </div>

                  {/* Doc Type */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">Tipo Doc.</span>
                    <select 
                      value={itemDocType}
                      onChange={(e) => setItemDocType(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none cursor-pointer"
                    >
                      {documentTypes.map((dt) => (
                        <option key={dt} value={dt}>{dt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Proveedor RUT */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">RUT Proveedor</span>
                    <input 
                      type="text" 
                      placeholder="e.g. 76.541.220-3"
                      value={itemRut}
                      onChange={(e) => setItemRut(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none font-mono" 
                    />
                  </div>

                  {/* Item amount */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">Monto ($)</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={itemAmount}
                      onChange={(e) => setItemAmount(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none font-bold" 
                    />
                  </div>

                  {/* Link with photo/comprobante dropdown */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-[#1e73e8] uppercase font-black">🔗 Vincular Foto</span>
                    <select 
                      value={itemReceiptUrl}
                      onChange={(e) => setItemReceiptUrl(e.target.value)}
                      className="w-full bg-white border border-blue-200 focus:border-blue-500 p-2 rounded outline-none cursor-pointer text-blue-700 font-extrabold"
                    >
                      <option value="">-- Sin Foto --</option>
                      {uploadedComprobantes.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Expense line details Description */}
                  <div className="col-span-1 sm:col-span-5 space-y-1">
                    <span className="text-[9px] text-on-surface-variant uppercase font-bold">Descripción del Documento / Producto</span>
                    <input 
                      type="text" 
                      placeholder="e.g. Compra de cebollas, tomates y ajíes para almuerzo campestre"
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      className="w-full bg-white border border-outline-variant p-2 rounded outline-none" 
                    />
                  </div>

                  <div className="col-span-1 flex items-end">
                    <button 
                      type="button"
                      onClick={handleAddDraftLine}
                      className="w-full h-10 bg-primary hover:bg-primary-container text-white rounded font-bold transition-all text-xs flex items-center justify-center gap-1 shadow select-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>

                </div>
              </div>

              {/* Draft table review rendering list */}
              <div className="border border-outline-variant/50 rounded-xl overflow-x-auto mt-4 text-xs font-sans">
                <table className="w-full text-left">
                  <thead className="bg-surface-container font-bold text-primary">
                    <tr>
                      <th className="px-4 py-2.5">Fecha</th>
                      <th className="px-4 py-2.5">Línea de Gasto / Detalle</th>
                      <th className="px-4 py-2.5">RUT</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                      <th className="px-4 py-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {draftItems.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-low/30">
                        <td className="px-4 py-3 font-semibold text-on-surface-variant">{item.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-primary">{item.docType}: {item.category}</div>
                          <span className="text-[10px] text-on-surface-variant block mt-0.5">{item.description}</span>
                          {item.receiptUrl && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-100">
                              🔗 Vinculado a: {item.receiptUrl}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-on-surface-variant">{item.rut}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                          ${item.amount.toLocaleString("es-CL")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            type="button"
                            onClick={() => handleRemoveDraftLine(item.id)}
                            className="p-1 px-2 hover:bg-error-container text-error rounded transition-colors"
                            title="Eliminar linea"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {draftItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-on-surface-variant font-semibold">
                          No has ingresado ninguna boleta a tu lista. Llena el panel de carga arriba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Devolution vs. Reimbursement bank details flow */}
              {(() => {
                const selectedFondo = fundRequests.find(fr => fr.id === selectedFondoId);
                if (selectedFondo) {
                  const diff = draftTotalSum - selectedFondo.amount;
                  if (diff < 0) {
                    return (
                      <div className="bg-amber-50 text-amber-950 p-5 rounded-2xl border border-amber-200 mt-4 space-y-3.5 text-left text-xs">
                        <span className="font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          ⚠️ EXCEDENTE DETECTADO A FAVOR DE LA IGLESIA
                        </span>
                        <p className="font-semibold leading-relaxed">
                          El total rendido (${draftTotalSum.toLocaleString("es-CL")} CLP) es menor al monto asignado en el Fondo por Rendir (${selectedFondo.amount.toLocaleString("es-CL")} CLP).
                          Debe devolver la diferencia de <strong className="text-amber-900 font-extrabold font-mono">${Math.abs(diff).toLocaleString("es-CL")} CLP</strong> a la cuenta de la iglesia y adjuntar el comprobante de devolución.
                        </p>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-black text-amber-800 block">Comprobante de Devolución del Excedente</label>
                          <input 
                            type="text"
                            placeholder="Ej: Comprobante_Devolucion_excedente.pdf"
                            value={devolucionExcedenteFile}
                            onChange={(e) => setDevolucionExcedenteFile(e.target.value)}
                            className="w-full bg-white border border-amber-300 rounded-lg p-2.5 font-bold outline-none text-amber-900 placeholder-amber-700/50"
                            required
                          />
                        </div>
                      </div>
                    );
                  } else if (diff === 0) {
                    return (
                      <div className="bg-emerald-50 text-emerald-950 p-5 rounded-2xl border border-emerald-200 mt-4 text-left text-xs">
                        <span className="font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                          ✅ SALDO JUSTO Y ALINEADO
                        </span>
                        <p className="font-semibold leading-relaxed mt-1">
                          El monto rendido coincide exactamente con el Fondo por Rendir solicitado (${selectedFondo.amount.toLocaleString("es-CL")} CLP). No se requiere devolución ni reembolso.
                        </p>
                      </div>
                    );
                  } else {
                    // diff > 0: Reimbursement details
                    return (
                      <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/60 shadow-inner mt-4 space-y-5 text-left text-xs">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/30 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-secondary shrink-0" />
                            <div>
                              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Datos de Transferencia para Reembolso del Excedente</h4>
                              <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                                Excedente a favor del solicitante: <strong className="text-primary font-mono">${diff.toLocaleString("es-CL")} CLP</strong>
                              </p>
                            </div>
                          </div>
                          {currentUser?.bankName && (
                            <button
                              type="button"
                              onClick={() => {
                                setBank(currentUser.bankName || "");
                                setAccountType(currentUser.accountType || "Cuenta Corriente");
                                setAccountNumber(currentUser.accountNumber || "");
                                setRecipientRut(currentUser.rut || "");
                                setRecipientName(currentUser.recipientName || currentUser.name || "");
                                setRecipientEmail(currentUser.email || "");
                                setRecipientType("director");
                              }}
                              className="text-[10px] font-black text-blue-750 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                              title="Pre-cargar mis datos bancarios de perfil"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-blue-650" />
                              Cargar mis datos
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          {/* Recipient Radio selectors */}
                          <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Destinatario de la Transferencia</label>
                            <div className="flex gap-4 select-none mt-1">
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                                <input 
                                  type="radio" 
                                  name="rend_destinatario_tipo_ex" 
                                  value="director"
                                  checked={recipientType === "director"}
                                  onChange={() => {
                                    setRecipientType("director");
                                  }}
                                  className="w-3.5 h-3.5 text-secondary border-outline-variant focus:ring-secondary" 
                                />
                                <span className="text-xs font-bold text-primary">Director (A mí)</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                                <input 
                                  type="radio" 
                                  name="rend_destinatario_tipo_ex" 
                                  value="otra_persona"
                                  checked={recipientType === "otra_persona"}
                                  onChange={() => {
                                    setRecipientType("otra_persona");
                                  }}
                                  className="w-3.5 h-3.5 text-secondary border-outline-variant focus:ring-secondary" 
                                />
                                <span className="text-xs font-bold text-primary">Otra persona / Entidad</span>
                              </label>
                            </div>
                          </div>

                          {/* Recipient Name */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Beneficiario</label>
                            <input 
                              type="text" 
                              value={recipientName}
                              onChange={(e) => setRecipientName(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary"
                              placeholder="Nombre completo o razón social de destino"
                              required
                            />
                          </div>

                          {/* Recipient Identifiers */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">RUT / Cédula de Identidad</label>
                            <input 
                              type="text" 
                              value={recipientRut}
                              onChange={(e) => setRecipientRut(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-mono text-primary outline-none focus:ring-1 focus:ring-secondary"
                              placeholder="e.g. 12.345.678-9"
                              required
                            />
                          </div>

                          {/* Recipient Email */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block font-sans">Correo Electrónico</label>
                            <input 
                              type="email" 
                              value={recipientEmail}
                              onChange={(e) => setRecipientEmail(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-primary outline-none focus:ring-1 focus:ring-secondary"
                              placeholder="ejemplo@correo.com"
                              required
                            />
                          </div>

                          {/* Bank name */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block font-sans">Banco</label>
                            <select 
                              value={bank}
                              onChange={(e) => setBank(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
                              required
                            >
                              <option value="">Seleccione un Banco</option>
                              {bankList.map((b) => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </div>

                          {/* Account type select */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Tipo de Cuenta</label>
                            <select 
                              value={accountType}
                              onChange={(e) => setAccountType(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary cursor-pointer border-outline-variant"
                            >
                              <option>Cuenta Corriente</option>
                              <option>Cuenta Vista</option>
                              <option>Cuenta Ahorro</option>
                              <option>Chequera Electrónica</option>
                              <option>Otro</option>
                            </select>
                          </div>

                          {/* Account number */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Número de Cuenta</label>
                            <input 
                              type="text" 
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-mono text-primary outline-none focus:ring-1 focus:ring-secondary tracking-wider"
                              placeholder="e.g. 192837465"
                              required
                            />
                          </div>

                        </div>
                      </div>
                    );
                  }
                } else {
                  // Direct Rendition (no linked fund) -> always request bank transfer details
                  return (
                    <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/60 shadow-inner mt-4 space-y-5 text-left text-xs">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-outline-variant/30 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Landmark className="w-5 h-5 text-secondary shrink-0" />
                          <div>
                            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Datos de Transferencia para Reembolso Directo de Gasto</h4>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 font-sans">
                              Monto total a transferir: <strong className="text-primary font-mono">${draftTotalSum.toLocaleString("es-CL")} CLP</strong>
                            </p>
                          </div>
                        </div>
                        {currentUser?.bankName && (
                          <button
                            type="button"
                            onClick={() => {
                              setBank(currentUser.bankName || "");
                              setAccountType(currentUser.accountType || "Cuenta Corriente");
                              setAccountNumber(currentUser.accountNumber || "");
                              setRecipientRut(currentUser.rut || "");
                              setRecipientName(currentUser.recipientName || currentUser.name || "");
                              setRecipientEmail(currentUser.email || "");
                              setRecipientType("director");
                            }}
                            className="text-[10px] font-black text-blue-750 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                            title="Pre-cargar mis datos bancarios de perfil"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-blue-650" />
                            Cargar mis datos
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Recipient Radio selectors */}
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Destinatario de la Transferencia</label>
                          <div className="flex gap-4 select-none mt-1">
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                              <input 
                                type="radio" 
                                name="rend_destinatario_tipo_dir" 
                                value="director"
                                checked={recipientType === "director"}
                                onChange={() => {
                                  setRecipientType("director");
                                }}
                                className="w-3.5 h-3.5 text-secondary border-outline-variant focus:ring-secondary" 
                              />
                              <span className="text-xs font-bold text-primary">Director (A mí)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors">
                              <input 
                                type="radio" 
                                name="rend_destinatario_tipo_dir" 
                                value="otra_persona"
                                checked={recipientType === "otra_persona"}
                                onChange={() => {
                                  setRecipientType("otra_persona");
                                }}
                                className="w-3.5 h-3.5 text-secondary border-outline-variant focus:ring-secondary" 
                              />
                              <span className="text-xs font-bold text-primary">Otra persona / Entidad</span>
                            </label>
                          </div>
                        </div>

                        {/* Recipient Name */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Nombre del Beneficiario</label>
                          <input 
                            type="text" 
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary"
                            placeholder="Nombre completo o razón social de destino"
                            required
                          />
                        </div>

                        {/* Recipient Identifiers */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">RUT / Cédula de Identidad</label>
                          <input 
                            type="text" 
                            value={recipientRut}
                            onChange={(e) => setRecipientRut(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-mono text-primary outline-none focus:ring-1 focus:ring-secondary"
                            placeholder="e.g. 12.345.678-9"
                            required
                          />
                        </div>

                        {/* Recipient Email */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block font-sans">Correo Electrónico</label>
                          <input 
                            type="email" 
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-primary outline-none focus:ring-1 focus:ring-secondary"
                            placeholder="ejemplo@correo.com"
                            required
                          />
                        </div>

                        {/* Bank name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block font-sans">Banco</label>
                          <select 
                            value={bank}
                            onChange={(e) => setBank(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
                            required
                          >
                            <option value="">Seleccione un Banco</option>
                            {bankList.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {/* Account type select */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Tipo de Cuenta</label>
                          <select 
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-secondary cursor-pointer border-outline-variant"
                          >
                            <option>Cuenta Corriente</option>
                            <option>Cuenta Vista</option>
                            <option>Cuenta Ahorro</option>
                            <option>Chequera Electrónica</option>
                            <option>Otro</option>
                          </select>
                        </div>

                        {/* Account number */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Número de Cuenta</label>
                          <input 
                            type="text" 
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="w-full bg-white border border-outline-variant rounded-lg p-2.5 font-mono text-primary outline-none focus:ring-1 focus:ring-secondary tracking-wider"
                            placeholder="e.g. 192837465"
                            required
                          />
                        </div>

                      </div>
                    </div>
                  );
                }
              })()}

              <div className="my-5 border-t border-outline-variant/30" />

              {/* DRAG & DROP FOR DRIVE COMPROBANTES */}
              <div className="space-y-3.5 bg-[#f5f9fd]/50 border border-blue-100 p-5 rounded-2xl select-none text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#1e73e8] flex items-center gap-1.5">
                  📁 Carpeta Google Drive de Tesorería (Sincronización Automática)
                </span>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Suba las boletas y facturas acá. Al enviar la rendición, el sistema creará automáticamente una subcarpeta en el Google Drive de Tesorería y las resguardará allí reglamentariamente.
                </p>

                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    comprobantesDragging ? "border-secondary bg-secondary-fixed/10" : "border-outline-variant bg-white"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setComprobantesDragging(true);
                  }}
                  onDragLeave={() => setComprobantesDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setComprobantesDragging(false);
                    const files = Array.from(e.dataTransfer.files).map((f: any) => f.name);
                    if (files.length > 0) {
                      setUploadedComprobantes(prev => [...prev, ...files]);
                    }
                  }}
                  onClick={() => {
                    // simulate explorer
                    const fileInput = document.getElementById("rend-file-explorer");
                    if (fileInput) fileInput.click();
                  }}
                >
                  <div className="space-y-2 text-xs cursor-pointer">
                    <span className="text-2xl block">📤</span>
                    <div>
                      <p className="font-extrabold text-primary">Arrastre y suelte sus comprobantes digitales (PDF, JPEG, PNG)</p>
                      <p className="text-[10px] text-[#2e86c1] font-bold mt-1">O haga clic para examinar archivos locales</p>
                    </div>
                    <input 
                      id="rend-file-explorer"
                      type="file" 
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files).map((f: any) => f.name);
                          setUploadedComprobantes(prev => [...prev, ...files]);
                        }
                      }} 
                    />
                  </div>
                </div>

                {uploadedComprobantes.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-[#1e73e8]">Comprobantes listos para Sincronizar ({uploadedComprobantes.length}):</span>
                    <ul className="space-y-1 bg-white p-3 rounded-lg border border-outline-variant divide-y divide-outline-variant/30 text-[11px] max-h-[140px] overflow-y-auto">
                      {uploadedComprobantes.map((name, idx) => (
                        <li key={idx} className="py-1.5 flex items-center justify-between">
                          <span className="font-bold text-primary">📄 {name}</span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedComprobantes(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-error font-black hover:underline"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="p-3 bg-emerald-50 text-[10px] text-emerald-950 font-medium rounded-lg border border-emerald-250 leading-relaxed">
                      ✅ Sincronización Lista. Al enviar la rendición se guardarán en la carpeta de Drive:
                      <span className="font-mono text-emerald-700 font-extrabold ml-1 block">Google Drive / Tesorería / Rendiciones / {newDept} /</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons footer drawer to submit overall rendition */}
              <div className="flex justify-end gap-3 border-t border-outline-variant/30 pt-5 select-none">
                <button 
                  type="button"
                  onClick={() => {
                    setDraftItems([]);
                    setActiveTab("bandeja");
                  }}
                  className="px-5 py-2.5 border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Descartar Borrador
                </button>
                <button 
                  type="button"
                  onClick={handleCreateRendition}
                  className="px-7 py-2.5 bg-secondary text-white rounded-xl text-xs font-black hover:bg-[#115096] shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Solicitud
                </button>
              </div>

            </div>

            {/* Right Column: Calculations sum card */}
            <div className="lg:col-span-4 bg-white border border-outline-variant/60 rounded-2xl p-6 shadow-sm space-y-6 select-none">
              <h4 className="text-xs font-black text-primary tracking-widest uppercase pb-2 border-b border-outline-variant/30">Cómputo Presupuestario</h4>
              
              <div className="space-y-4 font-sans text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant font-medium">Líneas Declaradas:</span>
                  <span className="font-extrabold text-primary">{draftItems.length} Boletas</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-b border-outline-variant/20 py-3">
                  <span className="text-on-surface-variant font-semibold">Total Acumulado:</span>
                  <span className="font-black text-primary font-mono text-base">${draftTotalSum.toLocaleString("es-CL")}</span>
                </div>
              </div>

              {/* Status compliance note info */}
              <div className="p-4 bg-error-container/15 text-error-container rounded-xl border border-error/10 flex gap-2 w-full text-xs">
                <AlertTriangle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                <p className="text-on-error-container font-semibold leading-relaxed">
                  Para el despacho oficial de esta rendición, declare de antemano el voto de junta que facultaba los egresos.
                </p>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* LIGHTBOX POPUP MODAL */}
      <AnimatePresence>
        {activeReceiptUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary-container/80 backdrop-blur-sm"
              onClick={() => setActiveReceiptUrl(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col items-center border border-outline-variant/40 z-10"
            >
              <div className="flex justify-between items-center w-full mb-3 border-b border-outline-variant/30 pb-2 select-none">
                <span className="text-xs font-black text-primary uppercase tracking-wider">Visualizador Comprobante Digital</span>
                <button 
                  onClick={() => setActiveReceiptUrl(null)}
                  className="p-1 hover:bg-surface-container rounded-full text-on-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full bg-[#f1f4f7] rounded-xl overflow-hidden p-2 flex items-center justify-center min-h-[300px] max-h-[450px]">
                <img 
                  src={activeReceiptUrl} 
                  alt="Receipt Coupon Zoomed" 
                  className="max-w-full max-h-[420px] object-contain rounded shadow-lg select-all"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-on-surface-variant font-medium select-none text-center">
                <Info className="w-4 h-4 text-secondary shrink-0" />
                <span>Documento emitido conforme a las exigencias fiscales electorales del SII Chile.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
