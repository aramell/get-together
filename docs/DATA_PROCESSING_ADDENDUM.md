# Data Processing Addendum (DPA)

**Status:** DRAFT - For B2B/Enterprise Use

## 1. Introduction

This Data Processing Addendum ("DPA") supplements the Terms of Service and Privacy Policy between Get-Together ("Data Controller") and its enterprise customers ("Data Processors" or "Customers").

This DPA implements the requirements of:
- **GDPR** (EU General Data Protection Regulation) Articles 28-32
- **Standard Contractual Clauses (SCCs)** for international data transfers
- **CCPA** (California Consumer Privacy Act)

## 2. Definitions

- **Personal Data:** Any information relating to an identified or identifiable natural person
- **Processing:** Any operation performed on personal data (collection, storage, use, deletion)
- **Data Controller:** Get-Together, determining purposes and means of processing
- **Data Subject:** The individual whose data is processed
- **Data Processor:** Entity processing data on behalf of controller (not applicable to B2C)

## 3. Scope of Processing

### 3.1 Types of Personal Data
- User profile information (email, display name, avatar)
- Group membership and role information
- Event proposals and RSVP data
- Wishlist items and comments
- Availability/calendar data
- IP addresses (temporary, for security)
- Activity logs (retention: 1 year)

### 3.2 Processing Purposes
- Providing the Get-Together service
- Maintaining data security
- Complying with legal obligations
- Improving and optimizing services

### 3.3 Duration of Processing
- **Active accounts:** Data retained during service use
- **Deleted accounts:** Soft-deleted immediately, hard-deleted after 90 days
- **Backup data:** Retained 90 days for disaster recovery
- **Audit logs:** Retained 1 year for forensics and compliance

## 4. Data Controller Responsibilities

Get-Together (as Data Controller) commits to:

### 4.1 Lawful Processing
- Process personal data only for stated purposes
- Maintain transparency through Privacy Policy
- Obtain explicit consent for non-essential processing
- Honor all Data Subject Rights (access, deletion, portability, etc.)

### 4.2 Data Security
- Encrypt data at rest (AWS KMS)
- Encrypt data in transit (HTTPS/TLS 1.2+)
- Implement access controls (group-based authorization)
- Maintain audit logs of all data access

### 4.3 Data Subject Rights
- **Right of Access (Article 15):** Provide all personal data via export endpoint
- **Right to Rectification (Article 16):** Allow users to correct profile data
- **Right to Erasure (Article 17):** Hard-delete after 90-day retention
- **Right to Data Portability (Article 20):** Export in portable JSON format
- **Right to Restrict Processing (Article 18):** Available on request

### 4.4 Accountability
- Maintain records of processing activities
- Conduct Data Protection Impact Assessment (DPIA)
- Document data breach procedures
- Respond to regulatory inquiries

## 5. Sub-Processors

Get-Together uses the following sub-processors:

| Service | Purpose | Location |
|---------|---------|----------|
| AWS (EC2, RDS, KMS) | Hosting, database, encryption | US, EU regions available |
| AWS Cognito | Authentication | US |
| SendGrid (future) | Email notifications | US |

**Approval:** Customers approve the use of listed sub-processors. Changes require 30 days' notice.

## 6. International Data Transfers

If data is transferred outside the EU:

### 6.1 Transfer Mechanisms
- **Standard Contractual Clauses (SCCs):** Implemented between Get-Together and sub-processors
- **Supplementary Measures:** Encryption ensures data protection during transfer
- **Adequacy Decisions:** EU → US via Privacy Shield (when applicable)

### 6.2 Customer Obligations
- Ensure appropriate legal basis for transferring personal data to Get-Together
- Inform Data Subjects of international transfers

## 7. Data Breach Notification

### 7.1 Notification Timeline
- Get-Together to notify Customers within **72 hours** of becoming aware of a breach
- Customers responsible for notifying individuals within **72 hours** per GDPR Article 33

### 7.2 Breach Information
- Description of the breach
- Data categories and approximate number of individuals affected
- Measures taken to mitigate harm
- Get-Together's contact point for further information

## 8. Audit & Compliance

### 8.1 Audit Rights
- Customers may request audit reports annually
- Technical measures and organizational procedures documented
- Security assessment reports available upon request

### 8.2 Compliance Verification
- Get-Together maintains certification of compliance
- Privacy and security documentation available for review

## 9. Data Subject Right Requests

Get-Together commits to:
- Cooperate with Data Subject requests for access, deletion, portability
- Respond to legitimate requests within 30 days
- Provide requested data in portable, machine-readable format
- Hard-delete data within 90 days of deletion request

## 10. Liability & Indemnification

Get-Together indemnifies Customers for losses resulting from:
- Unauthorized data access or processing
- Failure to comply with GDPR/CCPA requirements
- Negligent or intentional breaches of this DPA

**Limitation:** Liability capped at annual service fees, except for gross negligence.

## 11. Termination

Upon termination of the service agreement:
- Get-Together returns or deletes all personal data per Data Subject's instructions
- Backup data deleted within 90 days
- Audit logs retained per legal requirements

## 12. Governing Law

This DPA is governed by the laws of **[Jurisdiction]** and subject to GDPR, CCPA, and applicable data protection laws.

---

**For questions about this DPA, contact:** privacy@get-together.app

**Last Updated:** April 1, 2026  
**Status:** Active
