# Privacy Policy - Get-Together

**Last Updated:** April 1, 2026  
**Effective Date:** April 1, 2026

## 1. Introduction

Get-Together ("we," "our," "us," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process your personal information in connection with our web and mobile applications, and related services (collectively, the "Services").

This Privacy Policy applies to all users of Get-Together, including residents of the European Union (GDPR), California (CCPA), and other jurisdictions. We comply with applicable data protection laws including:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **PIPEDA** (Canada Personal Information Protection and Electronic Documents Act)

## 2. Information We Collect

### 2.1 Information You Provide Directly

**Account Registration:**
- Email address
- Password (hashed via bcrypt, never stored in plaintext)
- Display name (optional)
- Profile avatar (optional URL)

**Profile Information:**
- Display name
- Avatar/profile picture URL
- Timezone/location (optional)

**Content You Create:**
- Group names and descriptions
- Event titles and descriptions
- Wishlist items and descriptions
- Comments and messages
- Availability entries (free/busy blocks)

**Communication:**
- Support requests and feedback
- Emails you send us

### 2.2 Information Collected Automatically

**Usage Data:**
- Pages visited and features used
- Time spent on each page
- Clicks and interactions
- Errors encountered
- Device information (browser, OS, device type)
- IP address (temporary, for security only)

**Cookies & Tracking:**
- Session cookies (for authentication)
- Preference cookies (for UI settings)
- No third-party tracking or analytics cookies

### 2.3 Information from Third Parties

**Authentication Provider (AWS Cognito):**
- Cognito provides user identity verification
- We receive: user ID, verified email, authentication status
- We never receive: passwords or sensitive authentication tokens

**Calendar Integration (Future Phase 2):**
- We read free/busy blocks only (never event details)
- Data cached for max 6 hours
- We never store raw calendar data

## 3. How We Use Your Information

### 3.1 Primary Purposes

1. **To Provide Services**
   - User authentication and account management
   - Facilitating group coordination and event planning
   - Enabling real-time updates and notifications
   - Rendering your profile and content

2. **To Improve Services**
   - Understanding feature usage patterns
   - Identifying bugs and performance issues
   - Planning new features based on user needs
   - Analyzing aggregate (non-personal) usage statistics

3. **To Protect & Secure**
   - Preventing fraud and unauthorized access
   - Enforcing Terms of Service
   - Complying with legal obligations
   - Protecting your data with encryption and access controls

4. **Communication**
   - Responding to support requests
   - Sending service updates and security notices
   - Notifying of policy changes (with your consent for marketing)

### 3.2 Legal Basis (GDPR Article 6)

- **Contract:** Processing necessary to provide Services (login, events, groups)
- **Consent:** For optional features (avatar, display name, calendar sync)
- **Legitimate Interest:** Security, fraud prevention, service improvement
- **Legal Obligation:** Compliance with court orders, law enforcement

## 4. Data Retention & Deletion

### 4.1 Retention Schedule

| Data Category | Retention Period | Legal Basis |
|---|---|---|
| Active User Account | Until deletion | Contract |
| Soft-Deleted Account | 90 days after deletion | GDPR compliance |
| Activity Logs | 30 days, then permanently deleted | Operational necessity |
| Backup Data | 90 days (for disaster recovery) | Operational necessity |
| Audit Logs | 1 year | GDPR Article 32 |

### 4.2 Deletion Upon Account Removal

When you delete your account:
1. Your personal data (email, name, avatar) is immediately nulled
2. Your content (groups, events, comments) is soft-deleted
3. RSVPs and interest reactions are hard-deleted (for data accuracy)
4. All data is permanently deleted after 90 days
5. Backups are deleted after 90 days

**Note:** Comments may remain as "[deleted]" to preserve discussion continuity.

## 5. Data Subject Rights (GDPR Articles 15-22)

### 5.1 Right of Access (Article 15)

You have the right to access all personal data we hold about you in a portable format.

**How to exercise:**
- Click "Export My Data" in account settings
- Or email: privacy@get-together.app
- Response time: Within 30 days (typically within 24 hours)

### 5.2 Right to Rectification (Article 16)

You have the right to correct inaccurate or incomplete personal data.

**How to exercise:**
- Edit your profile (display name, avatar, timezone)
- Changes are immediately reflected
- Update timestamps are recorded for audit trail

### 5.3 Right to Erasure / Right to be Forgotten (Article 17)

You have the right to request deletion of your personal data.

**How to exercise:**
- Click "Delete Account" in account settings
- Confirm your identity
- All data is deleted immediately (soft delete) and permanently after 90 days

### 5.4 Right to Data Portability (Article 20)

You have the right to receive your personal data in a machine-readable format.

**How to exercise:**
- Click "Export My Data" in account settings
- Data is provided as JSON format
- Can be imported into other services

### 5.5 Right to Restrict Processing (Article 18)

You can restrict how we process your data in certain circumstances.

**How to exercise:**
- Email: privacy@get-together.app
- We will mark your account and limit processing

### 5.6 Right to Object (Article 21)

You can object to certain processing including legitimate interest.

**How to exercise:**
- Email: privacy@get-together.app
- We will evaluate your objection within 30 days

## 6. CCPA Rights (California Residents)

If you are a California resident, you have additional rights under CCPA:

### 6.1 Right to Know
You can request what personal information we collect, use, and share.

### 6.2 Right to Delete
You can request deletion of personal information (same as GDPR Article 17).

### 6.3 Right to Opt-Out
We do not sell your personal information. There is nothing to opt out of.

### 6.4 Right to Non-Discrimination
We do not discriminate against you for exercising CCPA rights.

**To exercise CCPA rights:**
- Contact: privacy@get-together.app
- Or click "California Privacy Rights" in footer
- Response time: Within 45 days

## 7. Data Security & Protection

### 7.1 Encryption

- **At Rest:** All data encrypted using AWS KMS (Key Management Service)
- **In Transit:** HTTPS/TLS 1.2+ enforced for all connections
- **HSTS:** HTTP Strict-Transport-Security header prevents downgrade attacks

### 7.2 Access Controls

- Passwords: Never stored in plaintext, hashed with bcrypt (10 rounds)
- Authentication: AWS Cognito manages user identities
- Authorization: Group membership controls data access
- API Keys: Not used; authentication via OAuth 2.0 + JWT tokens

### 7.3 Token Security

- Access Tokens: 30 minutes, stored in HTTP-only secure cookies
- Refresh Tokens: 7 days, auto-rotated
- Tokens: Never logged or exposed in error messages

### 7.4 Privacy by Design

- **Data Minimization:** We collect only what's necessary
- **Purpose Limitation:** Data used only for stated purposes
- **Storage Limitation:** Data deleted per retention schedule
- **Integrity & Confidentiality:** Encrypted at rest and in transit

## 8. Sharing & Disclosure

### 8.1 We Do NOT Share Data With

- ❌ Advertisers or marketing companies
- ❌ Data brokers or aggregators
- ❌ Social media platforms
- ❌ Third-party analytics providers
- ❌ Affiliate networks

### 8.2 We DO Share Data With

**Service Providers** (under data processing agreements):
- AWS (hosting, authentication, encryption)
- Email provider (for notifications)
- Error tracking service (for bug fixes, no PII logged)

**Legal Requirements:**
- Law enforcement with valid court orders
- Regulatory agencies investigating violations
- Public safety emergencies

## 9. International Data Transfers

If you are in the EU, your data may be transferred to the US.

**Legal Basis:**
- Standard Contractual Clauses (SCC) under GDPR
- Adequacy decisions where available
- Your explicit consent

We ensure equivalent protections through encryption and contractual safeguards.

## 10. Children's Privacy

Get-Together is not intended for children under 13 (or applicable legal age).

- We do not knowingly collect data from children
- If we learn we have children's data, we delete it immediately
- Parents can contact: privacy@get-together.app

## 11. Cookies & Tracking Technologies

### 11.1 Session Cookies

Used to maintain your login session:
- Secure flag: Yes (HTTPS only)
- HttpOnly flag: Yes (JavaScript cannot access)
- SameSite: Strict (CSRF protection)
- Expires: 30 minutes of inactivity

### 11.2 Preference Cookies

Used to remember your UI settings:
- Dark mode preference
- Language preference
- Layout preference
- Expires: 1 year

### 11.3 Analytics (None Currently)

We do not use Google Analytics or similar tracking. We may implement privacy-respecting analytics in the future (with opt-out).

## 12. Your Privacy Rights by Jurisdiction

### 12.1 EU (GDPR)
See Sections 5 (Data Subject Rights) and 9 (International Transfers)

### 12.2 California (CCPA)
See Section 6 (CCPA Rights)

### 12.3 Canada (PIPEDA)
- Right of access and correction
- Right to know purposes of collection
- Right to object to marketing communications

**Contact:** privacy@get-together.app

### 12.4 Other Jurisdictions
We comply with applicable privacy laws in all regions where we operate.

## 13. Policy Changes

We may update this Privacy Policy. Significant changes will be notified via:
- Email to registered address
- In-app notification
- Updated "Last Modified" date

Continued use after changes constitutes acceptance of updated policy.

## 14. Contact Information

**Privacy Officer:**  
Email: privacy@get-together.app  
Response time: Within 5 business days

**Mailing Address:**  
Get-Together Privacy Officer  
[Company Address - to be added]

**Data Protection Authority (EU):**  
For complaints, contact your local data protection authority

## 15. California "Do Not Sell My Personal Information"

Get-Together does **not** sell, share, or rent personal information. We do not have a "sale" or "sharing" in the CCPA sense.

**Opt-Out Link:** N/A (we don't sell data)

---

**Document Version:** 1.0  
**Last Updated:** April 1, 2026  
**Status:** Active and Compliant with GDPR, CCPA, PIPEDA

---

*This Privacy Policy is subject to our Terms of Service and Data Processing Addendum (DPA) available upon request.*
