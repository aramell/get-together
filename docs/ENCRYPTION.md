# Data Encryption & Security Architecture

This document describes the encryption, data protection, and security measures implemented in get-together to protect user privacy and comply with GDPR/CCPA requirements.

## Table of Contents

1. [Encryption at Rest](#encryption-at-rest)
2. [Encryption in Transit](#encryption-in-transit)
3. [Application-Level Encryption](#application-level-encryption)
4. [Key Management](#key-management)
5. [Token Security](#token-security)
6. [Data Subject Rights](#data-subject-rights)
7. [Security Compliance](#security-compliance)
8. [Implementation Guide](#implementation-guide)

## Encryption at Rest

All sensitive data stored in the Aurora PostgreSQL database is encrypted at rest using AWS Key Management Service (KMS).

### Configuration

**Database Encryption:**
- Aurora PostgreSQL cluster with AWS KMS encryption enabled
- Master key: AWS-managed or customer-managed KMS key
- Automatic encryption of all tables and backups
- Transparent to application code (no code changes required)

**Verification:**
```sql
-- Check encryption status in Aurora
SELECT datname, spcname
FROM pg_database
JOIN pg_tablespace ON pg_database.dattablespace = pg_tablespace.spcoid
WHERE datname = 'get_together';
```

### What Gets Encrypted

- `users` table (all columns including email)
- `groups` table (group data and metadata)
- `event_proposals` table (event details)
- `event_rsvps` table (RSVP data)
- `public_rsvps` table (public event RSVPs - hashed emails)
- `wishlist_items` table (items and descriptions)
- `comments` table (comment content)
- `availabilities` table (availability blocks)
- All backups and snapshots

## Encryption in Transit

All data transmitted between client and server is encrypted using HTTPS/TLS 1.2 or higher.

### Configuration

**API Gateway / Load Balancer:**
- TLS 1.2 minimum enforced (no TLS 1.0 or 1.1)
- TLS 1.3 supported when available
- Modern cipher suites only (no deprecated ciphers)
- Certificate issued by AWS Certificate Manager (auto-renewed)

**HSTS (HTTP Strict-Transport-Security):**
- Enabled on all API responses
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- Prevents downgrade attacks to HTTP
- Browsers remember HSTS requirement for 1 year

**Other Security Headers:**
- `X-Content-Type-Options: nosniff` — Prevent MIME sniffing attacks
- `X-Frame-Options: DENY` — Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` — Enable XSS filter in older browsers
- `Content-Security-Policy` — Whitelist allowed resources
- `Referrer-Policy: strict-origin-when-cross-origin` — Limit referrer information

### Verification

**Check TLS Configuration:**
```bash
# Use SSLLabs or similar online tools
# https://www.ssllabs.com/ssltest/analyze.html?d=get-together.example.com

# Or test locally with openssl
openssl s_client -connect api.example.com:443 -tls1_2
```

**Verify HSTS Header:**
```bash
curl -i https://api.example.com/api/health
# Should return:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Application-Level Encryption

Beyond database and network encryption, sensitive fields are additionally hashed at the application level.

### Email Hashing

Emails are hashed using bcrypt (OWASP recommended) in several contexts:

**User Registration:**
- New user emails are NOT hashed in users table (allows email-based lookups)
- Passwords hashed by AWS Cognito (application never handles raw passwords)

**Public Event RSVPs:**
- Email field in `public_rsvps` table is hashed using bcrypt
- Prevents disclosure of public RSVP participants' emails
- Hashing implementation: `lib/encryption/hash.ts`

**Implementation:**

```typescript
import { hashEmail, verifyEmailHash } from '@/lib/encryption/hash';

// Create public RSVP with hashed email
const hashedEmail = await hashEmail(userEmail);
await db.query(
  'INSERT INTO public_rsvps (event_id, email, name, status) VALUES ($1, $2, $3, $4)',
  [eventId, hashedEmail, userName, status]
);

// Later: verify email matches stored hash
const isMatch = await verifyEmailHash(userEmail, storedHash);
```

### Bcrypt Configuration

- **Rounds:** 10 (standard for production, balances security and performance)
- **Time Complexity:** ~100ms per hash operation (acceptable for authentication flows)
- **Salt:** Automatically generated per hash (prevents rainbow table attacks)
- **Algorithm:** bcrypt with Blowfish cipher

**Why bcrypt?**
- Purpose-built for password/sensitive-data hashing
- Slow-by-design (resists brute force attacks)
- OWASP Top 10 compliant
- No rainbow table attacks possible (unique salt per hash)

## Key Management

### AWS KMS Configuration

**Master Key Setup:**
```bash
# Create KMS key for database encryption (AWS Console or CLI)
aws kms create-key --description "get-together database encryption key"

# Enable automatic key rotation (annual)
aws kms enable-key-rotation --key-id <key-id>

# Set key policy to restrict access to application IAM role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Enable IAM policies",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account-id>:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow RDS to use the key",
      "Effect": "Allow",
      "Principal": {
        "Service": "rds.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:CreateGrant"
      ],
      "Resource": "*"
    }
  ]
}
```

**Key Rotation:**
- Automatic annual rotation enabled
- Old keys remain usable for decrypting existing data
- No manual key management required
- Rotation is transparent to application

### Application Perspective

**The application never directly handles encryption keys.** All key management is delegated to AWS KMS:
- No hardcoded keys in code or config files
- No need for key distribution or secure storage
- AWS handles key rotation automatically
- Audit logs show all key access

## Token Security

Authentication tokens are managed securely to prevent XSS and CSRF attacks.

### Token Storage

**httpOnly Cookies (Recommended):**
```typescript
// Set token in httpOnly, Secure, SameSite cookie
res.setHeader('Set-Cookie', [
  `accessToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`, // 30 min
  `refreshToken=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` // 7 days
]);
```

**Why NOT localStorage?**
- localStorage is accessible to JavaScript (vulnerable to XSS attacks)
- httpOnly cookies cannot be accessed by JavaScript
- Secure flag ensures cookies only sent over HTTPS
- SameSite flag prevents CSRF attacks

### Token Lifetime

**Access Token:**
- Lifetime: 30 minutes
- Used for API requests
- Short-lived reduces impact of token theft
- Automatic refresh before expiry

**Refresh Token:**
- Lifetime: 7 days
- Stored in httpOnly cookie
- Used only to request new access token
- Longer-lived allows persistent sessions

**Automatic Refresh Flow:**
```typescript
// Client automatically refreshes access token
if (accessTokenExpired()) {
  const newToken = await fetch('/api/auth/refresh', { credentials: 'include' });
  // Browser sends refresh token cookie automatically
  // Server responds with new access token
}
```

## Data Subject Rights

Implementation of GDPR Article 15 (Access) and Article 17 (Erasure).

### Data Export (Right of Access)

**Endpoint:** `GET /api/user/export`

Exports all personal data in JSON format:
```json
{
  "exportDate": "2026-04-01T...",
  "user": { ... },
  "groups": [ ... ],
  "events": [ ... ],
  "rsvps": [ ... ],
  "wishlistItems": [ ... ],
  "comments": [ ... ],
  "availability": [ ... ]
}
```

**Usage:**
```bash
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/api/user/export
# Returns JSON file for download
```

### User Deletion (Right to be Forgotten)

**Endpoint:** `DELETE /api/user/delete`

Implements cryptographic erasure through soft delete:
- Sets `deleted_at` timestamp on user record
- NULLs sensitive fields (email, name, avatar)
- Soft-deletes all user content (groups, items, comments)
- Deletes RSVP records (removes from momentum counts)
- Rolls back on any error (transaction safety)

**Verification:**
```sql
-- Verify user deletion
SELECT * FROM users WHERE id = 'user-id' AND deleted_at IS NOT NULL;
-- Confirms: deleted_at is set, email is NULL, display_name is NULL
```

## Security Compliance

### OWASP Top 10

**A02:2021 - Cryptographic Failures**
- ✅ Encryption at rest (Aurora KMS)
- ✅ Encryption in transit (HTTPS/TLS 1.2+)
- ✅ Sensitive field hashing (bcrypt)
- ✅ No hard-coded keys (AWS KMS)
- ✅ Secure token storage (httpOnly cookies)

### GDPR Compliance

**Article 5: Data Protection Principles**
- ✅ Lawfulness, fairness, transparency (documented in privacy policy)
- ✅ Purpose limitation (data used only as specified)
- ✅ Data minimization (only necessary data collected)
- ✅ Accuracy (user controls their data)
- ✅ Storage limitation (soft deletes enable cleanup)
- ✅ Integrity and confidentiality (encrypted at rest and in transit)

**Article 25: Data Protection by Design**
- ✅ Encryption enabled by default
- ✅ Secure token handling built-in
- ✅ Soft delete pattern for compliance
- ✅ User data export functionality

**Article 32: Security Measures**
- ✅ Encryption of personal data
- ✅ Ability to restore availability and access to data promptly (backups)
- ✅ Regular testing of security measures (unit + integration tests)
- ✅ Process for restoring data after incidents (AWS RDS snapshots)

**Articles 15 & 17: Data Subject Rights**
- ✅ Data Export endpoint (`GET /api/user/export`)
- ✅ User Deletion endpoint (`DELETE /api/user/delete`)

### CCPA Compliance

**Consumer Right to Know**
- ✅ Data Export endpoint returns all personal information

**Consumer Right to Delete**
- ✅ User Deletion endpoint implements right to erasure

**Consumer Right to Opt-Out**
- ✅ Notification preferences per group (Phase 2)

## Implementation Guide

### Prerequisites

1. **AWS Account** with KMS and RDS access
2. **bcrypt** npm package installed
3. **Node.js 18+** runtime
4. **PostgreSQL client** tools (for testing)

### Setup Checklist

- [ ] **Database Encryption**
  - [ ] Enable KMS encryption on Aurora cluster
  - [ ] Verify database is encrypted at rest
  - [ ] Enable automatic key rotation

- [ ] **TLS Configuration**
  - [ ] Install SSL/TLS certificate on API Gateway
  - [ ] Configure TLS 1.2 minimum
  - [ ] Test with SSLLabs (target: A+ rating)
  - [ ] Verify HSTS header in responses

- [ ] **Application Security**
  - [ ] Install `bcrypt` package
  - [ ] Create `lib/encryption/hash.ts` utility
  - [ ] Update services to use email hashing
  - [ ] Implement `middleware/https-enforce.ts`
  - [ ] Add security headers to all responses

- [ ] **Token Security**
  - [ ] Configure httpOnly cookies in auth middleware
  - [ ] Set Secure flag on cookies (production only)
  - [ ] Set SameSite=Strict on cookies
  - [ ] Test token refresh flow

- [ ] **GDPR/CCPA Features**
  - [ ] Implement `GET /api/user/export` endpoint
  - [ ] Implement `DELETE /api/user/delete` endpoint
  - [ ] Test data export completeness
  - [ ] Test user deletion cascade

- [ ] **Testing**
  - [ ] Run encryption unit tests: `npm test encryption`
  - [ ] Run HTTPS enforcement tests: `npm test middleware`
  - [ ] Run GDPR endpoint tests: `npm test api/user`
  - [ ] Security audit script: `npm run audit:security`

- [ ] **Documentation**
  - [ ] Update README with encryption section
  - [ ] Document key rotation process
  - [ ] Create security checklist
  - [ ] Add developer onboarding guide

### Testing Encryption

```bash
# Run all encryption-related tests
npm test -- encryption
npm test -- https-enforce
npm test -- api/user

# Verify email hashing
npm test -- lib/encryption/hash.test.ts

# Run security audit
npm run audit:security

# Check TLS configuration
openssl s_client -connect api.example.com:443 -tls1_2
```

### Monitoring

**CloudWatch Metrics to Monitor:**
- KMS key usage (encryption/decryption operations)
- Aurora database encryption status
- API response HSTS header presence (should be 100%)
- Token refresh success rate
- User deletion requests

**Log Patterns to Alert On:**
- Failed KMS key access (indicates permission issue)
- Plaintext emails in error logs (indicates logging issue)
- HTTP requests to API (should be 0)
- Suspicious token refresh patterns

## References

- AWS KMS Documentation: https://docs.aws.amazon.com/kms/
- Aurora Database Encryption: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- OWASP Cryptographic Failures: https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
- GDPR Text: https://gdpr-info.eu/
- CCPA Text: https://oag.ca.gov/privacy/ccpa
- HSTS Specification: https://tools.ietf.org/html/rfc6797
- bcrypt Security: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
