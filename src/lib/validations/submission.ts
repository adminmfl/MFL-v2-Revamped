// Submission validation schemas (Zod)
// TODO: Install zod: npm install zod
// import { z } from 'zod'

export type SubmissionInput = {
  type: 'workout' | 'rest';
  workout_type?: string;
  duration?: number;
  distance?: number;
  steps?: number;
  holes?: number;
  date: string;
}

