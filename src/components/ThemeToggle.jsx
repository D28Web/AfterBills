import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

// Theme toggle: cycles through Light → Dark → System.
// Uses next-themes for persistence and system preference detection.
export default function ThemeToggle({ variant = 'sidebar' }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  if (!mounted) {
    return <div className={variant === 'sidebar' ? 'h-9' : 'w-8 h-8'} />;
  }

  const current = themes.find(t => t.value === theme) || themes[2];
  const CurrentIcon = current.icon;

  const cycle = () => {
    const idx = themes.findIndex(t => t.value === theme);
    setTheme(themes[(idx + 1) % themes.length].value);
  };

  if (variant === 'header') {
    return (
      <button onClick={cycle} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Toggle theme">
        <CurrentIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button onClick={cycle} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
      <CurrentIcon className="w-4 h-4" />
      <span>{current.label}</span>
    </button>
  );
}