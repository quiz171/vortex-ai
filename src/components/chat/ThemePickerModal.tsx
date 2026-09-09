import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Sun, Moon, Zap, Shield, Compass } from 'lucide-react';
import { BACKGROUND_THEMES, BackgroundTheme, THEME_CATEGORIES } from '../../lib/theme';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
}

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const currentTheme =
    BACKGROUND_THEMES.find((t) => t.id === currentThemeId) || BACKGROUND_THEMES[0];

  const filteredThemes =
    activeCategory === 'all'
      ? BACKGROUND_THEMES
      : BACKGROUND_THEMES.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel border border-white/15 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] text-stone-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#0c0c10]/95 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/15"
              style={{
                background: `linear-gradient(135deg, ${currentTheme.accentColor}33, ${currentTheme.secondaryAccent || currentTheme.accentColor}22)`,
                color: currentTheme.accentColor,
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Captivating Themes & Atmosphere</span>
              </h2>
              <p className="text-xs text-stone-400">
                Immersive, high-contrast study environments crafted for focus and long sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close theme modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-5 py-2.5 border-b border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {THEME_CATEGORIES.map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isCatActive
                    ? 'bg-white text-black shadow-sm font-bold scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white border border-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Active Theme Spotlight Banner */}
        <div className="px-5 pt-4 shrink-0">
          <div
            className="p-3.5 rounded-2xl border border-white/15 relative overflow-hidden shadow-lg transition-all"
            style={{
              background: currentTheme.previewGradient,
            }}
          >
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20">
                    Active Study Theme
                  </span>
                  {currentTheme.badge && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs"
                      style={{
                        backgroundColor: currentTheme.accentColor,
                        color: currentTheme.isLight ? '#000000' : '#ffffff',
                      }}
                    >
                      {currentTheme.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-sm">
                  {currentTheme.name}
                </h3>
                <p className="text-xs text-white/80 max-w-md drop-shadow-xs line-clamp-1">
                  {currentTheme.subtitle}
                </p>
              </div>

              {/* Mini Mockup Visualizer */}
              <div className="flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-[11px] text-stone-200">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
                  style={{ backgroundColor: currentTheme.accentColor }}
                />
                <span className="font-mono text-xs font-semibold">
                  {currentTheme.isLight ? 'Daylight Light Mode' : 'Immersive Dark Mode'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme List Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredThemes.map((theme: BackgroundTheme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-[0.99] ${
                    isSelected
                      ? 'border-white/40 bg-white/[0.08] shadow-xl'
                      : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                  style={{
                    boxShadow: isSelected
                      ? `0 0 0 1.5px ${theme.accentColor}, 0 8px 24px -4px ${theme.accentColor}44`
                      : undefined,
                  }}
                >
                  {/* Visual Theme Preview Mockup Card */}
                  <div
                    className="h-20 w-full rounded-xl mb-3 border border-white/15 shadow-inner relative overflow-hidden p-2 flex flex-col justify-between"
                    style={{ background: theme.previewGradient }}
                  >
                    {/* Top Simulated App Bar */}
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            color: theme.isLight ? '#1c1917' : '#f8fafc',
                          }}
                        >
                          {theme.badge || 'Atmosphere'}
                        </span>
                      </div>
                      {isSelected ? (
                        <div
                          className="w-5 h-5 rounded-full text-black flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: theme.accentColor }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-stone-300 backdrop-blur-xs flex items-center gap-1">
                          {theme.isLight ? (
                            <Sun className="w-2.5 h-2.5 text-amber-400" />
                          ) : (
                            <Moon className="w-2.5 h-2.5 text-indigo-300" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Simulated Mini Chat Bubble */}
                    <div className="flex items-end justify-between gap-2 z-10">
                      <div
                        className="px-2 py-1 rounded-md text-[9px] font-medium border border-white/10 max-w-[130px] truncate"
                        style={{
                          backgroundColor: theme.isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)',
                          color: theme.isLight ? '#1c1917' : '#f8fafc',
                        }}
                      >
                        Exam study session
                      </div>
                      <div
                        className="w-3 h-3 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${theme.accentColor}66` }}
                      >
                        <Sparkles
                          className="w-2 h-2"
                          style={{ color: theme.accentColor }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title & Atmosphere Details */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-bold text-sm text-white group-hover:text-white transition-colors flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <span>{theme.name}</span>
                      </h4>
                      {isSelected && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${theme.accentColor}25`,
                            color: theme.accentColor,
                            border: `1px solid ${theme.accentColor}55`,
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                      {theme.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#0c0c10]/95 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Click any theme to instantly transform your study environment</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black hover:bg-stone-200 font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
