import { writable } from 'svelte/store';
import themes from '../../themes.json';
import type { Theme } from '../interfaces/theme';

const defaultColorscheme: Theme = themes.find((t) => t.name === 'dracula')!;

// Safe localStorage access
const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('colorscheme');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading theme from localStorage:', e);
    }
  }
  return defaultColorscheme;
};

export const theme = writable<Theme>(getInitialTheme());

theme.subscribe((value) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('colorscheme', JSON.stringify(value));
    } catch (e) {
      console.error('Error saving theme to localStorage:', e);
    }
  }
});
