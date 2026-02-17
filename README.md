# CLD Event Bid App — Backend

This workspace addition provides a minimal Node/Express backend with MongoDB to accept frontend submissions.

Getting started:

1. Copy `.env.example` to `.env` and fill `MONGO_URI` (and optionally `MONGO_DB` and `PORT`).

2. Install dependencies and start server:

```powershell
cd "d:\\1234.html (2)\\backend"
npm install
npm run dev # or npm start
```

3. Frontend will POST to `http://localhost:5000/api/submit` (CORS enabled).

Serving frontend from backend:

- The backend now serves the frontend so you can open the app at `http://localhost:5000/`.
- Google Sign-In requires a web origin. If you previously opened `1234.html` via the file:// scheme, Google's button/prompt will not work. Open the app in the browser at `http://localhost:5000/` instead.

Google Console note:

- Make sure the OAuth client `GOOGLE_CLIENT_ID` has `http://localhost:5000` listed under "Authorized JavaScript origins" in Google Cloud Console for the credential to work.
