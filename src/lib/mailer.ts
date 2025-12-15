const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@example.com';

if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
  console.warn('SMTP configuration incomplete. Email sending will fail if attempted.');
}

let _transporter: any = null;
async function getTransporter() {
  if (_transporter) return _transporter;
  // dynamic import avoids TypeScript/ESM static import issues with nodemailer v7
  const nodemailer = await import('nodemailer');

  // Prefer OAuth2 if OAuth env vars are set (for Gmail)
  const oauthClientId = process.env.SMTP_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.SMTP_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.SMTP_OAUTH_REFRESH_TOKEN;
  const oauthUser = process.env.SMTP_USER;

  console.debug('mailer: oauth envs present?', {
    hasClientId: !!oauthClientId,
    hasClientSecret: !!oauthClientSecret,
    hasRefreshToken: !!oauthRefreshToken,
    hasUser: !!oauthUser,
  });

  if (oauthClientId && oauthClientSecret && oauthRefreshToken && oauthUser) {
    try {
      // dynamic import googleapis to avoid extra startup cost
      const { google } = await import('googleapis');
      const oAuth2Client = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      oAuth2Client.setCredentials({ refresh_token: oauthRefreshToken });
      const accessTokenResponse = await oAuth2Client.getAccessToken();
      const accessToken = accessTokenResponse?.token || undefined;
      // log masked tokens for debugging
      console.debug('mailer: got accessToken present=', !!accessToken, 'accessToken(prefix)=', accessToken ? accessToken.slice(0, 8) + '...' : undefined);
      console.debug('mailer: oauth client id prefix=', oauthClientId ? oauthClientId.slice(0, 12) + '...' : undefined);
      console.debug('mailer: oauth refresh token present=', !!oauthRefreshToken, 'refreshToken(prefix)=', oauthRefreshToken ? oauthRefreshToken.slice(0, 8) + '...' : undefined);

      // attempt to validate the access token with Google's tokeninfo endpoint (non-sensitive)
      try {
        if (accessToken) {
          const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
          const tokenInfo = await tokenInfoRes.json();
          console.debug('mailer: tokeninfo:', {
            audience: tokenInfo.audience,
            user_id: tokenInfo.user_id,
            scope: tokenInfo.scope,
            expires_in: tokenInfo.expires_in,
            issued_to: tokenInfo.issued_to,
          });

          // fetch userinfo to confirm email
          const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${encodeURIComponent(accessToken)}`);
          const userInfo = await userInfoRes.json();
          console.debug('mailer: userinfo email:', userInfo.email);
          console.debug('mailer: SMTP_USER (expected):', oauthUser);
          if (userInfo.email && userInfo.email !== oauthUser) {
            console.warn('⚠️  mailer: EMAIL MISMATCH! Token belongs to', userInfo.email, 'but SMTP_USER is', oauthUser);
            console.warn('⚠️  Fix: re-run `npm run get-google-refresh-token` while signed into', oauthUser);
          } else {
            console.info('✓ mailer: token email matches SMTP_USER:', userInfo.email);
          }
        }
      } catch (tiErr) {
        console.warn('mailer: tokeninfo check failed:', tiErr);
      }

      _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: oauthUser,
          clientId: oauthClientId,
          clientSecret: oauthClientSecret,
          refreshToken: oauthRefreshToken,
          accessToken,
        },
      });
      console.info('mailer: using OAuth2 transport (gmail) for', oauthUser);
      return _transporter;
    } catch (e) {
      console.warn('mailer: OAuth2 transport creation failed, falling back to SMTP transport:', e);
      // continue to create SMTP transport below
    }
  }

  console.info('mailer: creating SMTP transport, host=', smtpHost, 'port=', smtpPort, 'userPresent=', !!smtpUser);
  _transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });
  console.info('mailer: using SMTP auth=', !!(smtpUser && smtpPass));
  return _transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const transporter = await getTransporter();
  if (!transporter) throw new Error('Transporter not configured');
  return transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text: text || undefined,
    html,
  });
}

export default getTransporter;
