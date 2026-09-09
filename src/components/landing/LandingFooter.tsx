import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface LandingFooterProps {
  onNavigate: (route: string) => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#08080a] py-10 px-4 md:px-8 text-stone-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white text-black font-black flex items-center justify-center text-sm shadow-md">
            V
          </div>
          <div>
            <p className="font-bold text-white text-sm">VORTEX AI</p>
            <p className="text-stone-500 text-[11px]">Your AI Assistant for Nigerian Education</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-stone-400">
          <button
            onClick={() => onNavigate('/landing-page')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('/sign-up-login-screen')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Sign In / Sign Up
          </button>
          <button
            onClick={() => onNavigate('/chat-app')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Launch Chat App
          </button>
        </div>

        <div className="text-center md:text-right text-stone-500 text-[11px]">
          <p>© {new Date().getFullYear()} VORTEX AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
