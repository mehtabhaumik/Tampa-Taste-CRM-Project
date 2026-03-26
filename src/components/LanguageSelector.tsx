import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { LanguageCode } from '../translations';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const languages: { code: LanguageCode; name: string }[] = [
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
].map(lang => ({ ...lang, code: lang.code as LanguageCode })).sort((a, b) => a.name.localeCompare(b.name));

interface LanguageSelectorProps {
  dark?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ dark = true }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 group ${
          dark ? 'hover:bg-white/10' : 'hover:bg-black/5'
        }`}
        aria-label="Select Language"
      >
        <Globe className={`w-4 h-4 transition-colors ${
          dark ? 'text-white/60 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'
        }`} />
        <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${
          dark ? 'text-white/80 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'
        }`}>
          {language}
        </span>
        <ChevronDown className={`w-3 h-3 transition-all duration-300 ${
          dark ? 'text-white/40 group-hover:text-white' : 'text-slate-300 group-hover:text-slate-900'
        } ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute right-0 mt-2 w-48 backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden z-[100] ${
              dark ? 'bg-white/10 border-white/20' : 'bg-white/90 border-slate-200'
            }`}
          >
            <div className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-200 ${
                    dark 
                      ? `hover:bg-white/10 ${language === lang.code ? 'text-white font-bold' : 'text-white/60 hover:text-white'}`
                      : `hover:bg-slate-50 ${language === lang.code ? 'text-brand-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`
                  }`}
                >
                  <span>{lang.name}</span>
                  {language === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
