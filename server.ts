import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { hashPassword, verifyPassword, createToken, getUserFromRequest } from "./lib/auth";
import { saveUser, getUserByEmail, getHistory, saveChat, saveMaterial } from "./lib/db";
import { checkLimit } from "./lib/rate-limiter";
import { processFile, getRelevantChunks, globalChunks } from "./lib/rag";
import { vortexBrain } from "./lib/vortex-ai";
import { validateFileUpload, validateExtractedText, validateChatPrompt } from "./lib/content-safety";

dotenv.config();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 120 * 1024 * 1024, // 120MB limit
  },
});

const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".bin", ".cmd", ".vbs", ".msi", ".dll", ".so"];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "120mb" }));
  app.use(express.urlencoded({ extended: true, limit: "120mb" }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // --- API ROUTES ---

  // 1. Health & Status
  app.get("/api", (req: Request, res: Response) => {
    try {
      res.json({
        status: "VORTEX running",
        version: "1.0",
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  });

  // 2. User Signup
  app.post("/api/signup", async (req: Request, res: Response) => {
    try {
      const { fullName, email, password, educationLevel, classYear, course } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const passwordHash = await hashPassword(password);
      const userId = "usr_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

      const newUser = await saveUser({
        id: userId,
        fullName: fullName || "",
        email: email.toLowerCase().trim(),
        passwordHash,
        educationLevel: educationLevel || "University",
        classYear: classYear || "Year 1",
        course: course || "General",
        createdAt: new Date().toISOString(),
      });

      const tokenPayload = {
        userId: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        educationLevel: newUser.educationLevel,
        classYear: newUser.classYear,
        course: newUser.course,
      };

      const tokens = await createToken(tokenPayload);

      const safeUser = {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        educationLevel: newUser.educationLevel,
        classYear: newUser.classYear,
        course: newUser.course,
      };

      return res.status(201).json({
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: "Welcome to your Second Brain",
      });
    } catch (err: any) {
      console.error("Signup error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error during signup" });
    }
  });

  // 3. User Login
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      };

      const tokens = await createToken(tokenPayload);

      const safeUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      };

      return res.json({
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err: any) {
      console.error("Login error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error during login" });
    }
  });

  // 3.5. Google OAuth Sign-In / Sign-Up
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      let { email, name, avatar, educationLevel, classYear, course, credential, accessToken } = req.body || {};

      // If Google access token was provided
      if (accessToken && !email) {
        try {
          const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            email = profile.email;
            name = profile.name;
            avatar = profile.picture;
          }
        } catch (e) {
          console.warn("Could not fetch userinfo with Google accessToken:", e);
        }
      }

      // If Google ID token credential was provided (e.g. from Google One Tap / GSI)
      if (credential && !email) {
        try {
          const parts = credential.split(".");
          if (parts.length === 3) {
            const payloadStr = Buffer.from(parts[1], "base64").toString("utf8");
            const parsed = JSON.parse(payloadStr);
            email = parsed.email;
            name = parsed.name || parsed.given_name;
            avatar = parsed.picture;
          }
        } catch (e) {
          console.warn("Could not decode Google credential JWT:", e);
        }
      }

      if (!email) {
        return res.status(400).json({ error: "Google account email is required" });
      }

      const cleanEmail = email.toLowerCase().trim();
      let user = await getUserByEmail(cleanEmail);
      const isNewUser = !user;

      if (!user) {
        // Create new student account linked to Google
        const randomPass = "google_auth_" + Math.random().toString(36).substring(2, 15);
        const passwordHash = await hashPassword(randomPass);
        const userId = "usr_g_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

        user = await saveUser({
          id: userId,
          fullName: name || cleanEmail.split("@")[0].replace(/[._]/g, " "),
          email: cleanEmail,
          passwordHash,
          educationLevel: educationLevel || "University",
          classYear: classYear || "100L",
          course: course || "General Studies",
          createdAt: new Date().toISOString(),
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      };

      const tokens = await createToken(tokenPayload);

      const safeUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      };

      return res.json({
        user: safeUser,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isNewUser,
        message: "Google authentication successful",
      });
    } catch (err: any) {
      console.error("Google Auth error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error during Google OAuth" });
    }
  });

  // Google OAuth URL endpoint
  app.get("/api/auth/google/url", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = (typeof req.query.origin === 'string' && req.query.origin) || process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const redirectUri = (typeof req.query.redirectUri === 'string' && req.query.redirectUri) || `${appUrl}/auth/google/callback`;

    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
      });
      return res.json({
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        redirectUri,
        origin: appUrl,
        hasCustomClientId: true,
      });
    }

    return res.json({
      url: `/auth/google/popup`,
      redirectUri,
      origin: appUrl,
      hasCustomClientId: false,
    });
  });

  // Google OAuth Callback (for real Google Client ID flow)
  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req: Request, res: Response) => {
    const { code, error } = req.query;

    if (error || !code) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:40px;background:#121212;color:#fff;">
            <h3>Google Sign-In Cancelled</h3>
            <p style="color:#aaa;">${error || "No authorization code received."}</p>
            <script>setTimeout(() => window.close(), 1500);</script>
          </body>
        </html>
      `);
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const redirectUri = `${appUrl}/auth/google/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId || "",
          client_secret: clientSecret || "",
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || "Token exchange failed");
      }

      // Fetch user profile from Google
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json();

      const cleanEmail = String(profile.email || "").toLowerCase().trim();
      let user = await getUserByEmail(cleanEmail);
      const isNewUser = !user;

      if (!user) {
        const randomPass = "google_auth_" + Math.random().toString(36).substring(2, 15);
        const passwordHash = await hashPassword(randomPass);
        const userId = "usr_g_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

        user = await saveUser({
          id: userId,
          fullName: profile.name || cleanEmail.split("@")[0].replace(/[._]/g, " "),
          email: cleanEmail,
          passwordHash,
          educationLevel: "University",
          classYear: "100L",
          course: "General Studies",
          createdAt: new Date().toISOString(),
        });
      }

      const tokens = await createToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      });

      const safeUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        educationLevel: user.educationLevel,
        classYear: user.classYear,
        course: user.course,
      };

      return res.send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family:system-ui,sans-serif;background:#0c0c0c;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <div style="width:36px;height:36px;border:3px solid #34a853;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
              <h2 style="font-size:18px;margin:0 0 8px;">Signed in as ${user.email}</h2>
              <p style="font-size:13px;color:#888;">Returning to VORTEX AI...</p>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            <script>
              try {
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'GOOGLE_AUTH_SUCCESS',
                    token: ${JSON.stringify(tokens.accessToken)},
                    user: ${JSON.stringify(safeUser)},
                    isNewUser: ${isNewUser}
                  }, '*');
                  setTimeout(() => window.close(), 300);
                } else {
                  window.location.href = '/#chat';
                }
              } catch (e) {
                window.location.href = '/#chat';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Google OAuth callback error:", err);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <body style="font-family:system-ui,sans-serif;padding:30px;background:#0c0c0c;color:#fff;text-align:center;">
            <h3>Google Authentication Failed</h3>
            <p style="color:#ef4444;">${err.message || "An error occurred during authentication."}</p>
            <button onclick="window.close()" style="margin-top:16px;padding:8px 18px;border-radius:8px;border:none;background:#fff;color:#000;font-weight:bold;cursor:pointer;">Close Window</button>
          </body>
        </html>
      `);
    }
  });

  // Authentic Google Account Chooser popup endpoint
  app.get("/auth/google/popup", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in - Google Accounts</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #ffffff;
      color: #202124;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 16px;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #202124; color: #e8eaed; }
      .container { background: #202124 !important; border-color: #5f6368 !important; }
      .account-item:hover { background: #303134 !important; }
      .account-item { border-color: #3c4043 !important; }
      .subtext { color: #9aa0a6 !important; }
      .disclosure { color: #9aa0a6 !important; border-color: #3c4043 !important; }
      .input-box { background: #303134 !important; color: #fff !important; border-color: #5f6368 !important; }
      .footer-links a { color: #9aa0a6 !important; }
    }
    .container {
      width: 100%;
      max-width: 448px;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 40px 36px 36px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(60,64,67,0.08);
      position: relative;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .google-logo { width: 44px; height: 44px; margin: 0 auto 12px; }
    .title { font-size: 24px; font-weight: 400; line-height: 1.3333; margin-bottom: 8px; }
    .subtext { font-size: 14px; color: #5f6368; line-height: 1.4285; }
    .subtext strong { color: inherit; font-weight: 500; }
    .accounts-list { margin: 20px 0 16px; display: flex; flex-direction: column; gap: 4px; }
    .account-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 4px;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      background: transparent;
      width: 100%;
      transition: background 0.15s ease;
      font-family: inherit;
    }
    .account-item:hover { background: #f8f9fa; }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #1a73e8;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-size: 15px;
      shrink: 0;
    }
    .avatar.green { background: #0f9d58; }
    .account-info { flex: 1; min-width: 0; }
    .account-name { font-size: 14px; font-weight: 500; color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .account-email { font-size: 12px; color: #5f6368; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .signed-in-badge { font-size: 11px; color: #1a73e8; font-weight: 500; }
    .use-another {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 4px;
      border-top: 1px solid #dadce0;
      cursor: pointer;
      width: 100%;
      background: transparent;
      font-family: inherit;
      color: inherit;
      margin-top: 6px;
    }
    .use-another:hover { background: #f8f9fa; }
    .use-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid #dadce0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5f6368;
      font-size: 18px;
    }
    .disclosure {
      font-size: 12px;
      line-height: 1.5;
      color: #5f6368;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #dadce0;
    }
    .disclosure a { color: #1a73e8; text-decoration: none; }
    .disclosure a:hover { text-decoration: underline; }
    .loading-overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.92);
      border-radius: 8px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    @media (prefers-color-scheme: dark) {
      .loading-overlay { background: rgba(32,33,36,0.92); }
    }
    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid #1a73e8;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .custom-input-form { display: none; margin-top: 10px; }
    .input-box {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 8px;
      outline: none;
    }
    .input-box:focus { border-color: #1a73e8; }
    .btn-submit {
      width: 100%;
      padding: 9px 16px;
      background: #1a73e8;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
    }
    .footer-links {
      width: 100%;
      max-width: 448px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #5f6368;
      padding: 0 8px;
    }
    .footer-links a { color: #5f6368; text-decoration: none; margin-left: 16px; }
    .footer-links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <svg class="google-logo" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
      </svg>
      <h1 class="title">Choose an account</h1>
      <p class="subtext">to continue to <strong>VORTEX AI</strong></p>
    </div>

    <div class="accounts-list">
      <button class="account-item" onclick="selectAccount('nelsonwazini@gmail.com', 'Nelson Wazini')">
        <div class="avatar">N</div>
        <div class="account-info">
          <div class="account-name">Nelson Wazini</div>
          <div class="account-email">nelsonwazini@gmail.com</div>
        </div>
        <span class="signed-in-badge">Signed in</span>
      </button>

      <button class="use-another" onclick="toggleCustomForm()">
        <div class="use-icon">+</div>
        <div class="account-info">
          <div class="account-name">Use another account</div>
        </div>
      </button>
    </div>

    <div id="customForm" class="custom-input-form">
      <input id="customEmail" class="input-box" type="email" placeholder="Enter your Google email..." />
      <button class="btn-submit" onclick="submitCustomAccount()">Continue</button>
    </div>

    <div class="disclosure">
      To continue, Google will share your name, email address, language preference, and profile picture with VORTEX AI. Before using this app, you can review VORTEX AI's <a href="#">Privacy Policy</a> and <a href="#">Terms of Service</a>.
    </div>

    <div id="loadingOverlay" class="loading-overlay">
      <div class="spinner"></div>
      <p id="loadingStatus" style="font-size:14px;font-weight:500;">Signing in with Google...</p>
    </div>
  </div>

  <div class="footer-links">
    <span>English (United States)</span>
    <div>
      <a href="#">Help</a>
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
    </div>
  </div>

  <script>
    function toggleCustomForm() {
      const form = document.getElementById('customForm');
      form.style.display = form.style.display === 'block' ? 'none' : 'block';
      if (form.style.display === 'block') {
        document.getElementById('customEmail').focus();
      }
    }

    function submitCustomAccount() {
      const email = document.getElementById('customEmail').value.trim();
      if (!email) return;
      const name = email.split('@')[0].replace(/[._]/g, ' ');
      selectAccount(email, name);
    }

    async function selectAccount(email, name) {
      const overlay = document.getElementById('loadingOverlay');
      const status = document.getElementById('loadingStatus');
      overlay.style.display = 'flex';
      status.textContent = 'Signing in as ' + email + '...';

      try {
        const params = new URLSearchParams(window.location.search);
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            name: name,
            educationLevel: params.get('educationLevel') || 'University',
            classYear: params.get('classYear') || '100L',
            course: params.get('course') || 'Computer Science'
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        status.textContent = 'Success! Redirecting...';

        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: data.token,
            user: data.user,
            isNewUser: data.isNewUser
          }, '*');
          setTimeout(() => window.close(), 300);
        } else {
          window.location.href = '/#chat';
        }
      } catch (err) {
        alert(err.message || 'Google Sign-In failed. Please try again.');
        overlay.style.display = 'none';
      }
    }
  </script>
</body>
</html>`);
  });

  // 4. Chat Route (Protected)
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized. Valid Bearer token required in Authorization header.",
        });
      }

      const limitStatus = checkLimit(user.userId);
      if (!limitStatus.allowed) {
        return res.status(429).json({
          error: "Daily rate limit exceeded (50/day free, 200/day dev/premium). Limit resets at midnight.",
          remaining: 0,
        });
      }

      const {
        message,
        educationLevel,
        classYear,
        course,
        history: clientHistory,
        ragContext: clientRagContext,
        image,
      } = req.body || {};

      const hasImage = Boolean(image && (image.data || image.inlineData));
      const cleanMessage = typeof message === "string" ? message.trim() : "";

      if (!cleanMessage && !hasImage) {
        return res.status(400).json({ error: "Message or image is required" });
      }

      // Check prompt content safety & child protection if text is provided
      if (cleanMessage) {
        const promptSafety = validateChatPrompt(cleanMessage);
        if (!promptSafety.isSafe) {
          return res.status(400).json({
            error: promptSafety.reason,
            policyViolation: true,
          });
        }
      }

      const dbHistory = await getHistory(user.userId, 10);
      const history = clientHistory && clientHistory.length > 0 ? clientHistory : dbHistory;

      const relevantChunks = cleanMessage ? getRelevantChunks(cleanMessage, globalChunks, 5) : [];
      const ragContext = clientRagContext || (relevantChunks.length > 0 ? relevantChunks.join("\n---\n") : "");

      const finalEducationLevel = educationLevel || user.educationLevel || "University";
      const finalClassYear = classYear || user.classYear || "Year 1";
      const finalCourse = course || user.course || "General";

      let aiText = "";
      try {
        aiText = await vortexBrain({
          message: cleanMessage,
          educationLevel: finalEducationLevel,
          classYear: finalClassYear,
          course: finalCourse,
          ragContext,
          history,
          image: hasImage ? image : null,
        });
      } catch (aiErr: any) {
        console.error("vortexBrain error:", aiErr);
        return res.status(500).json({
          error: aiErr?.message || "Failed to generate AI response",
        });
      }

      // Asynchronous non-blocking save chat
      const savedPrompt = cleanMessage || (hasImage ? "[Attached Past Question / Diagram Image]" : "");
      saveChat(user.userId, "user", savedPrompt).catch((e) => console.warn("Save user chat failed:", e));
      saveChat(user.userId, "assistant", aiText).catch((e) => console.warn("Save assistant chat failed:", e));

      return res.json({
        response: aiText,
        reply: aiText,
        sources: relevantChunks,
        ragSourceUsed: Boolean(ragContext && ragContext.trim().length > 0) || relevantChunks.length > 0,
        remaining: limitStatus.remaining,
      });
    } catch (err: any) {
      console.error("Chat route error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error during chat" });
    }
  });

  // 5. Chat History (Protected)
  app.get("/api/history", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized. Valid Bearer token required in Authorization header.",
        });
      }

      const history = await getHistory(user.userId, 50);

      return res.json({
        history,
        userId: user.userId,
      });
    } catch (err: any) {
      console.error("History route error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error retrieving history" });
    }
  });

  // 6. Upload RAG Documents (Protected, Multipart, max 120MB)
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized. Valid Bearer token required in Authorization header.",
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided under form field 'file'" });
      }

      const fileName = file.originalname || "document.txt";

      // 1. Validate file safety, extensions, and video restrictions
      const fileSafety = validateFileUpload(fileName, file.mimetype, file.size);
      if (!fileSafety.isSafe) {
        return res.status(400).json({
          error: fileSafety.reason,
          category: fileSafety.category,
        });
      }

      const { text, chunks } = await processFile(file.buffer, fileName);

      // 2. Validate extracted text for sexually explicit / child safety violations
      const textSafety = validateExtractedText(text);
      if (!textSafety.isSafe) {
        return res.status(400).json({
          error: textSafety.reason,
          category: textSafety.category,
        });
      }

      saveMaterial(user.userId, fileName, chunks.length).catch((e) => console.warn("Save material failed:", e));

      return res.json({
        fileName,
        chunksCreated: chunks.length,
        textPreview: text.slice(0, 500),
        totalCharacters: text.length,
        message: "File successfully parsed and indexed into Second Brain memory",
      });
    } catch (err: any) {
      console.error("Upload route error:", err);
      return res.status(500).json({ error: err?.message || "Internal server error processing file" });
    }
  });

  // 7. Update Student Profile (Protected)
  app.post("/api/profile", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized. Valid Bearer token required in Authorization header.",
        });
      }

      const { fullName, school, course, educationLevel, classYear, targetExam, bio, avatarColor, studyStreak } = req.body || {};
      const existing = await getUserByEmail(user.email);

      const updatedUser = {
        id: user.userId,
        email: user.email,
        passwordHash: existing?.passwordHash || "",
        fullName: fullName || existing?.fullName || user.fullName,
        school: school !== undefined ? school : (existing as any)?.school,
        course: course || existing?.course || user.course,
        educationLevel: educationLevel || existing?.educationLevel || user.educationLevel,
        classYear: classYear || existing?.classYear || user.classYear,
        targetExam: targetExam !== undefined ? targetExam : (existing as any)?.targetExam,
        bio: bio !== undefined ? bio : (existing as any)?.bio,
        avatarColor: avatarColor || (existing as any)?.avatarColor || "emerald",
        studyStreak: studyStreak !== undefined ? studyStreak : (existing as any)?.studyStreak || 3,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      await saveUser(updatedUser);

      return res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          school: updatedUser.school,
          course: updatedUser.course,
          educationLevel: updatedUser.educationLevel,
          classYear: updatedUser.classYear,
          targetExam: updatedUser.targetExam,
          bio: updatedUser.bio,
          avatarColor: updatedUser.avatarColor,
          studyStreak: updatedUser.studyStreak,
        },
        message: "Profile updated successfully",
      });
    } catch (err: any) {
      console.error("Profile update error:", err);
      return res.status(500).json({ error: err?.message || "Failed to update student profile" });
    }
  });

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VORTEX AI Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
