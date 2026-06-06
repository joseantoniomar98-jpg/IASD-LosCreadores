/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, UserRole } from "../types";
import { BRAND_LOGO, USERS_SEED } from "../data";
import { KeyRound, Mail, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  users?: User[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, users = [] }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(""); // Default to empty
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // States for interactive recovery modal
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const activeUsers = users && users.length > 0 ? users : USERS_SEED;

  const normalizedEmail = email.trim().toLowerCase();
  const matchedUsers = activeUsers.filter(u => u.email.toLowerCase() === normalizedEmail);

  // Keep selectedUserId synchronized on email input changes safely
  useEffect(() => {
    if (matchedUsers.length > 0) {
      const exists = matchedUsers.some(u => u.id === selectedUserId);
      if (!exists) {
        setSelectedUserId(matchedUsers[0].id);
      }
    } else {
      setSelectedUserId("");
    }
  }, [email, matchedUsers]);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Debe ingresar su correo electrónico.");
      return;
    }
    if (!password) {
      setErrorMsg("Debe ingresar su contraseña.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    setTimeout(() => {
      const currentNormalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();

      const possibleUsers = activeUsers.filter(u => u.email.toLowerCase() === currentNormalizedEmail);

      if (possibleUsers.length === 0) {
        setErrorMsg("El correo ingresado no está registrado en el sistema.");
        setSubmitting(false);
        return;
      }

      // Check password matches (all seed users currently have "Iasd12345")
      const matches = possibleUsers.filter(u => u.password === normalizedPassword);
      if (matches.length === 0) {
        setErrorMsg("Contraseña incorrecta. Verifique sus credenciales.");
        setSubmitting(false);
        return;
      }

      // Authenticate matching user
      let finalUser = matches[0];
      if (matches.length > 1) {
        const selected = matches.find(u => u.id === selectedUserId);
        if (selected) {
          finalUser = selected;
        }
      }

      onLoginSuccess(finalUser);
      setSubmitting(false);
    }, 800);
  };

  const handlePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;
    setRecoveryError("");

    const userMatched = activeUsers.find(u => u.email.toLowerCase() === recoveryEmail.trim().toLowerCase());
    if (!userMatched) {
      setRecoveryError("El correo no se encuentra registrado en el sistema directivo.");
      return;
    }

    setRecoveryLoading(true);
    setTimeout(() => {
      setRecoveryLoading(false);
      setRecoverySuccess(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Absolute decorative design blobs matching material themes */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

      {/* Main Container Card frame */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="bg-white rounded-3xl overflow-hidden shadow-[0px_8px_32px_rgba(0,48,94,0.03)] border border-slate-200 max-w-md w-full p-6 sm:p-10 relative z-10"
      >
        
        {/* Top Logo and labels */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8 select-none">
          <img 
            src={BRAND_LOGO} 
            alt="IASD Logo" 
            className="w-16 h-16 object-contain drop-shadow" 
          />
          <div>
            <h1 className="text-xl font-sans font-black text-primary leading-tight tracking-[0.1px]">
              Iglesia Adventista del Séptimo Día - Los Creadores
            </h1>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1.5 pl-0.5">
              Distrito Temuco Norponiente
            </p>
          </div>
        </div>

        {/* Warning messages */}
        {errorMsg && (
          <div className="bg-error-container text-on-error-container p-3.5 rounded-xl flex items-center gap-2.5 mb-5 select-none text-xs border border-error/15">
            <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
        )}

        {/* Login form sheet */}
        <form onSubmit={handleFormLogin} className="space-y-5 text-sm">
          
          {/* Email input */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-0.5 block">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                placeholder="tesorero@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-outline/50 bg-white font-extrabold text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                required
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center pl-0.5 select-none">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
                Contraseña
              </label>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setShowRecoveryModal(true); }}
                className="text-[10px] font-bold text-secondary hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
                <KeyRound className="w-4 h-4" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-10 pr-10 rounded-xl border border-outline/50 bg-white font-black text-primary text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all tracking-wider"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* DYNAMIC SHIELD SELECTOR: Only displayed if the typed email is shared by multiple users */}
          {matchedUsers.length > 1 && (
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-0.5 block flex items-center gap-1 cursor-help" title="Múltiples de sus oficiales comparten esta cuenta institucional, seleccione su perfil para ingresar">
                Perfil / Cargo Directivo <span className="text-[10px] text-secondary font-black capitalize">(Cuenta compartida)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">
                  <Shield className="w-4 h-4" />
                </span>
                <select 
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-outline/50 bg-white text-xs outline-none font-bold text-primary cursor-pointer appearance-none"
                >
                  {matchedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — ({u.roles.join(", ")})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Actions button submit */}
          <button 
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-primary hover:bg-slate-850 active:scale-98 transition-all text-white font-extrabold rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 select-none outline-none cursor-pointer"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              "Ingresar al Portal"
            )}
          </button>

        </form>

        {/* Informative credentials hints for the user */}
        <div className="mt-8 pt-5 border-t border-outline-variant/35 bg-surface-container-low/20 rounded-xl p-3.5 text-left">
          <p className="text-[10px] font-black uppercase text-secondary tracking-widest mb-1 pl-0.5">Acceso al Sistema</p>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Estimado hermano, ingrese con sus datos de acceso, su correo personal y su clave de ingreso.
          </p>
        </div>

      </motion.div>

      {/* Recover Password Modal Overlay */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 max-w-sm w-full p-6 relative"
          >
            <h3 className="text-lg font-sans font-black text-primary mb-2">Recuperar Contraseña</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Ingrese su correo institucional o personal para recibir las instrucciones de restablecimiento.
            </p>

            {recoverySuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-800">¡Enlace Enviado con Éxito!</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hemos enviado un enlace de recuperación de prueba a <strong className="text-slate-700">{recoveryEmail}</strong>.
                  </p>
                  <div className="bg-slate-50 border border-slate-200/65 rounded-lg p-2.5 mt-3 text-left">
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Clave de Acceso Actual</p>
                    <code className="text-xs font-mono font-bold bg-white text-emerald-600 px-1.5 py-0.5 rounded border border-slate-100 select-all block text-center">
                      {activeUsers.find(u => u.email.toLowerCase() === recoveryEmail.trim().toLowerCase())?.password || "Iasd12345"}
                    </code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setRecoverySuccess(false);
                    setRecoveryEmail("");
                    setRecoveryError("");
                  }}
                  className="w-full h-10 bg-primary hover:bg-slate-800 text-white font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Entendido, volver
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider pl-0.5 block">
                    Correo del Hermano
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@google.com"
                    value={recoveryEmail}
                    onChange={(e) => {
                      setRecoveryEmail(e.target.value);
                      if (recoveryError) setRecoveryError("");
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-outline/50 bg-white font-extrabold text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
                  />
                  {recoveryError && (
                    <p className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1 select-none">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{recoveryError}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryModal(false);
                      setRecoveryError("");
                    }}
                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 h-11 bg-secondary text-white font-extrabold rounded-xl text-xs transition-colors shadow-md shadow-secondary/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {recoveryLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
