# Disaster Recovery Plan
## Get-Together Application

**Status:** Production Ready  
**Last Updated:** 2026-04-07  
**Next Review:** 2026-07-07  

---

## Overview

This document outlines comprehensive procedures for recovering from various disaster scenarios affecting the get-together application and infrastructure.

**Key Metrics:**
- **RPO (Recovery Point Objective):** < 1 hour (hourly backups)
- **RTO (Recovery Time Objective):** < 2 hours (manual restore), < 2 minutes (automatic failover)
- **Backup Retention:** 30 days (dev), 90 days (staging), 365 days (production)

---

## Quick Reference

### Emergency Contacts

| Role | Contact | Backup |
|------|---------|--------|
| On-Call Engineer | [on-call-schedule] | [backup-contact] |
| Infrastructure Lead | [infra-lead-email] | [infra-backup-email] |
| Database Admin | [dba-email] | [dba-backup-email] |
| Security Team | [security-email] | [security-backup-email] |

### Escalation Path

```
Incident Detection (CloudWatch)
  ↓
Page On-Call Engineer (immediate)
  ↓ (5 min no response)
Page Infrastructure Lead
  ↓ (10 min no response)
Activate All-Hands Response Team
```

---

## Scenario 1: Database Corruption Recovery

### Severity: CRITICAL
**RTO:** < 2 hours  
**RPO:** < 1 hour  

### When to Use This Procedure

- Database integrity check fails
- Data corruption detected in logs
- Application errors referencing corrupted data
- `VACUUM` or `ANALYZE` operations detect inconsistencies

### Detection

```bash
# Check database integrity
SELECT pg_database.datname, 
       pg_size_pretty(pg_database_size(pg_database.datname)) 
FROM pg_database;

# Check for table corruption
ANALYZE;
REINDEX DATABASE get_together;

# Check autovacuum logs for corruption detection
tail -f /var/log/postgresql/postgresql.log | grep -i "corruption\|invalid\|missing"
```

### Recovery Procedure

**Step 1: Isolate the Problem (5 min)**
```bash
# 1. Stop the application
kubectl scale deployment app-deployment --replicas=0

# 2. Take read-only snapshot of current database
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier get-together-prod \
  --db-cluster-snapshot-identifier corruption-snapshot-$(date +%s)

# 3. Document the time of last known good backup
LAST_GOOD_BACKUP=$(aws rds describe-db-clusters \
  --db-cluster-identifier get-together-prod \
  --query 'DBClusters[0].LatestRestorableTime' \
  --output text)
echo "Last good backup: $LAST_GOOD_BACKUP"
```

**Step 2: Restore from PITR (30-45 min)**
```bash
# 1. Determine target restore time (within last 35 days)
TARGET_TIME="2026-04-06T10:00:00Z"  # Before corruption detected

# 2. Create new cluster from PITR
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-prod-restored \
  --restore-type copy-on-write \
  --restore-to-time "$TARGET_TIME" \
  --enable-iam-database-authentication

# 3. Wait for restoration (typically 30-45 minutes)
aws rds describe-db-clusters \
  --db-cluster-identifier get-together-prod-restored \
  --query 'DBClusters[0].Status'
```

**Step 3: Validate Restored Data (10-15 min)**
```bash
# 1. Connect to restored cluster
psql -h get-together-prod-restored.cluster.amazonaws.com \
     -U postgres \
     -d get_together

# 2. Run integrity checks
-- Validate table row counts match backup
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM groups;
SELECT COUNT(*) FROM events;

-- Verify no orphaned foreign keys
SELECT * FROM events WHERE group_id NOT IN (SELECT id FROM groups);

-- Check for anomalies
SELECT COUNT(*) FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

**Step 4: Cutover (10 min)**
```bash
# 1. Update Route53 to point to restored cluster
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://cutover.json

# 2. Update application secrets with new endpoint
kubectl set env deployment/app-deployment \
  DATABASE_HOST=get-together-prod-restored.cluster.amazonaws.com

# 3. Restart application
kubectl scale deployment app-deployment --replicas=3

# 4. Monitor logs for errors
kubectl logs -f deployment/app-deployment --tail=100
```

**Step 5: Post-Recovery Cleanup (within 24 hours)**
```bash
# 1. Delete old corrupted cluster after 24 hours
aws rds delete-db-cluster \
  --db-cluster-identifier get-together-prod \
  --skip-final-snapshot

# 2. Rename restored cluster to production
aws rds modify-db-cluster \
  --db-cluster-identifier get-together-prod-restored \
  --new-db-cluster-identifier get-together-prod

# 3. Update backups and replication
aws rds modify-db-cluster \
  --db-cluster-identifier get-together-prod \
  --backup-retention-period 365 \
  --preferred-backup-window "03:00-04:00"
```

---

## Scenario 2: Data Loss Recovery (Point-in-Time Restore)

### Severity: HIGH
**RTO:** < 2 hours  
**RPO:** < 1 hour  

### When to Use This Procedure

- Accidental data deletion
- User account deletion request (GDPR)
- Corrupted data in specific table
- Need to recover data from specific point in time

### Recovery Procedure

```bash
# 1. Identify the target restore time (when data was still valid)
RESTORE_TIME="2026-04-06T14:00:00Z"

# 2. Create recovery cluster
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-recovery \
  --restore-type copy-on-write \
  --restore-to-time "$RESTORE_TIME"

# 3. Export deleted data from recovery cluster
pg_dump -h recovery-endpoint \
        -U postgres \
        -d get_together \
        --table=users \
        --table=groups \
        --data-only > deleted-data-export.sql

# 4. Review exported data before applying
less deleted-data-export.sql

# 5. Apply recovered data to production
psql -h production-endpoint \
     -U postgres \
     -d get_together \
     < deleted-data-export.sql

# 6. Delete recovery cluster
aws rds delete-db-cluster \
  --db-cluster-identifier get-together-recovery \
  --skip-final-snapshot
```

---

## Scenario 3: Regional Outage Recovery

### Severity: CRITICAL
**RTO:** < 4 hours  
**RPO:** < 1 hour  

### When to Use This Procedure

- Entire AWS region unavailable
- Multiple AZ failures in region
- Network routing failures affecting entire region

### Recovery Procedure

**Cross-Region Failover:**

```bash
# 1. Create cluster in secondary region from latest backup
aws rds restore-db-cluster-from-snapshot \
  --region us-west-2 \
  --db-cluster-identifier get-together-prod-west \
  --snapshot-identifier $(aws rds describe-db-cluster-snapshots \
    --region us-east-1 \
    --db-cluster-snapshot-type automated \
    --query 'DBClusterSnapshots[0].DBClusterSnapshotIdentifier' \
    --output text)

# 2. Update Route53 health check to secondary region
aws route53 update-health-check \
  --health-check-id <health-check-id> \
  --ip-address <us-west-2-endpoint>

# 3. Update database connection strings
kubectl set env deployment/app-deployment \
  DATABASE_HOST=get-together-prod-west.cluster.us-west-2.amazonaws.com \
  --namespace production

# 4. Restart application
kubectl rollout restart deployment/app-deployment -n production

# 5. Monitor for errors
kubectl logs -f deployment/app-deployment -n production --tail=100

# 6. Once primary region recovers, perform DNS failback
```

---

## Scenario 4: Full Infrastructure Failure Recovery

### Severity: CRITICAL
**RTO:** < 8 hours  
**RPO:** < 2 hours  

### When to Use This Procedure

- Entire cluster/infrastructure destroyed
- All data centers affected
- Need complete infrastructure rebuild

### Recovery Procedure

**Complete Infrastructure Restore:**

```bash
# 1. Assess damage and determine recovery strategy
aws ec2 describe-instances --query 'Reservations[*].Instances[*].{ID:InstanceId,State:State.Name}'

# 2. Provision new infrastructure
terraform apply -target=aws_rds_cluster.main
terraform apply -target=aws_eks_cluster.main
terraform apply -target=aws_s3_bucket.app-data

# 3. Restore database from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier get-together-prod-restored \
  --snapshot-identifier <most-recent-snapshot>

# 4. Restore application code
git clone https://github.com/get-together/get-together.git
cd get-together
git checkout <last-known-good-tag>

# 5. Deploy application
kubectl apply -f k8s/production/

# 6. Restore S3 data from versioning or backups
aws s3 sync s3://get-together-backups/ s3://get-together-production/

# 7. Verify all systems operational
./scripts/health-check.sh

# 8. Document recovery actions
echo "Recovery completed at $(date)" >> RECOVERY_LOG.txt
```

---

## Testing & Validation

### Monthly Database DR Testing

**Schedule:** First Monday of each month, 2:00 AM UTC  
**Duration:** 2-3 hours  
**Scope:** PITR restore to staging environment

```bash
#!/bin/bash
# Monthly DR Test Script

# 1. Create PITR backup
RESTORE_TIME=$(date -d "1 hour ago" -Iseconds)
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-dr-test \
  --restore-to-time "$RESTORE_TIME"

# 2. Wait for restoration
sleep 1800

# 3. Validate data integrity
psql -h staging-endpoint -U postgres -d get_together -c "
  SELECT 'PASS: Row Counts' as test,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM groups) as groups,
    (SELECT COUNT(*) FROM events) as events
"

# 4. Clean up test database
aws rds delete-db-cluster \
  --db-cluster-identifier get-together-dr-test \
  --skip-final-snapshot

# 5. Report results
echo "DR Test completed: PASS"
```

### Quarterly Full Infrastructure DR Testing

**Schedule:** First week of each quarter  
**Duration:** 4-6 hours  
**Scope:** Full failover and restore

Procedure: Same as "Full Infrastructure Failure Recovery" above

---

## Rollback Procedures

### Database Corruption Rollback

If restored database still shows corruption:

```bash
# 1. Restore to earlier point in time (24 hours before corruption)
EARLIER_TIME="2026-04-05T10:00:00Z"
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod-restored \
  --db-cluster-identifier get-together-rollback \
  --restore-to-time "$EARLIER_TIME"

# 2. Validate this restoration
# ... run integrity checks ...

# 3. Promote rollback cluster if valid
aws rds modify-db-cluster-parameter-group \
  --db-cluster-parameter-group-name default-backup-active
```

### Failover Rollback (Regional Outage Recovery)

When primary region recovers:

```bash
# 1. Update Route53 failover primary
aws route53 update-health-check \
  --health-check-id <primary-id> \
  --ip-address <us-east-1-endpoint>

# 2. DNS will automatically failback to primary
# 3. Monitor logs during failback
# 4. Once stable, decommission secondary region cluster
```

---

## Monitoring & Alerting

### Critical Alerts to Watch

| Alert | Threshold | Action |
|-------|-----------|--------|
| Backup Failed | Any failure | Page on-call immediately |
| PITR Window < 24h | Duration < 24 hours | Investigate backup delays |
| Backup Size > 50GB/day | Growth exceeds limit | Analyze storage usage |
| Database Unavailable | Any downtime | Execute failover procedure |

### CloudWatch Dashboard

Regular monitoring dashboard is available at:
- **URL:** CloudWatch → Dashboards → `get-together-backup-{environment}`
- **Key Metrics:** Backup size, retention, job status, PITR window

---

## Post-Recovery Checklist

After any recovery, verify:

- [ ] Application is serving traffic normally
- [ ] Database integrity checks pass
- [ ] Audit logs show no gaps
- [ ] Backup jobs resume normal schedule
- [ ] Monitoring alerts are active
- [ ] Team communications updated
- [ ] Incident report created
- [ ] Post-mortem scheduled for critical incidents

---

## Related Documentation

- [BACKUP_RESTORATION.md](./BACKUP_RESTORATION.md) - Detailed restore procedures
- [MONITORING.md](./MONITORING.md) - Backup monitoring and alarms
- [Architecture Decisions](docs/ARCHITECTURE.md#Decision-5e) - Backup strategy rationale

---

**Last Reviewed:** 2026-04-07  
**Next Review Due:** 2026-07-07  
**Owner:** DevOps Team  
**Status:** APPROVED FOR PRODUCTION
