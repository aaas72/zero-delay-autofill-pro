// ─── User Profile Interfaces ───────────────────────────────────────────────────
// Comprehensive TypeScript interfaces defining every aspect of a job applicant's
// profile. Designed for maximum field coverage across major job boards.

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string; // e.g. "Senior Frontend Engineer"
  preferredName?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PortfolioLinks {
  linkedin: string;
  github: string;
  website: string;
  portfolio: string;
  twitter: string;
  resumeUrl: string;
  dribbble?: string;
  stackoverflow?: string;
  medium?: string;
  behance?: string;
}

export interface SkillSet {
  technical: string[];   // e.g. ["TypeScript", "Python", "Rust"]
  frameworks: string[];  // e.g. ["React", "Next.js", "Express"]
  languages: string[];   // spoken languages, e.g. ["English", "Arabic"]
  tools: string[];       // e.g. ["Git", "Docker", "Figma"]
}

export interface Education {
  school: string;
  degree: string;        // e.g. "Bachelor of Science"
  fieldOfStudy: string;  // e.g. "Computer Science"
  gpa?: string;
  startDate: string;     // "YYYY-MM" format
  endDate: string;       // "YYYY-MM" or "Present"
}

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  yearsOfExperience: string; // e.g. "3", "5+"
  startDate: string;
  endDate: string;
  description: string;
  current: boolean;
}

export interface CustomField {
  label: string;
  value: string;
}

export interface LoginInfo {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  type: 'full' | 'login';
  profileName: string;   // e.g. "Frontend Dev", "Backend Dev"
  associatedDomain?: string; // e.g. "github.com" for login profiles
  createdAt: number;
  updatedAt: number;
  loginInfo?: LoginInfo;
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  portfolioLinks: PortfolioLinks;
  skills: SkillSet;
  education: Education[];
  experience: WorkExperience[];
  bio: string;           // Short professional summary
  coverLetter?: string;
  salary?: string;       // e.g. "$120,000"
  availability?: string; // e.g. "Immediately", "2 weeks notice"
  workAuthorization?: string; // e.g. "US Citizen", "Need sponsorship"
  customFields: CustomField[];
}

// ─── Extension Settings ────────────────────────────────────────────────────────

export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  autoFillOnLoad: boolean;
  showNotifications: boolean;
  fillDelay: number; // milliseconds, default 0 for zero-delay
  autoBackupEnabled: boolean;
  autoBackupInterval: number; // in minutes
}

// ─── Root Storage Schema ───────────────────────────────────────────────────────

export interface SavedSiteData {
  hostname: string;
  fields: Record<string, string>;
  updatedAt: number;
}

export interface StorageSchema {
  profiles: Record<string, UserProfile>;
  activeProfileId: string | null;
  settings: ExtensionSettings;
  savedSites: Record<string, SavedSiteData>;
}

// ─── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ExtensionSettings = {
  theme: 'system',
  autoFillOnLoad: false,
  showNotifications: true,
  fillDelay: 0,
  autoBackupEnabled: false,
  autoBackupInterval: 1440, // 24 hours default
};

export const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  type: 'full',
  profileName: 'My Profile',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  personalInfo: {
    firstName: '',
    lastName: '',
    fullName: '',
    headline: '',
  },
  contactInfo: {
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  portfolioLinks: {
    linkedin: '',
    github: '',
    website: '',
    portfolio: '',
    twitter: '',
    resumeUrl: '',
  },
  skills: {
    technical: [],
    frameworks: [],
    languages: [],
    tools: [],
  },
  education: [],
  experience: [],
  bio: '',
  customFields: [],
};

export const DEFAULT_LOGIN_PROFILE: UserProfile = {
  id: 'default_login',
  type: 'login',
  profileName: 'My Login',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  loginInfo: {
    email: '',
    password: '',
  },
  personalInfo: {
    firstName: '',
    lastName: '',
    fullName: '',
    headline: '',
  },
  contactInfo: {
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  },
  portfolioLinks: {
    linkedin: '',
    github: '',
    website: '',
    portfolio: '',
    twitter: '',
    resumeUrl: '',
  },
  skills: {
    technical: [],
    frameworks: [],
    languages: [],
    tools: [],
  },
  education: [],
  experience: [],
  bio: '',
  customFields: [],
};
