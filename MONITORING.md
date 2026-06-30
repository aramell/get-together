# Monitoring, Logging & Observability Guide

**Status:** Implementation Complete (Story 8.3, Task 10)  
**Framework:** BMAD v6.0.4 | **Project:** get-together  
**Last Updated:** 2026-04-03

---

## Table of Contents

1. [Overview](#overview)
2. [CloudWatch Insights Query Guide](#cloudwatch-insights-query-guide)
3. [Common Debugging Procedures](#common-debugging-procedures)
4. [Alerting & Escalation](#alerting--escalation)
5. [Setup Checklist for New Deployments](#setup-checklist-for-new-deployments)
6. [Architecture & Components](#architecture--components)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The get-together logging and monitoring system provides comprehensive observability across the entire application stack:

- **Structured Logging:** Winston 3.x with JSON output, correlation IDs, and automatic PII masking
- **Real-time Monitoring:** CloudWatch dashboards with 5+ metrics visualizations
- **Distributed Tracing:** X-Correlation-ID headers for end-to-end request tracking
- **Performance Analytics:** Histogram metrics with percentile tracking (p50/p95/p99)
- **Compliance:** Immutable audit logs, GDPR data export, IAM-restricted access
- **Alerting:** SNS-based notifications with email and Slack integration

### Key Metrics

- **API Latency:** p50, p95, p99 percentiles by endpoint
- **Error Rate:** Percentage of failed requests with categorization
- **Database Performance:** Query duration, connection pool utilization
- **Cache Performance:** CloudFront hit ratios by content type
- **Authentication:** Login success rates, failure detection
- **Availability:** Request count, endpoint health status

---

## CloudWatch Insights Query Guide

### 1. Finding All Errors (Last Hour)

```sql
fields @timestamp, @message, level, errorCode
| filter level = "ERROR"
| stats count() as errorCount by errorCode
| sort errorCount desc
```

**Use Case:** Identify error patterns and frequency  
**Output:** Table with error codes and counts

---

### 2. User Activity Audit

```sql
fields @timestamp, method, path, statusCode, duration
| filter userId = "user-123"
| sort @timestamp desc
```

**Use Case:** Investigate specific user's actions  
**Output:** Chronological list of all requests by user

---

### 3. Slow Endpoints Detection

```sql
fields @timestamp, path, method, duration
| filter duration > 2000
| stats avg(duration) as avgDuration, max(duration) as maxDuration, count() as count by path
| sort avgDuration desc
```

**Use Case:** Identify performance bottlenecks  
**Output:** Endpoints ranked by average response time

**Threshold Adjustments:**
- Development: > 1000ms
- Staging: > 2000ms
- Production: > 500ms

---

### 4. Authentication Failures

```sql
fields @timestamp, userId, ipAddress, path
| filter statusCode = 403
| stats count() as failureCount by userId, ipAddress
| sort failureCount desc
```

**Use Case:** Detect authorization issues and potential attacks  
**Output:** Failed users/IPs ranked by failure count

---

### 5. Database Performance Issues

```sql
fields @timestamp, query, queryDuration
| filter queryDuration > 1000
| stats avg(queryDuration) as avgDuration, max(queryDuration) as maxDuration by query
| sort avgDuration desc
```

**Use Case:** Identify slow database queries  
**Output:** Queries ranked by duration

---

### 6. Error Rate by Endpoint

```sql
fields @timestamp, path, statusCode
| filter statusCode >= 400
| stats count() as errorCount by path, statusCode
| sort errorCount desc
```

**Use Case:** Understand which endpoints have the most errors  
**Output:** Endpoints with error distribution

---

### 7. Request Latency Distribution

```sql
fields duration
| stats count() as total, pct(duration, 50) as p50, pct(duration, 95) as p95, pct(duration, 99) as p99
```

**Use Case:** Understand latency distribution across all requests  
**Output:** Percentile statistics

---

### 8. Correlation ID Tracing (Distributed Tracing)

```sql
fields @timestamp, @message, duration, method, path, statusCode
| filter correlationId = "corr-id-12345"
| sort @timestamp asc
```

**Use Case:** Follow a single request through entire system  
**Output:** All log entries for that request with timing

---

### 9. Failed Database Connections

```sql
fields @timestamp, @message, errorCode
| filter @message like /connection pool exhausted|connection timeout/i
| stats count() as count by @message
| sort count desc
```

**Use Case:** Monitor database connectivity issues  
**Output:** Connection failure patterns

---

### 10. Cache Performance by Content Type

```sql
fields @timestamp, contentType, cacheHitRatio
| filter contentType in ["js", "css", "html", "api"]
| stats avg(cacheHitRatio) as avgHitRatio by contentType
```

**Use Case:** Monitor CDN cache effectiveness  
**Output:** Cache statistics by content type

---

## Common Debugging Procedures

### Debugging a Slow Request

1. **Identify the request:**
   ```sql
   fields @timestamp, path, duration, correlationId
   | filter path = "/api/groups/create" and duration > 2000
   | sort @timestamp desc
   | head 1
   ```

2. **Get the correlation ID** from the slowest request

3. **Trace the entire request:**
   ```sql
   fields @timestamp, @message, duration, level
   | filter correlationId = "corr-id-from-step-2"
   | sort @timestamp asc
   ```

4. **Check for slow database queries:**
   ```sql
   fields @timestamp, query, queryDuration, correlationId
   | filter correlationId = "corr-id-from-step-2" and queryDuration > 500
   ```

5. **Check middleware/middleware costs:**
   - Compare timestamps between request entry and first DB query
   - Large gap indicates middleware overhead

### Debugging an Error

1. **Find the error:**
   ```sql
   fields @timestamp, path, errorCode, @message, correlationId
   | filter level = "ERROR" and errorCode = "INVALID_INVITE_CODE"
   | sort @timestamp desc
   | head 1
   ```

2. **Get full context with correlation ID:**
   ```sql
   fields @timestamp, @message, level, errorCode
   | filter correlationId = "corr-id-from-step-1"
   | sort @timestamp asc
   ```

3. **Identify where error originated:**
   - Look for the ERROR level entry in the trace
   - Check surrounding INFO entries for context

### Debugging Authentication Issues

1. **Find failed logins:**
   ```sql
   fields @timestamp, userId, statusCode, @message
   | filter statusCode = 401 or statusCode = 403
   | stats count() as failures by userId
   | sort failures desc
   ```

2. **Check JWT claims:**
   ```sql
   fields @timestamp, userId, @message
   | filter @message like /jwt|token|claims/i
   | filter userId = "user-123"
   ```

3. **Verify Cognito integration:**
   ```sql
   fields @timestamp, @message, errorCode
   | filter @message like /cognito/i
   ```

### Debugging Database Connection Pool Exhaustion

1. **Monitor current pool status:**
   ```sql
   fields @timestamp, activeConnections, totalConnections, utilizationPercent
   | stats avg(utilizationPercent) as avgUtil, max(utilizationPercent) as peakUtil
   ```

2. **Find query causing connections to be held:**
   ```sql
   fields @timestamp, query, queryDuration
   | filter queryDuration > 5000
   | stats count() as slowQueryCount by query
   | sort slowQueryCount desc
   ```

3. **Check for deadlocks:**
   ```sql
   fields @timestamp, @message, query
   | filter @message like /deadlock/i
   ```

---

## Alerting & Escalation

### Alert Thresholds (Production)

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Error Rate | > 10% (5% warning) | CRITICAL | Page on-call engineer |
| API Latency | > 2000ms p95 | WARNING | Monitor closely |
| DB Connections | > 95% utilization | WARNING | Scale up or optimize queries |
| Cognito Failures | > 10/min | WARNING | Check IAM policies |
| Cache Hit Ratio | < 70% | INFO | Review CDN configuration |
| Deadlock Detection | Any | CRITICAL | Page DBA immediately |

### Setting Up SNS Notifications

1. **Email Subscription:**
   ```bash
   aws sns subscribe \
     --topic-arn arn:aws:sns:us-east-1:123456789012:get-together-alerts \
     --protocol email \
     --notification-endpoint your-email@example.com
   ```

2. **Slack Integration:**
   - Create incoming webhook in Slack workspace
   - Use AWS Chatbot to connect SNS → Slack channel
   - Configure channel for #alerts or #incidents

3. **Custom Lambda for Advanced Routing:**
   ```typescript
   // Route alerts based on severity
   if (severity === 'CRITICAL') {
     await notifyOncall();
     await notifySlack('#incidents');
   } else if (severity === 'WARNING') {
     await notifySlack('#alerts');
   }
   ```

### Escalation Path

```
WARNING (5 min)
    ↓
CRITICAL (immediate page)
    ↓
No response (5 min) → Page secondary on-call
    ↓
No response (5 min) → Page team lead
    ↓
Critical outage → All hands
```

### Acknowledging Alerts

When you receive an alert:

1. **Acknowledge immediately** in Slack (emoji reaction)
2. **Investigate** using debugging procedures above
3. **Post findings** to #incidents channel
4. **Take action** based on root cause
5. **Close alert** when resolved

---

## Setup Checklist for New Deployments

### Pre-Deployment

- [ ] Verify AWS credentials for target environment
- [ ] Ensure CloudWatch log group exists: `/aws/amplify/get-together/{environment}`
- [ ] Verify CloudWatch retention policies:
  - Dev: 30 days
  - Staging: 90 days
  - Production: 365 days
- [ ] Confirm SNS topic exists: `get-together-alerts`
- [ ] Test SNS subscriptions (email and Slack)
- [ ] Verify IAM permissions for logging and monitoring
- [ ] Check database connection pool configuration

### Deployment

- [ ] Set environment variables:
  ```bash
  LOG_LEVEL=debug          # Change to 'info' for production
  LOG_FORMAT=json          # Always JSON
  CORRELATION_ID_ENABLED=true
  PII_MASKING_ENABLED=true
  AWS_REGION=us-east-1
  ```
- [ ] Initialize logger with environment config
- [ ] Verify correlation IDs appear in logs
- [ ] Check PII masking is active (emails, phone numbers masked)
- [ ] Deploy application

### Post-Deployment (First 30 minutes)

- [ ] Monitor error rate dashboard (should be < 1%)
- [ ] Check API latency (p95 should be normal)
- [ ] Verify log ingestion (new logs appearing in CloudWatch)
- [ ] Test correlation ID tracing with sample request
- [ ] Verify database metrics (connections healthy)
- [ ] Check cache hit ratio (should be > 70%)
- [ ] Review first 100 log entries for any unusual patterns

### Ongoing Monitoring

- [ ] Daily review of alert thresholds
- [ ] Weekly audit of slow queries
- [ ] Monthly assessment of retention policies
- [ ] Quarterly review of alert rules and escalation paths

### Rollback Checklist

If deployment causes monitoring issues:

- [ ] Revert application to previous version
- [ ] Verify logs are still flowing
- [ ] Check error rate drops back to normal
- [ ] Review logs from failed deployment for root cause
- [ ] Update debugging procedures if needed
- [ ] Create incident report

---

## Architecture & Components

### Logging Pipeline

```
Application
    ↓
Winston Logger (pii-masking.ts)
    ↓
CloudWatch Transport (cloudwatch.ts)
    ↓
Log Group (/aws/amplify/get-together/{env})
    ↓
CloudWatch Insights Queries
    ↓
CloudWatch Dashboards
    ↓
SNS Topic → Email/Slack
```

### Correlation Flow

```
HTTP Request
    ↓
Extract/Generate Correlation ID (X-Correlation-ID header)
    ↓
Store in request context (correlation-id.ts)
    ↓
Inject into all log entries (middleware.ts)
    ↓
Inject into database queries (database-monitor.ts)
    ↓
Enable distributed tracing
```

### Metrics Collection

```
API Endpoints
    ↓
Record latency (metrics.ts)
    ↓
Calculate percentiles (p50/p95/p99)
    ↓
Export to CloudWatch Dashboard
    ↓
Alert on thresholds
```

### Database Monitoring

```
Query Execution
    ↓
Detect slow queries (database-monitor.ts)
    ↓
Record connection pool status
    ↓
Emit events (slow queries, deadlocks)
    ↓
CloudWatch alarms
    ↓
SNS notifications
```

---

## Performance Tuning

### Log Level Optimization

| Environment | Log Level | Retention | Use Case |
|-------------|-----------|-----------|----------|
| Development | DEBUG | 7 days | Local debugging |
| Staging | INFO | 30 days | Pre-production testing |
| Production | WARN | 365 days | Production monitoring |

### Database Query Optimization

1. **Identify slow queries:**
   ```sql
   fields query, queryDuration
   | filter queryDuration > 1000
   | stats count() as occurrences by query
   | sort occurrences desc
   ```

2. **Analyze query plan:**
   ```sql
   EXPLAIN ANALYZE SELECT ... -- from identified slow query
   ```

3. **Add indexes if needed:**
   - Check for full table scans
   - Add indexes on filter columns
   - Re-run query to verify improvement

### Connection Pool Tuning

- **Initial Size:** min(10, CPU cores)
- **Max Size:** min(100, available connections)
- **Connection Timeout:** 5000ms
- **Idle Timeout:** 900000ms (15 minutes)

### CloudWatch Insights Optimization

- **Partition queries by date range** to reduce scan time
- **Use filters early** in query to reduce data scanned
- **Aggregate results** using stats to reduce output size
- **Cache frequent queries** as dashboard widgets

---

## Troubleshooting

### Logs Not Appearing in CloudWatch

**Symptoms:** 
- No new logs in CloudWatch after deployment
- Application seems to be running

**Diagnosis:**
```bash
# Check if log group exists
aws logs describe-log-groups --log-group-name-prefix /aws/amplify/get-together

# Check log streams
aws logs describe-log-streams \
  --log-group-name /aws/amplify/get-together/production
```

**Solutions:**
1. Verify CloudWatch IAM permissions
2. Check network connectivity to CloudWatch endpoint
3. Verify log group retention policy (not deleted)
4. Check application logs locally for Winston transport errors
5. Verify AWS credentials in environment variables

### Correlation ID Not Propagating

**Symptoms:**
- Logs exist but correlation ID is missing
- Can't trace requests end-to-end

**Diagnosis:**
```javascript
// In middleware
console.log('Correlation ID:', getCorrelationId());
// Should print generated UUID
```

**Solutions:**
1. Verify middleware is registered in Next.js config
2. Check that correlation-id.ts functions are exported
3. Verify X-Correlation-ID header is being passed downstream
4. Enable DEBUG logging to see correlation ID injection

### PII Not Being Masked

**Symptoms:**
- Emails visible in logs: `user@example.com`
- Phone numbers visible: `+1-555-123-4567`
- Passwords in error messages

**Diagnosis:**
```javascript
import { maskSensitiveObject } from '@/lib/logging/pii-masking';
const masked = maskSensitiveObject({ email: 'test@example.com' });
console.log(masked); // Should show masked email
```

**Solutions:**
1. Verify PII_MASKING_ENABLED=true
2. Check that shouldMaskField() detects field names
3. Verify maskSensitiveObject() is called on log data
4. Review SENSITIVE_FIELDS list in pii-masking.ts
5. Test masking functions directly in Jest

### High Error Alerts Firing Incorrectly

**Symptoms:**
- Alert fires but error rate looks normal
- False positives from harmless errors

**Diagnosis:**
```sql
fields level, errorCode, @message
| filter level = "ERROR"
| stats count() as total by errorCode
| sort total desc
```

**Solutions:**
1. Review alert threshold (may need adjustment)
2. Filter specific error codes in alarm query
3. Exclude expected errors from metrics
4. Increase alarm evaluation period (5 min → 15 min)

### Database Connection Pool Exhaustion

**Symptoms:**
- Intermittent connection timeouts
- Error: "connection limit exceeded"
- High latency spikes

**Diagnosis:**
```sql
fields @timestamp, activeConnections, totalConnections
| stats avg(activeConnections) as avg, max(activeConnections) as max
```

**Solutions:**
1. Increase pool max size (may require DB scaling)
2. Identify long-running queries consuming connections
3. Add connection timeout to close idle connections
4. Optimize query performance to release connections faster
5. Consider read replicas to distribute load

### Slow Endpoint Performance

**Symptoms:**
- Dashboard shows p95 latency > 2000ms
- Users reporting slow application

**Diagnosis:**
Follow "Debugging a Slow Request" procedure above

**Solutions:**
1. Add indexes to frequently-queried columns
2. Optimize N+1 queries (batch load related data)
3. Implement caching for static data
4. Add pagination to reduce result set size
5. Consider async processing for heavy operations

---

## Compliance & Security

### GDPR Compliance

- **Data Export:** Use `createGDPRDataExport()` to retrieve all user data
- **Data Deletion:** Soft-delete with immutable audit trail
- **Data Masking:** All PII automatically masked in logs
- **Retention:** Logs retained per environment policy (max 365 days)

### Audit Trail Immutability

- Audit logs stored in dedicated table
- No delete permissions on audit tables
- Timestamps captured at write time
- IAM policies prevent deletion or modification

### Access Control

- Only authorized teams can view production logs
- Log access restricted to specific log group prefixes
- API keys and tokens masked in all logs
- PII masking prevents accidental exposure

---

## Contact & Escalation

**On-Call Engineer:** Check Pagerduty schedule  
**Team Slack:** #get-together-alerts  
**Incident Channel:** #incidents  
**Documentation:** This file + `/docs/` directory

---

*Last Updated: 2026-04-03 | Story 8.3 Task 10: Complete*
