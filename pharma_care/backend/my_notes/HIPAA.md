# Pharmacy Platform — Feature & Security Documentation

## Overview

The pharmacy management platform has been expanded with a set of authentication, security, privacy, usability, and pharmacy-operations features designed to make the system more secure and practical for real-world pharmacy workflows.

The new functionality covers four major areas:

- Authentication & Account Security
- Patient Experience & Privacy
- Pharmacy Dispensing & Controlled-Substance Workflows
- Platform Infrastructure, Localization & Data Isolation

These features build on the existing platform rather than replacing its architecture.

## 1. Patient Authentication

### What was added

The patient authentication system was reviewed and strengthened to provide a reliable login and session-management experience.

Patients can:

- Create accounts
- Log in securely
- Log out
- Maintain authenticated sessions
- Access protected patient functionality
- Recover from expired sessions

Patient accounts are separated from pharmacy administrator and staff accounts through role-based authorization.

### Why it was added

The platform handles sensitive patient and prescription information. Authentication is therefore the first security boundary protecting that information.

A user being authenticated does not automatically mean they should have access to every part of the system. The platform therefore separates authentication — proving who the user is — from authorization — determining what that user is allowed to access.

### How it operates

When a patient signs in:

1. The authentication provider verifies the user’s credentials.
2. A secure authenticated session is established.
3. The application identifies the user’s role.
4. The user is granted access only to authorized patient functionality.
5. Protected backend endpoints independently verify the authenticated session.

Patient authentication does not grant access to pharmacy administrative functionality.

## 2. GitHub OAuth

### What was added

GitHub OAuth authentication was added as an additional sign-in option for:

- Patients
- Pharmacy administrators

OAuth credentials are stored through environment variables rather than hard-coded into the application.

### Why it was added

OAuth provides users with a convenient authentication method while reducing the need for the application to directly manage another password.

It also provides a standardized authentication flow handled by GitHub and the application’s authentication provider.

### How it operates

The flow is:

```
User
  ↓
Selects "Continue with GitHub"
  ↓
GitHub authentication
  ↓
OAuth callback
  ↓
Authentication provider
  ↓
Application session
  ↓
Role-based application access
```

After authentication, the application determines the user’s existing account and role and redirects them to the appropriate part of the platform.
OAuth does not bypass the application’s authorization system.
A GitHub-authenticated patient remains a patient, while a GitHub-authenticated pharmacy administrator remains subject to pharmacy-admin permissions.

## 3. English & French Language Support

### What was added

The platform now supports:

- English
- French

Users can switch between the two languages from the application interface.

### Why it was added

The platform is intended for users who may interact with the system in different languages. Supporting both English and French improves accessibility and makes the platform more appropriate for multilingual pharmacy environments.

### How it operates

User-facing text is managed through a centralized translation system rather than being duplicated throughout individual components.

For example:

- English: "View Prescription"
- French: "Voir l'ordonnance"

The interface loads the appropriate translation based on the user’s selected language.
The selected language is persisted so that the user does not need to change it every time they return to the application.

## 4. Dark / Night Mode

### What was added

A light/dark appearance system was added to the application.

Users can choose:

- Light mode
- Dark mode
- System preference

### Why it was added

Pharmacy staff may use the platform for extended periods, including during evening or nighttime shifts. A dark interface can reduce visual strain and provide a more comfortable viewing experience in low-light environments.

### How it operates

The application uses a centralized theme system so that colors and interface elements can change consistently across the platform.

The selected theme is persisted between sessions.

Dark-mode styling applies across:

- Dashboards
- Navigation
- Forms
- Tables
- Cards
- Modals
- Notifications
- Charts
- Patient interfaces
- Pharmacy interfaces

## 5. Prescription Verification & Secure Archiving

### What was added

The pharmacy system now provides a workflow for validating and preserving electronic prescriptions, particularly prescriptions requiring stronger integrity controls.

Once a prescription reaches a finalized state, the system protects the record from ordinary modification.

Important prescription events are recorded in the audit history.

### Why it was added

Prescription information is highly sensitive and must maintain its integrity throughout its lifecycle.

A pharmacy system should be able to answer questions such as:

- Where did the prescription originate?
- Was it verified?
- Who processed it?
- When was it filled?
- Was it changed?
- Who authorized the dispensing?

Protecting finalized prescription records helps prevent unauthorized manipulation and provides an accountable history of important actions.

### How it operates

The prescription workflow follows a lifecycle similar to:

```
Prescription Received
        ↓
Verification
        ↓
Verification Recorded
        ↓
Prescription Processed
        ↓
Prescription Filled
        ↓
Prescription Finalized
        ↓
Record Protected
        ↓
Audit History Maintained
```

Once finalized, the original prescription information is not simply overwritten.
Changes requiring correction are represented through controlled updates or additional audit/version records.

## 6. Controlled-Substance Daily Log

### What was added

The pharmacy system now maintains a daily dispensing log for controlled-substance transactions.

The log records relevant information about dispensing activity, including:

- Prescription reference
- Medication reference
- Quantity
- Date and time
- Pharmacy
- Staff member
- Dispensing status
- Authorization events

Authorized pharmacists can review and attest to the accuracy of the daily log.

### Why it was added

Controlled-substance dispensing requires a higher degree of accountability than ordinary application activity.

The system therefore creates a persistent record of dispensing activity rather than relying solely on temporary dashboard information.

### How it operates

A typical workflow is:

```
Controlled Prescription
        ↓
Verification
        ↓
Dispensing
        ↓
Dispensing Event Recorded
        ↓
Daily Log Updated
        ↓
Pharmacist Reviews Log
        ↓
Digital Attestation
```

Once an entry has been finalized or signed, ordinary users cannot silently modify the historical record.

## 7. Audit Trail

### What was added

A centralized audit trail records security-sensitive pharmacy operations.

Examples include:

- Prescription creation
- Prescription modification
- Prescription verification
- Prescription filling
- Prescription cancellation
- Dispensing authorization
- Dispensing completion
- Staff re-authentication
- Pickup verification
- Digital attestations
- Failed authorization attempts

### Why it was added

A secure pharmacy system should not only store the current state of a record. It should also provide historical accountability.

The audit trail makes it possible to determine:

Who performed an action, what happened, and when it happened.

This is particularly important when investigating errors, unauthorized activity, or suspicious changes.

### How it operates

Instead of silently overwriting sensitive historical events, the system records important actions as audit events.

For example:

```
Prescription #4821
    ↓
Filled by Staff A
    ↓
Dispensed at 14:32
    ↓
Staff A re-authenticated
    ↓
Pickup verified
```

If someone attempts to alter a finalized prescription or dispensing record through an unauthorized workflow, the event can be detected and flagged.

## 8. Pharmacist Re-Authentication Before Dispensing

### What was added

An additional authentication step is required before a pharmacist or authorized staff member completes the physical release of a controlled medication.

Supported authentication mechanisms can include secure methods such as:

- PIN
- Password re-authentication
- Passkey/WebAuthn
- Platform-supported biometric authentication

### Why it was added

Being logged into a workstation does not necessarily prove that the person physically authorizing a dispensing transaction is the person whose account is currently being used.

Re-authentication creates a stronger connection between:

```
Staff Member
       ↓
Authentication
       ↓
Dispensing Authorization
       ↓
Specific Prescription
       ↓
Recorded Audit Event
```

### How it operates

Before dispensing is finalized:

1. The staff member initiates dispensing.
2. The application requests re-authentication.
3. The authentication mechanism verifies the staff member.
4. The system records the authorization event.
5. Dispensing can proceed only if authentication succeeds.

Biometric information itself is not stored in the pharmacy database.

## 9. Privacy-Safe Notifications

### What was added

External notifications are intentionally designed to avoid exposing prescription information.

Push notifications, SMS messages, and similar external notifications do not contain:

- Medication names
- Dosages
- Controlled-substance information
- Detailed prescription information

Instead, users receive generic messages such as:

> “You have a new prescription update. Log in to your secure account to view details.”

### Why it was added

Notifications may appear on:

- Lock screens
- Shared devices
- Notification centers
- SMS previews
- Email previews

Displaying a medication name or prescription detail outside the authenticated application could expose sensitive health information to someone who can see the device.

### How it operates

The notification contains only a generic message.

The user must:

```
Notification
     ↓
Open Application
     ↓
Authenticate
     ↓
Access Secure Patient Area
     ↓
View Prescription Details
```

The sensitive information remains inside the authenticated application.

## 10. Pickup Identity Verification

### What was added

The patient pickup workflow supports recording identity verification when required by the pharmacy’s policy or applicable requirements.

Pharmacy staff can record that the patient’s identity was verified before completing the pickup.

The system records information such as:

- Pickup transaction
- Verification status
- Staff member
- Timestamp
- Verification method/type

### Why it was added

The person collecting a prescription may not necessarily be the person associated with the prescription.

A documented identity-verification workflow provides an additional safeguard for prescription pickup.

### How it operates

A typical workflow is:

```
Patient Schedules Pickup
        ↓
Patient Arrives
        ↓
Staff Requests Required Identification
        ↓
Staff Performs Verification
        ↓
Verification Recorded
        ↓
Pickup Completed
```

The system does not unnecessarily store copies of government-issued identification.

## 11. Patient Session Locking

### What was added

The patient application includes stricter session protection when the application has been inactive or placed in the background.

After the configured inactivity period, sensitive patient information is locked until the patient re-authenticates.

### Why it was added

Patients may leave the application open on their phones or shared devices.

Without an inactivity control, another person could potentially access prescription information simply by picking up an unlocked device.

### How it operates

The workflow is:

```
Patient Logged In
      ↓
Application Active
      ↓
Application Backgrounded / Inactive
      ↓
Security Timer
      ↓
Session Locked
      ↓
Re-authentication Required
      ↓
Patient Regains Access
```

Re-authentication can use mechanisms supported by the platform, such as:

- Device biometrics
- Passkeys
- Secure PIN
- Existing credentials

The backend continues to enforce authentication and authorization independently of the frontend inactivity timer.

## 12. Mandatory MFA for Pharmacy Staff

### What was added

Multi-factor authentication is required for pharmacy staff accessing sensitive pharmacy functionality.

Possible authentication factors include:

- Password + TOTP
- Passkey
- Security key
- Other supported strong MFA mechanisms

### Why it was added

Pharmacy staff accounts have access to significantly more sensitive information and functionality than ordinary patient accounts.

A stolen password should therefore not be sufficient to gain access to the pharmacy backend.

### How it operates

The authentication process becomes:

```
Username / Password
       ↓
Primary Authentication
       ↓
MFA Challenge
       ↓
MFA Verification
       ↓
Authorized Pharmacy Session
```

A user who has authenticated with a password but has not completed the required MFA process cannot access protected pharmacy operations.

## 13. Role-Based Access Control

### What was added

The platform maintains distinct access boundaries for different types of users.

The primary roles include:

- **Patient**
  - Can access:
    - Their own profile
    - Their prescriptions
    - Their orders
    - Their messages
    - Their notifications
    - Their pharmacy interactions
- **Pharmacy Staff**
  - Can access authorized pharmacy operations such as:
    - Prescription processing
    - Dispensing
    - Pickup workflows
    - Pharmacy records
    - Operational dashboards
- **Pharmacy Administrator**
  - Can access authorized administrative functionality such as:
    - Pharmacy configuration
    - Staff management
    - Pharmacy operations
    - Administrative dashboards

### Why it was added

Authentication alone is insufficient for a multi-tenant pharmacy platform.

The system must determine not only:

> “Who are you?”

but also:

> “What are you allowed to access?”

## 14. Multi-Tenant Database Isolation

### What was added

The platform’s database access was strengthened to maintain separation between pharmacies and users.

A pharmacy should only be able to access the records belonging to its authorized tenant.

### Why it was added

The platform contains data belonging to multiple pharmacies.

A vulnerability allowing Pharmacy A to retrieve Pharmacy B’s records would be a serious security issue.

### How it operates

Tenant-aware authorization is enforced through backend authorization and database-level controls such as Row Level Security where applicable.

Conceptually:

```
User
 ↓
Authentication
 ↓
Role
 ↓
Pharmacy / Tenant
 ↓
Authorization
 ↓
Database Access
```

The application does not simply trust a pharmacy ID supplied by the frontend.
The backend and database authorization layer validate whether the authenticated user is actually allowed to access that tenant’s data.

## 15. Separation of Messaging/Marketing Data

### What was added

Patient-facing messaging and marketing functionality is logically separated from core pharmacy and dispensing information.

### Why it was added

The platform contains different categories of data with different sensitivity levels.

For example:

```
Marketing Data
    ↓
Announcements
Campaigns
General Messages
```

should not automatically provide access to:

```
Core Pharmacy Data
    ↓
Prescriptions
Patient Records
Dispensing Records
Controlled-Substance Data
```

Separating these areas reduces the potential impact of a compromise in a lower-sensitivity feature.

### How it operates

Access to core pharmacy information requires explicit authorization.

A user who can access messaging functionality does not automatically gain access to prescription or dispensing tables.

Database policies, backend authorization, and tenant isolation work together to enforce these boundaries.

## 16. Secure Environment Configuration

### What was added

Sensitive credentials are managed through environment variables rather than application source code.

Examples include:

- OAuth credentials
- Supabase credentials
- Server secrets
- Third-party API credentials
- Encryption/signing secrets

### Why it was added

Credentials embedded in source code can accidentally be exposed through:

- Git repositories
- GitHub
- Browser bundles
- Code-sharing
- Logs
- Screenshots

Separating secrets from application code reduces the likelihood of accidental exposure.

### How it operates

Development and production environments provide their own configuration values.

For example:

```
GITHUB_CLIENT_ID=<secret>
GITHUB_CLIENT_SECRET=<secret>
```

The actual secret values are not committed to the repository.

## 17. Overall Security Architecture

The new features work together rather than functioning as isolated features.

The resulting security model can be summarized as:

```
                    ┌─────────────────────┐
                    │     User Login      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Authentication /    │
                    │ OAuth / MFA         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Role Verification   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          Patient         Pharmacy Staff    Admin
              │                │                │
              ▼                ▼                ▼
       Patient Data       Pharmacy Data    Admin Data
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Tenant / RLS /      │
                    │ Backend Authorization│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Protected Database  │
                    └─────────────────────┘
```

Sensitive pharmacy operations receive additional protections:

```
Prescription
     ↓
Verification
     ↓
Processing
     ↓
Filling
     ↓
Staff Re-authentication
     ↓
Dispensing
     ↓
Audit Event
     ↓
Daily Log / Attestation
```

## 18. User Experience Improvements

Alongside the security improvements, the platform now provides a more accessible and customizable experience.

Users can:

- Choose English or French
- Choose light or dark mode
- Authenticate through supported OAuth providers
- Receive privacy-safe prescription notifications
- Securely access their prescription information
- Use protected pickup workflows

Pharmacy staff receive additional safeguards because their accounts have access to sensitive operational and patient information.

## 19. Feature Summary

| Feature | Purpose | Primary Users |
| --- | --- | --- |
| Patient Authentication | Secure patient account access | Patients |
| GitHub OAuth | Convenient alternative authentication | Patients/Admins |
| English/French | Multilingual accessibility | All users |
| Dark Mode | Improved usability and accessibility | All users |
| Prescription Verification | Protect prescription integrity | Pharmacy |
| Prescription Archiving | Preserve finalized records | Pharmacy |
| Controlled-Substance Log | Track dispensing activity | Pharmacy |
| Audit Trail | Provide accountability | Pharmacy/Admin |
| Staff Re-authentication | Confirm dispensing authorization | Pharmacy Staff |
| Privacy-Safe Notifications | Prevent sensitive information exposure | Patients |
| Pickup Verification | Confirm identity at pickup | Patients/Staff |
| Session Locking | Protect unattended patient sessions | Patients |
| Staff MFA | Protect privileged accounts | Pharmacy Staff/Admin |
| Role-Based Access | Prevent unauthorized functionality | All users |
| Tenant Isolation | Prevent cross-pharmacy access | All users |
| Data Separation | Limit exposure between system domains | Platform |
| Environment Secrets | Protect credentials | Platform |

## 20. Result

The platform has evolved from a basic pharmacy-management application into a more security-conscious, multi-role system with stronger controls around authentication, prescription handling, dispensing, patient privacy, and pharmacy data isolation.

The most important architectural principle is that security is enforced at multiple layers:

```
Authentication
      +
Authorization
      +
MFA
      +
Session Security
      +
Database/RLS Controls
      +
Tenant Isolation
      +
Audit Logging
      +
Operational Verification
```

This layered approach ensures that no single frontend control is treated as the sole security mechanism.

The platform’s technical controls are designed to support secure pharmacy operations and privacy-conscious handling of patient information. Regulatory compliance, however, also depends on deployment configuration, pharmacy policies, staff procedures, applicable state/federal requirements, contractual safeguards, and appropriate professional/legal compliance review.
