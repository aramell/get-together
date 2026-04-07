# Data Protection Impact Assessment (DPIA)

**Project:** Get-Together Real-Time Group Coordination App  
**Date:** April 1, 2026  
**Status:** DRAFT - Formal DPIA required for production

---

## Executive Summary

This DPIA evaluates privacy risks associated with Get-Together's collection, processing, and retention of personal data. The assessment identifies HIGH-RISK processing activities and recommends mitigation measures.

**High-Risk Processing Activities:**
1. Real-time availability and location data (free/busy blocks)
2. Event RSVP tracking (reveals attendance patterns)
3. User profile data collection (name, email, avatar)
4. Comment storage (discussion content)

**Risk Level:** MEDIUM (after mitigation measures)  
**Recommendation:** Proceed with documented safeguards

---

## 1. Processing Description

### 1.1 Purpose & Scope

Get-Together enables group coordination through:
- **Real-time availability marking** (free/busy blocks only, no event details)
- **Event proposals** with RSVP tracking (in/maybe/out)
- **Wishlist** for group inspiration
- **Group comments** for discussion
- **Soft delete** for GDPR compliance (90-day hard-delete)

### 1.2 Data Categories Processed

| Data Category | Purpose | Sensitivity | Retention |
|---|---|---|---|
| Email, Display Name | User identification | Medium | Until deletion |
| Avatar URL | User profile | Low | Until deletion |
| Group Membership | Access control | Medium | Until deletion |
| Availability Blocks | Group coordination | High | Real-time only |
| Event RSVPs | Decision making | Medium | Until deletion |
| Comments | Discussion | Medium | Until deletion |
| Activity Logs | Audit trail | Medium | 1 year |

### 1.3 Data Subjects

- EU residents (GDPR scope)
- California residents (CCPA scope)
- Users in other jurisdictions

---

## 2. Risk Analysis

### 2.1 HIGH-RISK Processing: Availability Data

**Description:** Free/busy blocks reveal user availability patterns.

**Risks:**
- **Privacy:** Reveals when users are free (inference risk)
- **Discrimination:** Could reveal pregnancy, health conditions, religious observance
- **Secondary Use:** Group admin could track member availability to infer activities

**Mitigation:**
- ✅ Data minimization: Store free/busy only, no event details
- ✅ Group membership: Only group members see availability
- ✅ Soft delete: Availability deleted when user leaves group or deletes account
- ✅ Encryption: Data encrypted at rest and in transit
- ✅ User control: Users can delete/modify entries anytime

**Residual Risk:** LOW (after mitigations)

### 2.2 MEDIUM-RISK Processing: Comment Storage

**Description:** Comments may contain personal opinions, health info, etc.

**Risks:**
- **Data Minimization:** Storing full comment text (could be reduced)
- **Retention:** Comments kept indefinitely until manual deletion
- **Visibility:** Stored even if author deletes account (as "[deleted]")

**Mitigation:**
- ✅ Access control: Only group members see comments
- ✅ Soft delete: Comments soft-deleted if author deletes account
- ✅ User control: Author can delete own comments
- ✅ Encryption: Comments encrypted at rest

**Residual Risk:** MEDIUM (comments retained after user deletion for discussion continuity)

### 2.3 MEDIUM-RISK Processing: RSVP Tracking

**Description:** Reveals user commitment/uncertainty about events.

**Risks:**
- **Behavioral Profiling:** Pattern of "maybe" RSVPs reveals hesitation
- **Discrimination:** RSVP patterns could reveal protected characteristics
- **Secondary Use:** Could be mined for insights (e.g., least committed members)

**Mitigation:**
- ✅ Access control: Only group members see RSVP status
- ✅ Transparency: User knows all group members see their RSVP
- ✅ Soft delete: RSVPs deleted when user deletes account
- ✅ User control: Users can change RSVP anytime

**Residual Risk:** LOW (legitimate group coordination need outweighs risk)

---

## 3. Legal Basis Assessment

### 3.1 Consent
- ✅ Explicit consent obtained at signup
- ✅ Consent recorded with timestamp
- ✅ User can withdraw consent (triggers deletion)

### 3.2 Contract
- ✅ Data processing necessary to provide service (Groups, RSVPs, availability)
- ✅ User cannot use service without agreeing to processing

### 3.3 Legitimate Interest
- ✅ Security: Audit logs for fraud prevention
- ✅ Service improvement: Aggregate analytics (no PII)

### 3.4 Compliance with Laws
- ✅ Billing and tax compliance (future, not yet implemented)

---

## 4. Data Subject Rights Assessment

### 4.1 Right of Access (Article 15)
- ✅ **Implemented:** Export endpoint provides all personal data in JSON
- ✅ **Timeline:** <24 hours (within required 30 days)

### 4.2 Right to Rectification (Article 16)
- ✅ **Implemented:** Users can update display name, avatar
- ⚠️ **Gap:** Email changes not yet supported (no verification)
- **Remediation:** Task 6 (Consent Management) to add email verification

### 4.3 Right to Erasure (Article 17)
- ✅ **Implemented:** Delete account endpoint with soft-delete
- ✅ **Timeline:** Immediate soft-delete, 90-day hard-delete

### 4.4 Right to Data Portability (Article 20)
- ✅ **Implemented:** Export in JSON format (machine-readable)
- ✅ **Completeness:** Includes all personal data and relationships

### 4.5 Right to Restrict Processing (Article 18)
- ⚠️ **Partial:** No UI for restrict; available by email request
- **Remediation:** Task 6 to add restrict-processing endpoint

---

## 5. Security Assessment

### 5.1 Encryption
- ✅ At rest: AWS KMS encryption
- ✅ In transit: HTTPS/TLS 1.2+
- ✅ Passwords: bcrypt (10 rounds)

### 5.2 Access Control
- ✅ Authentication: AWS Cognito
- ✅ Authorization: Group membership checks
- ✅ Tokens: HTTP-only secure cookies, 30-min expiry

### 5.3 Audit & Monitoring
- ✅ Audit logs: 1-year retention
- ✅ Activity tracking: IP address, action type, timestamp
- ✅ Error handling: No PII in error messages

### 5.4 Data Breach Procedures
- ✅ **Plan documented:** docs/SECURITY_POLICY.md
- ⚠️ **Notification:** 72-hour requirement, process documented but not automated
- **Remediation:** Task 8 to implement breach notification workflow

---

## 6. Necessity & Proportionality

### 6.1 Data Minimization

| Data | Necessary? | Justification | Reduce? |
|---|---|---|---|
| Email | YES | User ID, notifications, password reset | No |
| Display Name | YES | Identifying group members | No |
| Avatar URL | NO* | Nice-to-have for UX | Consider optional |
| Availability | YES | Core feature (group coordination) | No |
| RSVPs | YES | Core feature (momentum tracking) | No |
| Comments | YES | Core feature (discussion) | Partial (auto-delete after 1 year) |

*Avatar currently required but could be optional in future

### 6.2 Proportionality Check

**Processing Impact:** LOW-MEDIUM
- Data limited to group coordination scope
- No third-party sharing
- Users have full control (delete/export)

**User Benefit:** HIGH
- Core feature (real-time group coordination)
- Cannot achieve without processing

**Conclusion:** Processing proportionate to benefit

---

## 7. Third-Party & International Transfers

### 7.1 Sub-Processors
- AWS (hosting, database, KMS): US/EU regions available
- AWS Cognito (authentication): US-based
- SendGrid (future emails): US-based

### 7.2 Transfer Safeguards
- ✅ Standard Contractual Clauses (SCCs) with sub-processors
- ✅ Data encryption provides additional protection
- ✅ Customers can request EU-only data residency

---

## 8. Recommendations & Action Items

### 8.1 HIGH Priority (Must Fix)
1. ✅ **Implement rate limiting** on export/delete endpoints (prevents DOS)
   - Status: FIXED in code review
   - Implementation: Task 9 rate limiter

2. ⚠️ **Email verification for email changes** (currently not supported)
   - Status: DEFERRED to Task 6 (Consent Management)
   - Impact: AC4 (Right to Rectification) partially incomplete

3. ⚠️ **Automate breach notification** (currently manual process)
   - Status: DEFERRED to Task 8 (Audit Logging)
   - Impact: GDPR Article 33 compliance

### 8.2 MEDIUM Priority (Should Fix)
1. **Make avatar optional** in signup (reduce unnecessary data)
   - Impact: Data minimization
   - Effort: Low

2. **Add comment retention policy** (auto-delete after 1 year)
   - Impact: Reduce storage of unnecessary data
   - Effort: Medium

3. **Implement restrict-processing endpoint** (Article 18 right)
   - Status: DEFERRED to Task 6
   - Impact: Complete Data Subject rights

### 8.3 LOW Priority (Nice to Have)
1. **IP geolocation** for California user detection (CCPA specific)
   - Status: DEFERRED to Task 7 (CCPA Compliance)

---

## 9. Conclusion

### 9.1 Overall Assessment

**Risk Level:** MEDIUM (reduced to LOW after mitigations)

Get-Together's processing activities are:
- ✅ Necessary for stated purposes (group coordination)
- ✅ Proportionate to user expectations
- ✅ Protected by encryption and access controls
- ✅ Subject to comprehensive Data Subject rights

### 9.2 Approval Status

- **DPIA Status:** DRAFT (formal approval required pre-production)
- **Recommendation:** Approve with noted remediation items
- **Review Schedule:** Annual (or upon significant changes)

### 9.3 Next Steps

1. Address HIGH priority items (email verification, breach automation)
2. Implement MEDIUM priority items (comment retention, restrict-processing)
3. Conduct formal DPIA approval with Data Protection Officer (if required)
4. Document residual risks in Privacy Policy

---

**Prepared by:** Product Security Team  
**Date:** April 1, 2026  
**Review Date:** April 1, 2027  
**Status:** DRAFT - REQUIRES FORMAL APPROVAL

---

## Appendix: Impact Assessment Matrix

| Processing Activity | Probability | Impact | Risk | Mitigation | Residual |
|---|---|---|---|---|---|
| Availability tracking | High | Medium | Medium | Encryption, access control, soft delete | Low |
| RSVP tracking | High | Low | Low | Access control, user control | Low |
| Comment storage | Medium | Medium | Medium | Soft delete, access control, encryption | Medium |
| Audit logging | High | Low | Low | Encrypted logs, 1-yr retention | Low |
| Account deletion | Low | High | Medium | Soft delete, hard delete after 90d | Low |
| Data export | High | Low | Low | Rate limiting, authentication | Low |

