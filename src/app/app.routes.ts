import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JobsComponent } from './components/jobs/jobs.component';
import { SettingsComponent } from './components/settings/settings.component';
import { ResumeGeneratorComponent } from './components/resume-generator/resume-generator.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login'
  },
  {
    path: 'signup',
    component: SignupComponent,
    title: 'Sign Up'
  },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    title: 'Verify Email'
  },
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'Profile',
    canActivate: [authGuard]
  },
  {
    path: 'portfolio',
    component: PortfolioComponent,
    title: 'Portfolio',
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Dashboard',
    canActivate: [authGuard]
  },
  {
    path: 'jobs',
    component: JobsComponent,
    title: 'Jobs',
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    title: 'Settings',
    canActivate: [authGuard]
  },
  {
    path: 'resume-generator',
    component: ResumeGeneratorComponent,
    title: 'Resume Generator'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

