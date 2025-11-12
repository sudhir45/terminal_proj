import { writable, type Writable } from 'svelte/store';
import themes from '../../themes.json';
import type { Theme } from '../interfaces/theme';

// Default theme fallback
const defaultTheme: Theme = {
  name: 'Dracula',
  black: '#21222c',
  red: '#ff5555',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  blue: '#bd93f9',
  purple: '#ff79c6',
  cyan: '#8be9fd',
  white: '#f8f8f2',
  brightBlack: '#6272a4',
  brightRed: '#ff6e6e',
  brightGreen: '#69ff94',
  brightYellow: '#ffffa5',
  brightBlue: '#d6acff',
  brightPurple: '#ff92df',
  brightCyan: '#a4ffff',
  brightWhite: '#ffffff',
  foreground: '#f8f8f2',
  background: '#282a36',
  cursorColor: '#f8f8f2'
};

// Find the Dracula theme or fall back to our default
const findDefaultTheme = (): Theme => {
  try {
    return themes.find((t) => t.name === 'Dracula') || defaultTheme;
  } catch (error) {
    console.error('Failed to load default theme, using fallback:', error);
    return defaultTheme;
  }
};

const defaultColorscheme = findDefaultTheme();

// Type guard to validate theme structure
const isValidTheme = (theme: unknown): theme is Theme => {
  if (!theme || typeof theme !== 'object') return false;
  
  const requiredKeys: Array<keyof Theme> = [
    'name', 'black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue',
    'brightPurple', 'brightCyan', 'brightWhite', 'foreground', 'background'
  ];

  return requiredKeys.every(key => 
    key in (theme as Theme) && 
    typeof (theme as Theme)[key] === 'string'
  );
};

// Safe localStorage access with validation
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultColorscheme;
  }

  try {
    const stored = localStorage.getItem('colorscheme');
    if (!stored) return defaultColorscheme;
    
    const parsed = JSON.parse(stored);
    return isValidTheme(parsed) ? parsed : defaultColorscheme;
    
  } catch (error) {
    console.error('Failed to load theme:', error);
    return defaultColorscheme;
  }
};

// Create a safe writable store with error handling
const createThemeStore = (): Writable<Theme> => {
  const initialTheme = getInitialTheme();
  const { subscribe, set: originalSet, update: originalUpdate } = writable<Theme>(initialTheme);

  // Safe setter with validation
  const safeSet = (value: Theme) => {
    if (!isValidTheme(value)) {
      console.warn('Attempted to set invalid theme:', value);
      return;
    }
    originalSet(value);
  };

  // Safe updater with validation
  const safeUpdate = (updater: (value: Theme) => Theme) => {
    originalUpdate(current => {
      const updated = updater(current);
      return isValidTheme(updated) ? updated : current;
    });
  };

  return {
    subscribe,
    set: safeSet,
    update: safeUpdate
  };
};

export const theme = (() => {
  try {
    const store = createThemeStore();
    
    // Subscribe to changes and persist to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      store.subscribe((value) => {
        try {
          localStorage.setItem('colorscheme', JSON.stringify(value));
        } catch (error) {
          console.error('Failed to save theme:', error);
        }
      });
    }
    
    return store;
  } catch (error) {
    console.error('Failed to initialize theme store:', error);
    
    // Fallback to a read-only store with default theme
    return {
      subscribe: (run: (value: Theme) => void) => {
        run(defaultColorscheme);
        return () => {}; // No-op unsubscribe
      },
      set: () => {
        console.warn('Theme store is in read-only mode due to initialization error');
      },
      update: () => {
        console.warn('Theme store is in read-only mode due to initialization error');
      }
    };
  }
})();
