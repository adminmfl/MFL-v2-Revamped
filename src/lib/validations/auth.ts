// Auth validation schemas (Zod)
// TODO: Install zod: npm install zod
// import { z } from 'zod'

// Placeholder types - uncomment and install zod to use
export type LoginInput = {
  email: string;
  password: string;
}

export type SignupInput = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
}

