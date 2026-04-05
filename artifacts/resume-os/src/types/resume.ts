export interface FrontendProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
}

export interface FrontendExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface FrontendEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface FrontendSkillCategory {
  id: string;
  category: string;
  items: string[];
}

export interface FrontendProject {
  id: string;
  name: string;
  description: string;
  url: string;
  bullets: string[];
}

export interface FrontendCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface FrontendResume {
  profile: FrontendProfile;
  experience: FrontendExperience[];
  education: FrontendEducation[];
  skills: FrontendSkillCategory[];
  projects: FrontendProject[];
}

export const emptyResumeData: FrontendResume = {
  profile: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
    summary: "",
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

export const defaultResumeData = emptyResumeData;
