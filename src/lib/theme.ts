export interface BackgroundTheme {
  id: string;
  name: string;
  subtitle: string;
  category: 'cosmic' | 'neon' | 'nature' | 'warm' | 'stealth' | 'light';
  badge?: string;
  accentColor: string;
  secondaryAccent?: string;
  previewGradient: string;
  bgClass: string;
  canvasBg: string;
  headerBg: string;
  footerBg: string;
  sidebarBg: string;
  textColor: string;
  isLight?: boolean;
}

export const THEME_CATEGORIES = [
  { id: 'all', label: 'All Themes' },
  { id: 'cosmic', label: '🌌 Cosmic & Violet' },
  { id: 'neon', label: '⚡ Cyberpunk & Neon' },
  { id: 'nature', label: '🌿 Nature & Aurora' },
  { id: 'warm', label: '🔥 Solar & Warm' },
  { id: 'stealth', label: '🖤 OLED & Stealth' },
  { id: 'light', label: '☀️ Daytime Light' },
] as const;

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    id: 'midnight',
    name: 'Interstellar Nebula',
    subtitle: 'Deep celestial cosmos with ultraviolet stardust clouds & royal violet aura',
    category: 'cosmic',
    badge: 'Popular',
    accentColor: '#a855f7',
    secondaryAccent: '#6366f1',
    previewGradient: 'radial-gradient(ellipse at 80% 20%, #7c3aed 0%, #1e1b4b 50%, #060714 100%)',
    bgClass: 'theme-midnight',
    canvasBg: 'bg-[#060714]',
    headerBg: 'bg-[#060714]/85',
    footerBg: 'bg-[#060714]/90',
    sidebarBg: 'bg-[#0a0c20]',
    textColor: 'text-indigo-100',
  },
  {
    id: 'cyberpunk',
    name: 'Neo-Tokyo Cyberpunk',
    subtitle: 'High-voltage dystopian night with neon cyan lasers & hot fuchsia synthwave pulse',
    category: 'neon',
    badge: 'Electric',
    accentColor: '#06b6d4',
    secondaryAccent: '#f43f5e',
    previewGradient: 'linear-gradient(135deg, #090d16 0%, #083344 40%, #831843 85%, #050811 100%)',
    bgClass: 'theme-cyberpunk',
    canvasBg: 'bg-[#050811]',
    headerBg: 'bg-[#050811]/85',
    footerBg: 'bg-[#050811]/90',
    sidebarBg: 'bg-[#080d1a]',
    textColor: 'text-cyan-100',
  },
  {
    id: 'emerald',
    name: 'Emerald Borealis',
    subtitle: 'Enchanted evergreen abyss with vibrant bioluminescent mint & jade ribbons',
    category: 'nature',
    badge: 'Study Focus',
    accentColor: '#10b981',
    secondaryAccent: '#34d399',
    previewGradient: 'radial-gradient(ellipse at 50% -10%, #059669 0%, #064e3b 45%, #021a14 100%)',
    bgClass: 'theme-emerald',
    canvasBg: 'bg-[#02130e]',
    headerBg: 'bg-[#02130e]/85',
    footerBg: 'bg-[#02130e]/90',
    sidebarBg: 'bg-[#041d16]',
    textColor: 'text-emerald-50',
  },
  {
    id: 'solaris',
    name: 'Solar Flare & Dusk',
    subtitle: 'Incandescent molten golden sunburst, glowing amber embers & terracotta dusk',
    category: 'warm',
    badge: 'Warm Glow',
    accentColor: '#f59e0b',
    secondaryAccent: '#f97316',
    previewGradient: 'linear-gradient(135deg, #150a04 0%, #7c2d12 45%, #d97706 75%, #180802 100%)',
    bgClass: 'theme-solaris',
    canvasBg: 'bg-[#0f0703]',
    headerBg: 'bg-[#0f0703]/85',
    footerBg: 'bg-[#0f0703]/90',
    sidebarBg: 'bg-[#180d07]',
    textColor: 'text-amber-100',
  },
  {
    id: 'arctic',
    name: 'Glacial Aurora',
    subtitle: 'Oceanic sub-zero polar navy with shimmering glacial cyan & crystalline ripples',
    category: 'nature',
    badge: 'Cool Calm',
    accentColor: '#38bdf8',
    secondaryAccent: '#2dd4bf',
    previewGradient: 'radial-gradient(ellipse at 75% 15%, #0284c7 0%, #0369a1 40%, #02131e 100%)',
    bgClass: 'theme-arctic',
    canvasBg: 'bg-[#030e18]',
    headerBg: 'bg-[#030e18]/85',
    footerBg: 'bg-[#030e18]/90',
    sidebarBg: 'bg-[#051624]',
    textColor: 'text-sky-100',
  },
  {
    id: 'amethyst',
    name: 'Imperial Amethyst',
    subtitle: 'Royal velvet plum abyss with luminous amethyst crystal haze & gilded stardust',
    category: 'cosmic',
    badge: 'Regal',
    accentColor: '#c084fc',
    secondaryAccent: '#fbbf24',
    previewGradient: 'radial-gradient(ellipse at 50% 0%, #9333ea 0%, #581c87 50%, #0d0414 100%)',
    bgClass: 'theme-amethyst',
    canvasBg: 'bg-[#0a0310]',
    headerBg: 'bg-[#0a0310]/85',
    footerBg: 'bg-[#0a0310]/90',
    sidebarBg: 'bg-[#12071d]',
    textColor: 'text-purple-100',
  },
  {
    id: 'crimson',
    name: 'Blood Moon Eclipse',
    subtitle: 'Smoldering volcanic obsidian with deep ruby wine corona for high-intensity study sprints',
    category: 'warm',
    badge: 'High Focus',
    accentColor: '#f43f5e',
    secondaryAccent: '#e11d48',
    previewGradient: 'radial-gradient(ellipse at 65% 10%, #be123c 0%, #881337 50%, #0c0205 100%)',
    bgClass: 'theme-crimson',
    canvasBg: 'bg-[#0a0204]',
    headerBg: 'bg-[#0a0204]/85',
    footerBg: 'bg-[#0a0204]/90',
    sidebarBg: 'bg-[#140509]',
    textColor: 'text-rose-100',
  },
  {
    id: 'mariana',
    name: 'Abyssal Mariana',
    subtitle: 'Ultra-deep oceanic trench with bioluminescent sapphire-aquamarine hydro-flow',
    category: 'nature',
    badge: 'Deep Ocean',
    accentColor: '#3b82f6',
    secondaryAccent: '#06b6d4',
    previewGradient: 'radial-gradient(ellipse at 30% 20%, #1d4ed8 0%, #0f172a 60%, #020617 100%)',
    bgClass: 'theme-mariana',
    canvasBg: 'bg-[#020713]',
    headerBg: 'bg-[#020713]/85',
    footerBg: 'bg-[#020713]/90',
    sidebarBg: 'bg-[#050f22]',
    textColor: 'text-blue-100',
  },
  {
    id: 'obsidian',
    name: 'Onyx Quantum Matrix',
    subtitle: 'Absolute pitch-black OLED canvas with holographic micro-dot matrix & clean emerald pulse',
    category: 'stealth',
    badge: 'OLED Stealth',
    accentColor: '#10b981',
    secondaryAccent: '#64748b',
    previewGradient: 'radial-gradient(ellipse at 50% 0%, #18181b 0%, #09090b 60%, #030304 100%)',
    bgClass: 'theme-obsidian',
    canvasBg: 'bg-[#030304]',
    headerBg: 'bg-[#030304]/85',
    footerBg: 'bg-[#030304]/90',
    sidebarBg: 'bg-[#070709]',
    textColor: 'text-stone-200',
  },
  {
    id: 'slate',
    name: 'Cyber Titanium Grid',
    subtitle: 'Industrial dark slate with crisp architectural precision coordinate grid',
    category: 'stealth',
    badge: 'Architectural',
    accentColor: '#38bdf8',
    secondaryAccent: '#94a3b8',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #090d16 100%)',
    bgClass: 'theme-slate',
    canvasBg: 'bg-[#080d14]',
    headerBg: 'bg-[#080d14]/85',
    footerBg: 'bg-[#080d14]/90',
    sidebarBg: 'bg-[#0e1522]',
    textColor: 'text-slate-200',
  },
  {
    id: 'espresso',
    name: 'Kyoto Espresso Roast',
    subtitle: 'Rich dark cocoa roast with soothing warm candlelight brass & zero eye-fatigue',
    category: 'warm',
    badge: 'Cozy Study',
    accentColor: '#d97706',
    secondaryAccent: '#b45309',
    previewGradient: 'radial-gradient(ellipse at 50% 0%, #451a03 0%, #291004 60%, #0f0703 100%)',
    bgClass: 'theme-espresso',
    canvasBg: 'bg-[#0d0704]',
    headerBg: 'bg-[#0d0704]/85',
    footerBg: 'bg-[#0d0704]/90',
    sidebarBg: 'bg-[#150c07]',
    textColor: 'text-amber-100/90',
  },
  {
    id: 'oxford',
    name: 'Oxford Classical Parchment',
    subtitle: 'Warm ivory vellum paper, British racing green ink & timeless academic daytime readability',
    category: 'light',
    badge: 'Academic Light',
    accentColor: '#047857',
    secondaryAccent: '#b45309',
    previewGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fde68a 100%)',
    bgClass: 'theme-oxford',
    canvasBg: 'bg-[#fbf9f4]',
    headerBg: 'bg-[#fbf9f4]/90',
    footerBg: 'bg-[#fbf9f4]/90',
    sidebarBg: 'bg-[#f4efe4]',
    textColor: 'text-stone-900',
    isLight: true,
  },
  {
    id: 'porcelain',
    name: 'Lunar Studio Light',
    subtitle: 'Ultra-crisp architectural daylight canvas with precision slate glass & royal cobalt',
    category: 'light',
    badge: 'Modern Light',
    accentColor: '#2563eb',
    secondaryAccent: '#059669',
    previewGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
    bgClass: 'theme-porcelain',
    canvasBg: 'bg-[#f8fafc]',
    headerBg: 'bg-white/90',
    footerBg: 'bg-white/90',
    sidebarBg: 'bg-[#f1f5f9]',
    textColor: 'text-slate-800',
    isLight: true,
  },
];

export function getThemeById(themeId?: string): BackgroundTheme {
  // Graceful fallback for older alias names
  if (themeId === 'aurora') {
    return BACKGROUND_THEMES.find((t) => t.id === 'emerald') || BACKGROUND_THEMES[0];
  }
  return (
    BACKGROUND_THEMES.find((t) => t.id === themeId) ||
    BACKGROUND_THEMES[0]
  );
}

export function getUserStoredTheme(userEmail?: string): string {
  if (typeof window === 'undefined') return 'midnight';
  try {
    if (userEmail) {
      const userKey = `vortex_theme_${userEmail.toLowerCase().trim()}`;
      const saved = localStorage.getItem(userKey);
      if (saved && (BACKGROUND_THEMES.some((t) => t.id === saved) || saved === 'aurora')) {
        return saved === 'aurora' ? 'emerald' : saved;
      }
    }
    const globalSaved = localStorage.getItem('vortex_global_theme');
    if (globalSaved && (BACKGROUND_THEMES.some((t) => t.id === globalSaved) || globalSaved === 'aurora')) {
      return globalSaved === 'aurora' ? 'emerald' : globalSaved;
    }
  } catch {
    // fallback
  }
  return 'midnight';
}

export function setUserStoredTheme(themeId: string, userEmail?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (userEmail) {
      localStorage.setItem(`vortex_theme_${userEmail.toLowerCase().trim()}`, themeId);
    }
    localStorage.setItem('vortex_global_theme', themeId);
  } catch {
    // ignore
  }
}
