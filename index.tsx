
import React, { createContext, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SystemBranding } from './types';

// --- THEME CONTEXT ---
type Theme = 'dark' | 'light';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({ theme: 'light', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// --- BRANDING CONTEXT ---
// COR LARANJA DA HELPDIGITAL: #F05A22 (ou próximo)
const DEFAULT_BRANDING: SystemBranding = {
    systemName: 'HelpDigital CRM',
    primaryColor: '#F05A22' 
};

interface BrandingContextType {
    branding: SystemBranding;
    updateBranding: (newBranding: Partial<SystemBranding>) => void;
    resetBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
    branding: DEFAULT_BRANDING,
    updateBranding: () => {},
    resetBranding: () => {}
});

export const useBranding = () => useContext(BrandingContext);

// Helper: Convert Hex to HSL (Tailwind variable format)
const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '16 88% 54%'; // Default Orange fallback

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Return format: "H S% L%" (No hsl() wrapper, as tailwind adds it)
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [theme, setTheme] = useState<Theme>('light');
  
  // Branding State
  const [branding, setBranding] = useState<SystemBranding>(DEFAULT_BRANDING);

  // Load Initial States
  useEffect(() => {
    // 1. Theme
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }

    // 2. Branding
    const savedBranding = localStorage.getItem('evo_branding');
    if (savedBranding) {
        try {
            const parsed = JSON.parse(savedBranding);
            setBranding({ ...DEFAULT_BRANDING, ...parsed });
            applyBrandingColors(parsed.primaryColor);
        } catch (e) {
            applyBrandingColors(DEFAULT_BRANDING.primaryColor);
        }
    } else {
        applyBrandingColors(DEFAULT_BRANDING.primaryColor);
    }
  }, []);

  const applyBrandingColors = (hexColor: string) => {
      const hsl = hexToHSL(hexColor);
      // Inject into :root for global access by Tailwind
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
      
      // Update Wa variables to match theme if desired, or keep specific for chat bubbles
      document.documentElement.style.setProperty('--wa-teal', hsl);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const updateBranding = (newConfig: Partial<SystemBranding>) => {
      const updated = { ...branding, ...newConfig };
      setBranding(updated);
      localStorage.setItem('evo_branding', JSON.stringify(updated));
      
      if (newConfig.primaryColor) {
          applyBrandingColors(newConfig.primaryColor);
      }
      
      // Update document title dynamically
      if (newConfig.systemName) {
          document.title = newConfig.systemName;
      }
  };

  const resetBranding = () => {
      setBranding(DEFAULT_BRANDING);
      localStorage.removeItem('evo_branding');
      applyBrandingColors(DEFAULT_BRANDING.primaryColor);
      document.title = DEFAULT_BRANDING.systemName;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <BrandingContext.Provider value={{ branding, updateBranding, resetBranding }}>
            {children}
        </BrandingContext.Provider>
    </ThemeContext.Provider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
