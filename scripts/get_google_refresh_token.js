const express = require('express');
const readline = require('readline');
const { google } = require('googleapis');
const { exec } = require('child_process');

const PORT = process.env.OAUTH_LOCAL_PORT || 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  const clientId = process.env.SMTP_OAUTH_CLIENT_ID || await ask('Enter Google OAuth Client ID: ');
  const clientSecret = process.env.SMTP_OAUTH_CLIENT_SECRET || await ask('Enter Google OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Client ID and Client Secret are required.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const scopes = [
    'https://mail.google.com/',
    'openid',
    'profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  console.log('\nOpen this URL in your browser to authorize the application:');
  console.log(authUrl);
  console.log('\nIf your browser does not open automatically, copy/paste the URL into the browser.');

  // attempt to open automatically
  try {
    const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${start} "${authUrl}"`);
  } catch (e) {
    // ignore
  }

  const app = express();

  const server = app.listen(PORT, () => {
    console.log(`\nListening for OAuth callback on ${REDIRECT_URI}`);
    console.log('Make sure this redirect URI is registered in the Google Cloud Console for your OAuth client.');
  });

  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
      res.status(400).send('Missing `code` in query.');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      // tokens may include access_token, refresh_token, expiry_date
      res.send('<h2>Success</h2><p>You may close this tab. Check your terminal for the refresh token.</p>');
      console.log('\n=== Received tokens ===');
      console.log(tokens);
      if (tokens.refresh_token) {
        console.log('\nCOPY THIS REFRESH TOKEN (value below):\n');
        console.log(tokens.refresh_token);
        console.log('\nAdd the following to your .env.local:');
        console.log(`SMTP_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      } else {
        console.log('\nNo refresh token returned. If you already granted consent previously, re-run the script and make sure to use the same Google account and that the OAuth client has the consent screen configured.');
        console.log('You can force showing the consent screen by adding `prompt: "consent"` (already included in this helper).');
      }
    } catch (err) {
      console.error('Error exchanging code for tokens:', err);
      res.status(500).send('Error exchanging code for tokens. Check terminal.');
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
