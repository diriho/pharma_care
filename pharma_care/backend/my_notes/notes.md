# Root Cause Analysis: Row-Level Security (RLS) Error

## Overview

The Row-Level Security (RLS) failures were caused by the backend's shared **service-role Supabase client** being unintentionally downgraded to an authenticated user client.

This behavior caused backend operations that should have bypassed RLS to instead execute under the permissions of the last logged-in user.

---

## Root Cause

The authentication routes (`login` and `signup`) called:

```ts
admin.auth.signInWithPassword(...)
```

using the shared **service-role** Supabase client.

Although the client was configured with:

```ts
persistSession: false
```

the `supabase-js` library still stores the authenticated session **in memory** for that client instance.

As a result, every subsequent call made through the shared `admin` client—including:

- Database queries (`.from()`)
- Storage operations (`.storage()`)

was sent using the most recently authenticated user's JWT instead of the service-role credentials.

This caused backend requests to execute as a normal authenticated user rather than as `service_role`, which bypasses RLS.

---

## Impact

After any successful login, backend operations performed on behalf of another user began failing due to RLS policies.

Affected operations included:

- Patient account creation
- `medication_orders` inserts
- Ratings creation
- Any other backend write requiring service-role privileges

Typical failures resembled:

```sql
new row violates row-level security policy
WITH CHECK (... = auth.uid())
```

Because the shared client retained the last authenticated session, the problem persisted until the server restarted.

This explains why:

- The application appeared to work immediately after a restart.
- Only certain actions failed.
- Logging in as different users changed which operations broke.

---

## Verification

The issue was reproduced and validated through multiple tests.

### Before the Fix

- A freshly created service-role client successfully inserted records into `medication_orders`.
- The same insert executed through the running backend failed with the expected RLS error.

### After the Fix

A complete end-to-end validation was performed by:

1. Logging in as a pharmacy user.
2. Executing the complete patient workflow.
3. Performing all backend write operations.

All validation steps completed successfully without triggering any RLS violations.

---

## Solution

A new factory function was introduced:

```ts
credentialClient()
```

located in:

```
client.ts
```

Instead of authenticating through the shared service-role client, the factory creates a **temporary anonymous-key Supabase client** exclusively for credential verification.

### Updated Authentication Flow

All instances of:

```ts
admin.auth.signInWithPassword(...)
```

within:

```
auth/routes.ts
```

were replaced with calls using the temporary client.

Additionally:

- Warning comments were added to the shared `admin` client to prevent future misuse.
- The shared service-role client is now reserved exclusively for privileged backend operations.

---

## Security Assessment

No security policies were modified during this fix.

Specifically:

- ✅ No RLS policies were weakened.
- ✅ The existing RLS configuration was verified to be correct.
- ✅ The `sb_secret_...` service-role key was functioning properly.
- ✅ Backend service-role privileges remain intact.

The issue originated solely from authentication state being stored on the shared client instance.

---

## Frontend Verification

The frontend was audited as part of the investigation.

Findings:

- The frontend does **not** write directly to Supabase.
- All database mutations are performed through the backend.
- Existing frontend behavior was confirmed to be correct.
- No frontend changes were required to resolve the issue.