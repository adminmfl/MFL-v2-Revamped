import { z } from 'zod';

const MailerEnv = z.object({
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_OAUTH_CLIENT_ID: z.string().optional(),
  SMTP_OAUTH_CLIENT_SECRET: z.string().optional(),
  SMTP_OAUTH_REFRESH_TOKEN: z.string().optional(),
});

export function validateMailerEnv() {
  const parsed = MailerEnv.safeParse(process.env);
  if (!parsed.success) {
    console.warn('Mailer env validation failed:', parsed.error.format());
    return false;
  }

  const env = parsed.data;
  // At least one auth method should be available
  const hasSmtpAuth = env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS;
  const hasOauth = env.SMTP_OAUTH_CLIENT_ID && env.SMTP_OAUTH_CLIENT_SECRET && env.SMTP_OAUTH_REFRESH_TOKEN && env.SMTP_USER;
  if (!hasSmtpAuth && !hasOauth) {
    console.warn('No SMTP credentials found. Set SMTP_HOST/SMTP_USER/SMTP_PASS or Gmail OAuth envs.');
    return false;
  }
  return true;
}

export function validateSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.warn('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }
  return true;
}

export default { validateMailerEnv, validateSupabaseEnv };
