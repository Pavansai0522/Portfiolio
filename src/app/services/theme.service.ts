import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'theme_preference';
  private readonly themeModeSignal = signal<ThemeMode>(this.loadThemePreference());
  private readonly isDarkModeSignal = signal<boolean>(this.getInitialDarkMode());

  readonly themeMode = this.themeModeSignal.asReadonly();
  readonly isDarkMode = this.isDarkModeSignal.asReadonly();

  constructor() {
    // Initialize dark mode based on current theme mode
    const initialDarkMode = this.getInitialDarkMode();
    this.isDarkModeSignal.set(initialDarkMode);
    this.applyTheme(initialDarkMode);

    // Watch for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (this.themeModeSignal() === 'system') {
          this.isDarkModeSignal.set(e.matches);
          this.applyTheme(e.matches);
        }
      };
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }

    // Effect to update dark mode when theme mode changes
    effect(() => {
      const mode = this.themeModeSignal();
      let shouldBeDark = false;

      if (mode === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = mode === 'dark';
      }

      if (this.isDarkModeSignal() !== shouldBeDark) {
        this.isDarkModeSignal.set(shouldBeDark);
        this.applyTheme(shouldBeDark);
      }
    });
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeModeSignal.set(mode);
    this.saveThemePreference(mode);
    
    // Immediately apply the theme
    let shouldBeDark = false;
    if (mode === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      shouldBeDark = mode === 'dark';
    }
    
    this.isDarkModeSignal.set(shouldBeDark);
    this.applyTheme(shouldBeDark);
  }

  toggleTheme(): void {
    const currentMode = this.themeModeSignal();
    if (currentMode === 'light') {
      this.setThemeMode('dark');
    } else if (currentMode === 'dark') {
      this.setThemeMode('light');
    } else {
      // If system, toggle to opposite of current system preference
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setThemeMode(systemIsDark ? 'light' : 'dark');
    }
  }

  private applyTheme(isDark: boolean): void {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  private getInitialDarkMode(): boolean {
    const mode = this.themeModeSignal();
    if (mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return mode === 'dark';
  }

  private loadThemePreference(): ThemeMode {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
    return 'system';
  }

  private saveThemePreference(mode: ThemeMode): void {
    try {
      localStorage.setItem(this.storageKey, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }
}

