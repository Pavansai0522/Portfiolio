import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);

  // Angular Form Controls
  protected readonly languageControl = new FormControl('en');
  protected readonly timezoneControl = new FormControl('UTC');

  protected readonly currentUser = this.authService.currentUser;

  protected setThemeMode(mode: ThemeMode): void {
    this.themeService.setThemeMode(mode);
  }

  private saveSetting(key: string, value: any): void {
    try {
      const settings = JSON.parse(localStorage.getItem('user_settings') || '{}');
      settings[key] = value;
      localStorage.setItem('user_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  }

  ngOnInit(): void {
    this.loadSettings();
    this.setupFormSubscriptions();
  }

  private setupFormSubscriptions(): void {
    // Subscribe to language changes
    this.languageControl.valueChanges.subscribe(language => {
      if (language) {
        this.saveSetting('language', language);
      }
    });

    // Subscribe to timezone changes
    this.timezoneControl.valueChanges.subscribe(timezone => {
      if (timezone) {
        this.saveSetting('timezone', timezone);
      }
    });
  }

  private loadSettings(): void {
    try {
      const settings = JSON.parse(localStorage.getItem('user_settings') || '{}');
      if (settings.language) {
        this.languageControl.setValue(settings.language, { emitEvent: false });
      }
      if (settings.timezone) {
        this.timezoneControl.setValue(settings.timezone, { emitEvent: false });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
}
