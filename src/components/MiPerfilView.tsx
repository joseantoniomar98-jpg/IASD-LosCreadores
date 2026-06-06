/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { 
  UserCheck, Mail, Phone, Lock, Eye, EyeOff, Save, CheckCircle2, 
  User as UserIcon, ShieldAlert, AlertCircle, Camera, Upload, Trash, Link,
  RefreshCw, Send, ShieldCheck, MailCheck, Globe
} from "lucide-react";
import { motion } from "motion/react";
import { 
  signInWithGoogle, logoutGoogle, getAccessToken, 
  getGoogleUserProfile, fetchRecentEmails, sendGmailEmail, GmailMessage 
} from "../googleAuth";

interface MiPerfilViewProps {
  currentUser: User;
  onUpdateProfile: (updatedUser: User) => void;
}

export const MiPerfilView: React.FC<MiPerfilViewProps> = ({ 
  currentUser, 
  onUpdateProfile 
}) => {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [password, setPassword] = useState(currentUser.password || "•••••••••");
  const [imageUrl, setImageUrl] = useState(currentUser.imageUrl || "");
  
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [googleProfile, setGoogleProfile] = useState<any>(getGoogleUserProfile());
  const [googleConnected, setGoogleConnected] = useState<boolean>(!!getAccessToken());
  const [recentEmails, setRecentEmails] = useState<GmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false);
  
  // Custom test mail form states
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testBody, setTestBody] = useState("");
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  React.useEffect(() => {
    const checkConn = () => {
      const tokenExists = !!getAccessToken();
      setGoogleConnected(tokenExists);
      if (tokenExists) {
        setGoogleProfile(getGoogleUserProfile());
        loadInbox();
      }
    };
    checkConn();
  }, []);

  const loadInbox = async () => {
    setIsLoadingEmails(true);
    try {
      const mails = await fetchRecentEmails();
      setRecentEmails(mails);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleConnected(true);
        setGoogleProfile(getGoogleUserProfile());
        // Load messages
        const mails = await fetchRecentEmails();
        setRecentEmails(mails);
      }
    } catch (err) {
      console.error("No se pudo conectar:", err);
      alert("Error al conectar cuenta de Google.");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (window.confirm("¿Seguro que desea desconectar su cuenta de Google / Gmail?")) {
      await logoutGoogle();
      setGoogleConnected(false);
      setGoogleProfile(null);
      setRecentEmails([]);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTo.trim() || !testSubject.trim() || !testBody.trim()) {
      alert("Por favor complete todos los campos para el correo de prueba.");
      return;
    }
    setTestEmailStatus("sending");
    const success = await sendGmailEmail(testTo, testSubject, `<p>${testBody.replace(/\n/g, "<br>")}</p>`);
    if (success) {
      setTestEmailStatus("success");
      setTestTo("");
      setTestSubject("");
      setTestBody("");
      setTimeout(() => setTestEmailStatus("idle"), 4000);
    } else {
      setTestEmailStatus("error");
      setTimeout(() => setTestEmailStatus("idle"), 4000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSavedSuccess(false);

    if (!name.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Debe ingresar un correo electrónico institucional válido.");
      return;
    }

    // Call callback to persist changes
    const updated: User = {
      ...currentUser,
      name,
      email,
      phone,
      password: password === "•••••••••" ? currentUser.password : password,
      imageUrl: imageUrl || undefined,
      avatarLetter: name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
    };

    onUpdateProfile(updated);
    setSavedSuccess(true);
    
    // Clear banner after 4 seconds
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-6 font-sans text-left select-none">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-black text-primary tracking-tight">
            Ajustes de Perfil Personal
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Modifique sus datos personales de contacto y actualice su contraseña de acceso institucional.
          </p>
        </div>
        
        {/* User Identity Indicator */}
        <div className="flex items-center gap-3 bg-surface-container-low p-2 px-4 rounded-full border border-outline-variant/30 text-xs shadow-sm self-start md:self-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-gray-400 font-bold">Sesión como:</span>
          <span className="font-extrabold text-primary">{currentUser.roles.join(", ")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Photo Mascot Info banner */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-outline-variant/60 shadow-sm p-6 text-center space-y-5">
            
            <div className="flex flex-col items-center space-y-4">
              
              {/* Profile Image with Camera Overlay option */}
              <div className="relative group select-none">
                <div className="w-28 h-28 rounded-full bg-[#1552a6]/10 text-primary text-3xl font-black flex items-center justify-center border-4 border-slate-50 shadow-md overflow-hidden relative transition-all">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[#102435] font-black">{name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "U"}</span>
                  )}
                </div>

                <label className="absolute bottom-1 right-1 bg-primary hover:bg-slate-850 text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-white" title="Subir foto de perfil">
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* URL and Delete Actions */}
              <div className="w-full text-center space-y-2 select-none">
                <h3 className="text-base font-black text-primary truncate w-full">{name || currentUser.name}</h3>
                <p className="text-slate-500 font-medium text-xs mt-1">{email || currentUser.email}</p>

                <div className="flex flex-col items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-2">
                  <span className="text-[9px] text-[#112435] font-bold uppercase tracking-wider block text-left w-full mb-1">
                    📂 Cargar o pegar enlace de foto:
                  </span>
                  <div className="w-full flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
                    <span className="p-1 px-1.5 text-slate-400 flex items-center">
                      <Link className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="url" 
                      placeholder="https://ejemplo.com/mifoto.jpg" 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      className="w-full bg-transparent text-[10.5px] font-mono text-primary outline-none"
                    />
                  </div>
                  
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-[10px] text-red-600 hover:text-red-800 font-black uppercase tracking-wider flex items-center gap-1 mt-1.5 transition-colors hover:underline cursor-pointer"
                    >
                      <Trash className="w-3 h-3" /> Quitar Foto de Perfil
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant/30 pt-4 text-xs space-y-2.5 text-left bg-slate-50/50 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-secondary tracking-widest block">Roles y Atribuciones:</span>
              <div className="space-y-1 text-primary">
                <p className="leading-snug">
                  • <strong className="font-extrabold">Cargos asignados:</strong> {currentUser.roles.join(", ")}
                </p>
                <p className="leading-snug">
                  • <strong className="font-extrabold">Departamentos:</strong> {currentUser.departments.length > 0 ? currentUser.departments.join(", ") : "Ninguno asignado"}
                </p>
                {currentUser.miembroDeJunta && (
                  <p className="text-emerald-700 font-bold leading-snug">
                    • Miembro oficial de la Junta Directiva Distrital
                  </p>
                )}
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-[10px] text-amber-900 border border-amber-100 flex gap-2 mt-4 leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  <strong>Nota Administrativa:</strong> Su rol directivo, privilegios y asignación de fondos de tesorería son de lectura exclusivamente. Solicite modificaciones al Administrador de Junta.
                </span>
              </div>
            </div>

          </div>

          {/* Tarjeta de Integración de Google / Gmail */}
          <div className="bg-white rounded-3xl border border-outline-variant/60 shadow-sm p-6 space-y-4 text-left select-none">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
              <span className="p-1.5 bg-[#db4437]/10 text-[#db4437] rounded-lg">
                <Globe className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-primary uppercase tracking-wide">Vinculación Gmail</h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Conexión Google Workspace</span>
              </div>
            </div>

            {!googleConnected ? (
              <div className="space-y-3.5 pt-1">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Para habilitar notificaciones por correo de tesorería, actas, y recordatorios automáticos reales, vincule su cuenta de correo institucional o personal de Google.
                </p>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="bg-slate-50 border border-slate-200 hover:border-slate-350 hover:bg-slate-100 p-2.5 rounded-xl w-full cursor-pointer flex justify-center items-center gap-2 transition-all"
                >
                  <div className="w-4 h-4">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="text-slate-700 font-extrabold text-[11px] font-sans">Vincular con Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {/* Profile row */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                  {googleProfile?.picture ? (
                    <img src={googleProfile.picture} alt="Avatar de Google" className="w-10 h-10 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#EA4335]/10 text-[#EA4335] text-xs font-black flex items-center justify-center">
                      <MailCheck className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-primary truncate leading-tight">{googleProfile?.name || "Usuario Google"}</p>
                    <p className="text-[10px] text-slate-500 font-bold truncate leading-tight mt-0.5">{googleProfile?.email || currentUser.email}</p>
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-600 font-extrabold uppercase tracking-wide">
                      <ShieldCheck className="w-3 h-3" /> Estado: Conectado
                    </div>
                  </div>
                </div>

                {/* Inbox Preview / Recent Emails */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                    <span className="text-[10px] font-extrabold text-[#1552a6] uppercase tracking-wider block">Bandeja Gmail (Recientes)</span>
                    <button 
                      type="button"
                      onClick={loadInbox} 
                      disabled={isLoadingEmails}
                      className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                      title="Refrescar correos"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto divide-y divide-slate-150 pr-0.5">
                    {recentEmails.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-4">Bandeja vacía o cargando correos...</p>
                    ) : (
                      recentEmails.map((email) => (
                        <div key={email.id} className="pt-2 first:pt-0 text-left">
                          <p className="text-[10px] text-slate-500 font-bold leading-none truncate">{email.from}</p>
                          <p className="text-[10px] font-extrabold text-primary leading-tight mt-1 truncate">{email.subject}</p>
                          <p className="text-[9px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{email.snippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Test Email Form */}
                <form onSubmit={handleSendTestEmail} className="bg-slate-50 border border-slate-250 p-3.5 rounded-2xl space-y-3">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Enviar Correo de Prueba (Real)</span>
                  
                  <div className="space-y-1.5">
                    <input 
                      type="email" 
                      placeholder="Destinatario"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-[10px] rounded-lg outline-none font-bold text-primary focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      placeholder="Asunto"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      className="w-full bg-white border border-slate-200 p-2 text-[10px] rounded-lg outline-none font-bold text-primary focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <textarea 
                      placeholder="Mensaje o texto..."
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 p-2 text-[10.5px] rounded-lg outline-none font-medium text-slate-700 resize-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testEmailStatus === "sending"}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" /> 
                    {testEmailStatus === "sending" ? "Enviando..." : "Enviar Correo Conectado"}
                  </button>

                  {testEmailStatus === "success" && (
                    <p className="text-[9.5px] text-emerald-600 font-extrabold text-center bg-emerald-50 border border-emerald-200 p-1 rounded-md animate-fade-in">
                      ¡Correo enviado con éxito! Revise su bandeja.
                    </p>
                  )}

                  {testEmailStatus === "error" && (
                    <p className="text-[9.5px] text-red-600 font-extrabold text-center bg-red-50 border border-red-200 p-1 rounded-md animate-fade-in">
                      Error al enviar. Intente reconectar su cuenta.
                    </p>
                  )}
                </form>

                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="w-full py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Desconectar Cuenta Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Primary interactive form */}
        <div className="lg:col-span-8 space-y-6">
          
          {savedSuccess && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <strong className="font-extrabold">¡Perfil Actualizado Exitosamente!</strong>
                <p className="mt-0.5">Los cambios se han guardado en su sesión y se han propagado exitosamente por todo el sistema.</p>
              </div>
            </motion.div>
          )}

          {errorMsg && (
            <div className="bg-red-50 text-red-900 border border-red-200 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-650 shrink-0" />
              <span className="text-xs font-semibold">{errorMsg}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 sm:p-8">
            <h4 className="text-sm font-black text-primary uppercase tracking-wider border-b border-outline-variant/35 pb-3 mb-6 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-secondary shrink-0" /> Editar Datos Personales
            </h4>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest pl-0.5 block">Nombre Completo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 bg-white border border-outline rounded-xl font-extrabold text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                      placeholder="Ingrese su nombre"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest pl-0.5 block">Correo Electrónico Institucional</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 bg-white border border-outline rounded-xl font-extrabold text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                      placeholder="correo@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                {/* Phone contact */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest pl-0.5 block">Móvil / Datos de Contacto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 bg-white border border-outline rounded-xl font-extrabold text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>

                {/* Secure Password change */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest pl-0.5 block">Nueva Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-9 pr-10 bg-white border border-outline rounded-xl font-black text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all tracking-wide"
                      placeholder="Contraseña segura"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-outline-variant/35 flex justify-end">
                <button
                  type="submit"
                  className="p-3 px-6 bg-primary hover:bg-slate-850 text-white rounded-xl font-black shadow-md shadow-primary/10 transition-all flex items-center gap-2 cursor-pointer outline-none"
                >
                  <Save className="w-4 h-4" /> Guardar Cambios de Perfil
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
