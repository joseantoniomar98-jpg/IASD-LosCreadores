/**
 * Utility functions for colors and dynamic mappings
 */

export function getDepartmentColorClasses(deptName: string): {
  bg: string;
  border: string;
  text: string;
  borderLeft: string;
  dot: string;
  badge: string;
} {
  const name = (deptName || "Todos").toLowerCase();
  if (name.includes("joven") || name.includes("conquistadores")) {
    return {
      bg: "bg-amber-50 hover:bg-amber-100/50",
      border: "border-amber-200",
      text: "text-amber-800",
      borderLeft: "border-l-4 border-amber-500",
      dot: "bg-amber-500",
      badge: "bg-amber-100/80 text-amber-900 border border-amber-200",
    };
  }
  if (name.includes("infantil") || name.includes("niño")) {
    return {
      bg: "bg-pink-50 hover:bg-pink-100/50",
      border: "border-pink-200",
      text: "text-pink-800",
      borderLeft: "border-l-4 border-pink-500",
      dot: "bg-pink-500",
      badge: "bg-pink-100/80 text-pink-900 border border-pink-200",
    };
  }
  if (name.includes("tesorer") || name.includes("contabilidad") || name.includes("finan") || name.includes("caja")) {
    return {
      bg: "bg-emerald-50 hover:bg-emerald-100/50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      borderLeft: "border-l-4 border-emerald-500",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100/80 text-emerald-900 border border-emerald-200",
    };
  }
  if (name.includes("publicaciones") || name.includes("secretar") || name.includes("junta")) {
    return {
      bg: "bg-violet-50 hover:bg-violet-100/50",
      border: "border-violet-200",
      text: "text-violet-800",
      borderLeft: "border-l-4 border-violet-500",
      dot: "bg-violet-500",
      badge: "bg-violet-100/80 text-violet-900 border border-violet-200",
    };
  }
  if (name.includes("familia") || name.includes("mujeres") || name.includes("acción")) {
    return {
      bg: "bg-rose-50 hover:bg-rose-100/50",
      border: "border-rose-200",
      text: "text-rose-800",
      borderLeft: "border-l-4 border-rose-500",
      dot: "bg-rose-500",
      badge: "bg-rose-100/80 text-rose-900 border border-rose-200",
    };
  }
  if (name.includes("evangelismo") || name.includes("pastor") || name.includes("misión") || name.includes("personal")) {
    return {
      bg: "bg-sky-50 hover:bg-sky-100/50",
      border: "border-sky-200",
      text: "text-sky-800",
      borderLeft: "border-l-4 border-sky-500",
      dot: "bg-sky-500",
      badge: "bg-sky-100/80 text-sky-900 border border-sky-200",
    };
  }
  if (name.includes("música") || name.includes("alabanza")) {
    return {
      bg: "bg-indigo-50 hover:bg-indigo-100/50",
      border: "border-indigo-200",
      text: "text-indigo-800",
      borderLeft: "border-l-4 border-indigo-500",
      dot: "bg-indigo-500",
      badge: "bg-indigo-100/80 text-indigo-900 border border-indigo-200",
    };
  }
  if (name.includes("todos") || name.includes("general") || name.includes("iglesia")) {
    return {
      bg: "bg-slate-50 hover:bg-slate-100/50",
      border: "border-slate-200",
      text: "text-slate-800",
      borderLeft: "border-l-4 border-[#1552a6]",
      dot: "bg-[#1552a6]",
      badge: "bg-slate-100 text-slate-900 border border-slate-200",
    };
  }

  // Fallback beautiful church blue/teal
  return {
    bg: "bg-blue-50/70 hover:bg-blue-100/50",
    border: "border-blue-200",
    text: "text-blue-800",
    borderLeft: "border-l-4 border-blue-500",
    dot: "bg-blue-500",
    badge: "bg-blue-100/80 text-blue-900 border border-blue-200",
  };
}
