export const themeClasses = {
  surface: {
    primary: 'bg-white dark:bg-slate-900',
    secondary: 'bg-gray-50 dark:bg-slate-800',
    elevated: 'bg-white dark:bg-slate-900 shadow-sm dark:shadow-gray-900/50',
    card: 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700',
  },
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-700 dark:text-gray-300',
    muted: 'text-gray-500 dark:text-gray-400',
    subtle: 'text-gray-400 dark:text-gray-500',
  },
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    subtle: 'border-gray-100 dark:border-gray-800',
    emphasis: 'border-gray-300 dark:border-gray-600',
  },
  interactive: {
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    hoverCard: 'hover:bg-gray-50 dark:hover:bg-slate-800',
    active: 'active:bg-gray-200 dark:active:bg-gray-700',
  },
  table: {
    header: 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300',
    row: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800',
    cell: 'text-gray-900 dark:text-gray-100',
  },
  badge: {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  },
  stat: {
    icon: 'bg-primary/10 dark:bg-primary/20',
    change: {
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400',
    },
  },
};

export type ThemeSurface = keyof typeof themeClasses.surface;
export type ThemeText = keyof typeof themeClasses.text;
export type ThemeBorder = keyof typeof themeClasses.border;
export type ThemeBadgeVariant = keyof typeof themeClasses.badge;

export function applyThemePreference(theme: 'light' | 'dark'): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

export function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function getStoredTheme(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('theme');
  return stored === 'dark' ? 'dark' : stored === 'light' ? 'light' : null;
}
