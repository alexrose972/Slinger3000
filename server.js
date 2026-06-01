const express    = require('express');
const session    = require('express-session');
const passport   = require('passport');
const Google     = require('passport-google-oauth20').Strategy;
const fetch      = require('node-fetch');
const path       = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));

// ─── Sessions ────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ─── Google OAuth ─────────────────────────────────────────────────────────────
passport.use(new Google({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.CALLBACK_URL || '/auth/google/callback',
}, (_accessToken, _refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value || '';
  if (!email.toLowerCase().endsWith('@yotpo.com')) {
    return done(null, false, { message: 'Access restricted to @yotpo.com accounts.' });
  }
  return done(null, { id: profile.id, email, name: profile.displayName, photo: profile.photos?.[0]?.value });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.use(passport.initialize());
app.use(passport.session());

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=1' }),
  (req, res) => res.redirect('/')
);

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login'));
});

// ─── Login page ───────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  const showError = req.query.error === '1';
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Slinger 3000</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#ECEDF0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Inter',system-ui,sans-serif}
    .card{background:#fff;border-radius:20px;padding:2.5rem 2.5rem 2.75rem;width:360px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.06);text-align:center}
    .icon{width:46px;height:46px;background:#0F0F10;border-radius:13px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
    h1{font-size:20px;font-weight:700;letter-spacing:-.02em;color:#0F0F10;margin-bottom:.35rem}
    .sub{font-size:13px;color:#9A9BA8;margin-bottom:1.75rem;line-height:1.5}
    .error{font-size:13px;color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;margin-bottom:1.25rem}
    .btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 16px;border-radius:10px;border:1.5px solid #E4E5E9;background:#fff;font-size:14px;font-weight:600;color:#0F0F10;cursor:pointer;text-decoration:none;font-family:inherit;transition:background .1s}
    .btn:hover{background:#F4F5F7}
  </style>
</head>
<body>
<div class="card">
  <div class="icon">
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <path d="M4 6h12M4 10h8M4 14h5" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  </div>
  <h1>Slinger 3000</h1>
  <p class="sub">Sign in with your Yotpo Google account to continue.</p>
  ${showError ? '<div class="error">Access restricted to @yotpo.com accounts only.</div>' : ''}
  <a class="btn" href="/auth/google">
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
    Sign in with Google
  </a>
</div>
</body>
</html>`);
});

// ─── Anthropic proxy ──────────────────────────────────────────────────────────
app.post('/api/proxy', requireAuth, async (req, res) => {
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: { message: 'Proxy error: ' + err.message } });
  }
});

// ─── Who am I (for the frontend avatar) ──────────────────────────────────────
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, photo: req.user.photo });
});

// ─── Serve frontend (auth-gated) ──────────────────────────────────────────────
app.use('/', requireAuth, express.static(path.join(__dirname, 'public')));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Slinger 3000 running on :${PORT}`));
