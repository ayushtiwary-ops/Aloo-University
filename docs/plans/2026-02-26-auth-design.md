# Frontend Authentication Design — AdmitGuard
**Date:** 2026-02-26

## Architecture

Auth is frontend-only. Backend untouched. Token in localStorage.

## Flow

```
SplashScreen (3s)
  → isAuthenticated() ?
      NO  → LoginView → POST /api/auth/login → store token
          → onSuccess → mountApp()
      YES → mountApp()

401 from any API call
  → AuthService.clearToken()
  → dispatch 'auth:unauthorized'
  → main.js tears down app, shows LoginView
  → onSuccess → mountApp()

Logout button click
  → AuthService.logout() (clearToken + dispatch 'auth:unauthorized')
```

## Components

- **AuthService** — login(), logout(), clearToken(), getToken(), getRole(), isAuthenticated()
- **ApiClient** — fetch wrapper with Bearer header; 401 → dispatch auth:unauthorized
- **LoginView** — card with email/password, loading state, aria-live error
- **main.js** — mountApp() / mountLogin() helpers; listens to auth:unauthorized
- **RootLayout** — accepts role prop; hides Dashboard tab if role !== admin
- **Header** — accepts onLogout prop; shows user email + logout button

## Token storage
- Key: `ag_token` — raw JWT
- Key: `ag_user` — JSON { id, email, role }
- Storage: localStorage (persists across tabs/sessions)

## Files
New: AuthService.js, ApiClient.js, LoginView.js, auth.css
Modified: main.js, RootLayout.js, Header.js, index.html
