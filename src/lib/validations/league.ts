// League validation schemas (Zod)
// TODO: Install zod: npm install zod
// import { z } from 'zod'

export type LeagueInput = {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

