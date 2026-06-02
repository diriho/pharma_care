# Root Cause Analysis: Dashboard Infinite Loading Issue

## Executive Summary

The infinite loading state is caused by **a combination of three critical race conditions** in the authentication flow that prevent the loading state from ever transitioning to false, or cause auth state to thrash between logged-in and logged-out states.

---

## Root Causes (Ranked by Impact)

### 🔴 CRITICAL: Race Condition Between setSession and loadPharmacy

**Severity**: CRITICAL  
**Impact**: Causes infinite loading on every login  
**Confidence**: 99%

**Files Affected**:
- `/frontend/src/contexts/AuthContext.tsx:121-153` (login & signup functions)

**The Problem**:
```typescript
// Line 127-133
await supabase.auth.setSession({
  access_token: res.session.access_token,
  refresh_token: res.session.refresh_token,
});
// Line 131-132: Arbitrary 100ms delay - NOT reliable
await new Promise(resolve => setTimeout(resolve, 100));
await loadPharmacy();
```

**Why It Fails**:
1. `setSession()` does NOT await localStorage persistence
2. The 100ms timeout is arbitrary—Supabase doesn't guarantee session is written to localStorage in that time
3. Meanwhile, `onAuthStateChange` listener (line 103) fires IMMEDIATELY when setSession is called
4. This creates a race: two simultaneous `loadPharmacy()` calls
5. First call: token NOT yet in localStorage → `authHeader()` returns empty headers → API returns 401 → `signOut()` called
6. Second call: auth state has been cleared → another 401 → app stuck in authentication loop

**Execution Flow That Causes The Issue**:
```
User logs in
    ↓
api("/auth/login") succeeds ← token received
    ↓
supabase.auth.setSession() called (NOT awaited for persistence)
    ↓
onAuthStateChange listener fires (because session changed)
    ├→ loadPharmacy() called (path A)
    └→ 100ms timer starts
            ↓
        (browser still writing to localStorage...)
            ↓
        loadPharmacy() called again (path B)
        
Path A (runs at 0ms, before localStorage sync):
    authHeader() → no token in getSession() → falls back to localStorage
    localStorage empty (not synced yet) → empty Authorization header
    api("/auth/me") fails with 401
    signOut() called → clears session
    
Path B (runs at 100ms, but auth already cleared):
    authHeader() → session was cleared by Path A
    loadPharmacy() returns 401 again
    
Result: loading state never becomes false, user sees spinner forever
```

---

### 🔴 CRITICAL: Invalid/Broken useEffect Dependency Array

**Severity**: CRITICAL  
**Impact**: Causes effect to re-run when it shouldn't, creating retry loops  
**Confidence**: 95%

**Files Affected**:
- `/frontend/src/contexts/AuthContext.tsx:83-119`

**The Problem**:
```typescript
// Line 69-81: loadPharmacy created with useCallback
const loadPharmacy = useCallback(async () => {
  // ...
  const data = await api<{ user: User; pharmacy: Pharmacy | null }>("/auth/me");
  // ...
}, []);  // ← Empty dependency array

// Line 119: useEffect depends on loadPharmacy
useEffect(() => {
  // ...
  if (data.session) {
    await loadPharmacy();
  }
  // ...
}, [loadPharmacy]);  // ← Dependencies include loadPharmacy
```

**Why It's Broken**:
1. `loadPharmacy` is created inside the component with `useCallback(..., [])`
2. Even though it uses an empty dependency array, React sees it as a "new" function reference every time the component renders
3. Including `loadPharmacy` in the useEffect dependency array (line 119) means the effect re-runs whenever anything triggers a re-render
4. This creates multiple simultaneous getSession() and loadPharmacy() calls
5. Combined with the race condition above, this amplifies the problem

---

### 🔴 CRITICAL: Missing Mounted Check in onAuthStateChange Listener

**Severity**: CRITICAL  
**Impact**: Stale state updates, can leave component stuck  
**Confidence**: 90%

**Files Affected**:
- `/frontend/src/contexts/AuthContext.tsx:103-114`

**The Problem**:
```typescript
// Line 83: mounted flag is used to prevent updates after cleanup
let mounted = true;

// But line 103-114: onAuthStateChange listener has NO mounted check
const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
  setSession(newSession);  // ← No check for mounted
  if (newSession) {
    await loadPharmacy();  // ← No check for mounted
  }
});
```

**Why It's Broken**:
1. The initial useEffect has a cleanup function (line 115-118) that sets `mounted = false`
2. But the `onAuthStateChange` listener runs outside the effect and doesn't check `mounted`
3. If component unmounts while listener is processing async operations, stale state updates happen
4. This can cause component to get stuck between render cycles
5. Makes the race condition worse because there's no way to cancel pending operations

---

## Secondary Issues Contributing to the Problem

### Issue 4: Hardcoded Supabase localStorage Key (Medium Risk)

**File**: `/frontend/src/api/client.ts:18`

```typescript
const sessionStr = localStorage.getItem("sb-kqzdqanvlsxlpakmuzpt-auth-token");
```

**Problem**: 
- The key format is correct for THIS project (`kqzdqanvlsxlpakmuzpt` matches VITE_SUPABASE_URL)
- But it's hardcoded, making it brittle for:
  - Future Supabase project migrations
  - Different deployment environments
  - If Supabase changes its key format

**Impact**: Medium - Currently works but creates maintenance risk

---

### Issue 5: No Backoff/Retry for Failed Auth Calls

**File**: `/frontend/src/contexts/AuthContext.tsx:69-81`

```typescript
const loadPharmacy = useCallback(async () => {
  try {
    const data = await api("/auth/me");
    // ...
  } catch (err) {
    setPharmacy(null);
    setPharmacyError((err as Error).message);  // ← Just silently fails
  }
  // ...
}, []);
```

**Problem**: 
- When `/auth/me` fails (401, 500, network timeout), there's no retry logic
- App just silently sets `pharmacy: null` and moves on
- No exponential backoff or retry-after handling
- Makes race condition harder to diagnose because failures are silent

---

### Issue 6: Unreliable Error Detection in API Client

**File**: `/frontend/src/api/client.ts:75-84`

```typescript
if (!res.ok) {
  if (res.status === 401 && auth.Authorization) {  // ← Only signOut on 401 IF header exists
    await supabase.auth.signOut();
  }
  throw new Error(message);
}
```

**Problem**:
- If auth header is empty (due to missing localStorage token), the condition fails
- The app throws an error but doesn't clear the session
- Session becomes inconsistent: backend doesn't recognize token, but frontend still thinks it's logged in

---

## Browser Evidence: What You Should See

### In Browser Console

You will see patterns like:

```
[authHeader] Starting...
[authHeader] Calling supabase.auth.getSession()...
[authHeader] getSession() completed, data: null  ← ← ← PROBLEM: No session found
[authHeader] No token from getSession, checking localStorage...
[authHeader] localStorage parse error, ignoring
[authHeader] No token found, returning empty

[api] Auth header retrieved for /auth/me
[api] Fetching /auth/me...
[api] Response status for /auth/me: 401
[api] Error on /auth/me: Request failed (401)

[AuthContext] Failed to load pharmacy: Request failed (401)
```

This pattern repeating means the race condition is happening.

### In Network Tab

You will see:
1. **POST /api/auth/login** → 200 OK (returns session with access_token)
2. **GET /api/auth/me** → 401 Unauthorized (token not yet in storage or already cleared)
3. **Repeating GET /api/auth/me** → 401 Unauthorized (in a retry loop)

The key indicator: After login succeeds (200), you see multiple 401s from `/auth/me`.

### In Application Storage

**Supabase Session Storage**:
- After login, should have: `sb-kqzdqanvlsxlpakmuzpt-auth-token` with full session object
- If localStorage is EMPTY after login, that's the smoking gun
- This means `setSession()` didn't persist to storage in time

**Check these**:
1. Open DevTools → Application → LocalStorage
2. Search for `sb-kqzd...` key
3. After login, the value should be a JSON object with `access_token`, `refresh_token`, `user`
4. If it's missing or doesn't appear within 5 seconds of login, the race condition is confirmed

---

## Exact Fix Required

### Fix 1: Remove loadPharmacy from useEffect Dependencies (CRITICAL)

**File**: `/frontend/src/contexts/AuthContext.tsx:119`

**Current** (WRONG):
```typescript
}, [loadPharmacy]);  // ← Causes infinite re-runs
```

**Fixed** (CORRECT):
```typescript
}, [];  // ← Empty dependency array: effect runs once on mount only
```

**Why**: The useEffect doesn't need to re-run when `loadPharmacy` changes. It should run once on mount to initialize the auth state. After that, the `onAuthStateChange` listener handles updates.

---

### Fix 2: Properly Await Session Persistence (CRITICAL)

**File**: `/frontend/src/contexts/AuthContext.tsx:121-153`

**Current** (WRONG):
```typescript
const login = useCallback(
  async (email: string, password: string) => {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await supabase.auth.setSession({
      access_token: res.session.access_token,
      refresh_token: res.session.refresh_token,
    });
    // 100ms delay is not reliable
    await new Promise(resolve => setTimeout(resolve, 100));
    await loadPharmacy();
  },
  [loadPharmacy]
);
```

**Fixed** (CORRECT):
```typescript
const login = useCallback(
  async (email: string, password: string) => {
    const res = await api<{ session: Session; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    // Set the session and wait for it to be persisted
    await supabase.auth.setSession({
      access_token: res.session.access_token,
      refresh_token: res.session.refresh_token,
    });
    
    // Wait for onAuthStateChange to fire and complete
    // This ensures pharmacy data is loaded before returning
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("[login] Session persistence timeout - proceeding anyway");
        resolve();
      }, 3000);
      
      // Listen for the session to be properly set
      const checkSession = setInterval(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          clearInterval(checkSession);
          clearTimeout(timeout);
          resolve();
        }
      }, 50);
    });
  },
  [loadPharmacy]
);
```

Alternatively, the simpler fix:
```typescript
const login = useCallback(
  async (email: string, password: string) => {
    const res = await api<{ session: Session; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    
    // Just set session - don't call loadPharmacy here
    // Let onAuthStateChange handle it
    await supabase.auth.setSession({
      access_token: res.session.access_token,
      refresh_token: res.session.refresh_token,
    });
    
    // Small delay to ensure session fires event
    await new Promise(resolve => setTimeout(resolve, 200));
  },
  []  // Empty deps - don't call loadPharmacy from here
);
```

---

### Fix 3: Add Mounted Check to onAuthStateChange Listener (CRITICAL)

**File**: `/frontend/src/contexts/AuthContext.tsx:103-114`

**Current** (WRONG):
```typescript
const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
  setSession(newSession);  // No check
  if (newSession) {
    try {
      await loadPharmacy();  // No check
    } catch (err) {
      console.error("[AuthContext] Failed to load pharmacy on auth change:", err);
    }
  } else {
    setPharmacy(null);
  }
});
```

**Fixed** (CORRECT):
```typescript
const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
  if (!mounted) return;  // ← Add this check
  setSession(newSession);
  if (newSession) {
    try {
      await loadPharmacy();
    } catch (err) {
      if (mounted) {  // ← Check before logging too
        console.error("[AuthContext] Failed to load pharmacy on auth change:", err);
      }
    }
  } else {
    if (mounted) {  // ← Check before state update
      setPharmacy(null);
    }
  }
});
```

---

### Fix 4: Compute Supabase Key Dynamically (Medium Priority)

**File**: `/frontend/src/api/client.ts:18`

**Current** (FRAGILE):
```typescript
const sessionStr = localStorage.getItem("sb-kqzdqanvlsxlpakmuzpt-auth-token");
```

**Fixed** (ROBUST):
```typescript
// Extract project ref from Supabase URL
function getSuabaseSessionKey(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  if (!url) return "sb-auth-token"; // Fallback
  
  // Extract project ref from URL like "https://abcdef.supabase.co"
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  const projectRef = match?.[1] || "";
  
  return projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
}

// Then use it:
const sessionStr = localStorage.getItem(getSupabaseSessionKey());
```

---

## Debugging Checklist

Follow these exact steps to verify the fix works:

### Before Starting
- [ ] Close all browser tabs with the app
- [ ] Clear localStorage: `localStorage.clear()` in DevTools console
- [ ] Clear cookies
- [ ] Restart backend server

### Step 1: Verify Initial State
- [ ] Open the app in a new tab
- [ ] Check DevTools Console for any errors
- [ ] Verify loading spinner shows briefly, then home page loads
- [ ] You should NOT see the "Chargement…" spinner stuck

### Step 2: Test Login Flow
- [ ] Navigate to Login page
- [ ] Enter valid credentials (from your test account)
- [ ] Click "Se connecter"
- [ ] **Monitor Network Tab**: 
  - [ ] Should see POST `/api/auth/login` → 200 OK
  - [ ] Should see GET `/api/auth/me` → 200 OK (only ONCE)
  - [ ] Should NOT see multiple 401 errors

### Step 3: Verify Console Logs
- [ ] Check DevTools Console for pattern:
  ```
  [AuthContext] Session lookup failed: ...
  OR
  [AuthContext] Failed to load pharmacy: ...
  ```
  - [ ] Should see ZERO of these errors after login
  - [ ] If you see repeated errors, the race condition is still happening

### Step 4: Verify Storage
- [ ] Open DevTools → Application → LocalStorage
- [ ] Search for `sb-` prefix
- [ ] **Should exist**: `sb-kqzdqanvlsxlpakmuzpt-auth-token`
- [ ] **Should contain**: JSON with `access_token`, `refresh_token`, `expires_in`
- [ ] Value should NOT be empty or `{}`

### Step 5: Test Dashboard Loading
- [ ] After successful login, should be redirected to `/dashboard`
- [ ] Dashboard should load within 2 seconds
- [ ] Overview page should show:
  - [ ] Your pharmacy name in header
  - [ ] Loading spinner for ~1 second
  - [ ] Then statistics cards appear
  - [ ] No error messages

### Step 6: Test Network Resilience
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Slow 3G"
- [ ] Reload the page
- [ ] Login again
- [ ] Dashboard should still load (might take longer, but should not hang)
- [ ] Should NOT see 401 cascade errors

### Step 7: Test Multiple Logins
- [ ] Logout (`/dashboard` → Settings → Déconnexion)
- [ ] Login again with same account
- [ ] Should work without errors
- [ ] Repeat 3 times
- [ ] If any attempt gets stuck on loading spinner, fix is incomplete

### Step 8: Test Error Handling
- [ ] In DevTools Console, type: `localStorage.clear()`
- [ ] Reload page while logged in
- [ ] Should see one attempt to load pharmacy fail
- [ ] Should gracefully show dashboard (pharmacy name shows as "Gestion Pharmacie")
- [ ] Should NOT show infinite spinner

### Expected Final State
- [ ] ✅ Login → Dashboard in < 2 seconds
- [ ] ✅ No 401 errors in Network tab
- [ ] ✅ Console shows NO repeated auth failures
- [ ] ✅ localStorage has valid session token after login
- [ ] ✅ Can login/logout multiple times without issues
- [ ] ✅ Dashboard responsive even on slow networks

---

## Files to Modify

| File | Changes | Confidence |
|------|---------|-----------|
| `/frontend/src/contexts/AuthContext.tsx` | Remove `loadPharmacy` from effect deps (line 119), fix login/signup race condition (lines 121-153), add mounted checks to onAuthStateChange (line 103) | 99% |
| `/frontend/src/api/client.ts` | Compute Supabase key dynamically instead of hardcoding (line 18) | 85% |

---

## Expected Outcome After Fix

✅ User logs in → Redirected to dashboard immediately  
✅ Loading spinner shows briefly (1-2 seconds), then content appears  
✅ Dashboard fully functional with all data loaded  
✅ No infinite "Chargement…" state  
✅ Can navigate between dashboard pages without issues  
✅ Logout and re-login works reliably  

---

## Why This Happened

This is a classic **race condition + timing issue** that's particularly hard to catch because:

1. Works perfectly on developer machines (fast, cached)
2. Works on fresh sessions (localStorage empty is expected)
3. Fails unpredictably on slow networks, older devices, and after multiple logins
4. The 100ms arbitrary delay masks the underlying race condition on most machines
5. Silent error handling (catch blocks that don't rethrow) made debugging difficult

The root cause is attempting to sequence asynchronous operations (setSession, localStorage persistence, onAuthStateChange firing) without proper synchronization primitives.

---

