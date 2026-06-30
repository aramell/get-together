# Backup and Restoration Guide
## Get-Together Application

**Status:** Production Ready  
**Last Updated:** 2026-04-07  
**Next Review:** 2026-07-07  

---

## Overview

This document provides step-by-step instructions for restoring application data from backups. It covers:
- How to manually restore from Aurora snapshots
- How to perform Point-in-Time (PITR) restore
- How to recover deleted data
- How to restore S3 user content
- Troubleshooting common restoration issues

**Key Metrics:**
- **RPO (Recovery Point Objective):** < 1 hour (hourly backups)
- **RTO (Recovery Time Objective):** < 2 hours (manual restore)
- **Backup Retention:** 30 days (dev), 90 days (staging), 365 days (production)

---

## Table of Contents

1. [Before You Start](#before-you-start)
2. [Restore from Snapshot](#restore-from-snapshot)
3. [Point-in-Time Restore (PITR)](#point-in-time-restore-pitr)
4. [Recover Deleted Data](#recover-deleted-data)
5. [Restore S3 Content](#restore-s3-content)
6. [Verify Restored Data](#verify-restored-data)
7. [Troubleshooting](#troubleshooting)

---

## Before You Start

### Prerequisites

You need:
- AWS CLI configured with appropriate credentials
- Access to RDS cluster management
- PostgreSQL client tools (`psql`, `pg_restore`)
- Read-only database access to verify restoration

### Verify Backup Availability

```bash
# Check available RDS snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier get-together-prod \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,CreateTime,Status]' \
  --output table

# Check PITR window (automatic point-in-time recovery)
aws rds describe-db-clusters \
  --db-cluster-identifier get-together-prod \
  --query 'DBClusters[0].[LatestRestorableTime,BackupRetentionPeriod]'
```

### Determine Recovery Need

| Scenario | Recovery Method | Time to Recover |
|----------|-----------------|-----------------|
| Need data from specific time | PITR (Point-in-Time) | 30-45 min |
| Database corrupted, need recent backup | Snapshot Restore | 20-30 min |
| Accidental deletion, need old version | PITR to past date | 30-45 min |
| S3 file was deleted | S3 versioning restore | 5-10 min |
| Need to audit deleted records | Export from recovery DB | 15-20 min |

---

## Restore from Snapshot

### When to Use

- Database is fully corrupted/inaccessible
- Need to recover from specific snapshot
- Snapshot-based backup available

### Procedure

**Step 1: Create Cluster from Snapshot (15-20 min)**

```bash
# List available snapshots
SNAPSHOT_ID=$(aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier get-together-prod \
  --query 'DBClusterSnapshots[0].DBClusterSnapshotIdentifier' \
  --output text)

echo "Using snapshot: $SNAPSHOT_ID"

# Restore from snapshot (creates new cluster)
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier get-together-prod-restore-$(date +%s) \
  --snapshot-identifier "$SNAPSHOT_ID" \
  --engine aurora-postgresql \
  --engine-version 15.2 \
  --db-subnet-group-name default \
  --vpc-security-group-ids sg-xxxxxxxx \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/xxxxxxxx

# Wait for restoration (monitor status)
RESTORED_CLUSTER="get-together-prod-restore-$(date +%s)"
aws rds describe-db-clusters \
  --db-cluster-identifier "$RESTORED_CLUSTER" \
  --query 'DBClusters[0].Status'
```

**Step 2: Create Read-Only Instance (5-10 min)**

```bash
# Create a read-only instance in restored cluster
aws rds create-db-instance \
  --db-instance-identifier "${RESTORED_CLUSTER}-reader" \
  --db-cluster-identifier "$RESTORED_CLUSTER" \
  --db-instance-class db.t3.small \
  --engine aurora-postgresql \
  --publicly-accessible false

# Wait for instance to become available
aws rds describe-db-instances \
  --db-instance-identifier "${RESTORED_CLUSTER}-reader" \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Step 3: Promote to Production (if validation succeeds)**

```bash
# Only run this if data looks good (see Verify Restored Data section)

# 1. Update Route53 to point to restored cluster
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://promote-restored.json

# Content of promote-restored.json:
# {
#   "Changes": [{
#     "Action": "UPSERT",
#     "ResourceRecordSet": {
#       "Name": "database.get-together.internal",
#       "Type": "CNAME",
#       "TTL": 300,
#       "ResourceRecords": [{
#         "Value": "get-together-prod-restore-xxx.cluster.us-east-1.amazonaws.com"
#       }]
#     }
#   }]
# }

# 2. Update application database endpoint
kubectl set env deployment/app-deployment \
  DATABASE_HOST="${RESTORED_CLUSTER}.cluster.us-east-1.amazonaws.com" \
  -n production

# 3. Restart application
kubectl rollout restart deployment/app-deployment -n production

# 4. Monitor logs
kubectl logs -f deployment/app-deployment -n production --tail=100
```

---

## Point-in-Time Restore (PITR)

### When to Use

- Recover deleted data from specific time
- Restore database to state before corruption
- GDPR: restore user data to point before deletion request
- Most flexible: can restore to any time within retention window

### Procedure

**Step 1: Identify Target Restore Time (2-5 min)**

```bash
# List recent transactions in audit logs
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     -c "SELECT created_at, operation, table_name, user_id FROM audit_logs \
         WHERE created_at > NOW() - INTERVAL '24 hours' \
         ORDER BY created_at DESC LIMIT 20;"

# Determine time BEFORE the problem occurred
# Example: Problem at 2026-04-06T15:30:00Z
# Restore to: 2026-04-06T15:00:00Z (30 minutes before)
```

**Step 2: Create PITR Cluster (30-45 min)**

```bash
# Specify the time to restore to
TARGET_TIME="2026-04-06T15:00:00Z"  # Before the problem

# Create new cluster from PITR
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-prod-pitr-$(date +%s) \
  --restore-type "copy-on-write" \
  --restore-to-time "$TARGET_TIME" \
  --enable-iam-database-authentication \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/xxxxxxxx

# Monitor restoration status
PITR_CLUSTER="get-together-prod-pitr-$(date +%s)"
watch -n 10 'aws rds describe-db-clusters \
  --db-cluster-identifier "'$PITR_CLUSTER'" \
  --query "DBClusters[0].Status"'
```

**Step 3: Create Read-Only Instance for Verification (5-10 min)**

```bash
# Add an instance to the PITR cluster for testing
aws rds create-db-instance \
  --db-instance-identifier "${PITR_CLUSTER}-check" \
  --db-cluster-identifier "$PITR_CLUSTER" \
  --db-instance-class db.t3.small \
  --engine aurora-postgresql

# Wait for it to be available
aws rds describe-db-instances \
  --db-instance-identifier "${PITR_CLUSTER}-check" \
  --query 'DBInstances[0].[DBInstanceStatus,Endpoint.Address]'
```

**Step 4: Validate Data (5-10 min)**

```bash
# Connect to PITR cluster (read-only)
PITR_ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier "$PITR_CLUSTER" \
  --query 'DBClusters[0].Endpoint' \
  --output text)

psql -h "$PITR_ENDPOINT" \
     -U postgres \
     -d get_together \
     << EOF
-- Verify data at restore point
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_groups FROM groups;
SELECT COUNT(*) as total_events FROM events;

-- Check for the data you're recovering
SELECT id, email, created_at FROM users 
WHERE email = 'recovered-user@example.com'
LIMIT 1;
EOF
```

**Step 5: Export Specific Deleted Data (optional)**

If recovering specific deleted records (like a user's profile):

```bash
# Export just the data you need
pg_dump -h "$PITR_ENDPOINT" \
        -U postgres \
        -d get_together \
        --table=users \
        --table=groups \
        --data-only \
        --where="id = 'user-uuid-here'" > recovered-user.sql

# Review the SQL before applying
cat recovered-user.sql

# Apply to current production database
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     < recovered-user.sql

# Or update with timestamp to track recovery
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     -c "UPDATE users SET recovered_from_backup_at = NOW() WHERE id = 'user-uuid-here';"
```

**Step 6: Promote PITR Cluster (if needed)**

```bash
# Only if you need to make PITR cluster the primary
aws rds modify-db-cluster \
  --db-cluster-identifier "$PITR_CLUSTER" \
  --new-db-cluster-identifier get-together-prod-new \
  --apply-immediately

# Then rename back to production after deleting old cluster
```

---

## Recover Deleted Data

### When to Use

- User deleted their account (GDPR)
- Accidental bulk deletion
- Data loss from application bug

### Procedure

**Step 1: Check Soft Delete Status**

```bash
# Check if records are soft-deleted (deleted_at column)
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     -c "SELECT id, email, deleted_at FROM users \
         WHERE deleted_at IS NOT NULL \
         ORDER BY deleted_at DESC LIMIT 10;"
```

**Step 2: Restore Soft-Deleted Records**

```bash
# If using soft delete (deleted_at column), just undelete
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     << EOF
BEGIN;

-- Restore deleted user and related data
UPDATE users 
SET deleted_at = NULL, updated_at = NOW() 
WHERE id = 'user-uuid-here' AND deleted_at IS NOT NULL;

UPDATE groups 
SET deleted_at = NULL, updated_at = NOW() 
WHERE created_by = 'user-uuid-here' AND deleted_at IS NOT NULL;

-- Log the recovery action
INSERT INTO audit_logs (user_id, operation, table_name, record_id, changes, created_at)
VALUES ('system-user', 'UNDELETE', 'users', 'user-uuid-here', 
        'Recovered from backup', NOW());

COMMIT;
EOF
```

**Step 3: Hard-Deleted Data Recovery (PITR required)**

If records were hard-deleted:

```bash
# Create PITR cluster to point before deletion
TARGET_TIME="2026-04-05T10:00:00Z"  # Before deletion

aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-recovery-temp \
  --restore-type "copy-on-write" \
  --restore-to-time "$TARGET_TIME"

# Wait for PITR to complete
sleep 2700  # 45 minutes

# Export deleted records
pg_dump -h get-together-recovery-temp.cluster.us-east-1.amazonaws.com \
        -U postgres \
        -d get_together \
        --table=users \
        --data-only \
        --where="id = 'user-uuid-here'" > deleted-user-recovery.sql

# Apply to production
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     < deleted-user-recovery.sql

# Clean up recovery cluster
aws rds delete-db-cluster \
  --db-cluster-identifier get-together-recovery-temp \
  --skip-final-snapshot
```

---

## Restore S3 Content

### When to Use

- User file/photo was deleted
- S3 bucket content needs rollback
- Recover to specific version

### Procedure

**Step 1: List Available Versions**

```bash
# Show all versions of a specific object
aws s3api list-object-versions \
  --bucket get-together-user-content \
  --prefix "users/user-uuid-here/" \
  --output table
```

**Step 2: Restore Specific Version**

```bash
# Copy specific old version to current
aws s3api get-object \
  --bucket get-together-user-content \
  --key "users/user-uuid-here/profile.jpg" \
  --version-id "VERSION_ID_HERE" \
  "profile-restored.jpg"

# Or directly copy back to S3
aws s3api copy-object \
  --bucket get-together-user-content \
  --key "users/user-uuid-here/profile.jpg" \
  --copy-source "get-together-user-content/users/user-uuid-here/profile.jpg?versionId=VERSION_ID_HERE"
```

**Step 3: Verify Restored File**

```bash
# Verify file size and metadata
aws s3api head-object \
  --bucket get-together-user-content \
  --key "users/user-uuid-here/profile.jpg"
```

---

## Verify Restored Data

### Run These Checks After Any Restoration

```bash
#!/bin/bash
# Comprehensive restoration validation script

DB_HOST="get-together-prod.cluster.us-east-1.amazonaws.com"
DB_USER="postgres"
DB_NAME="get_together"

echo "=== Backup Restoration Validation ==="

# 1. Row count verification
echo "1. Row Count Verification:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM groups) as group_count,
  (SELECT COUNT(*) FROM events) as event_count,
  (SELECT COUNT(*) FROM availabilities) as availability_count;
EOF

# 2. Integrity checks
echo "2. Referential Integrity:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Check for orphaned group memberships
SELECT COUNT(*) as orphaned_memberships FROM group_memberships 
WHERE user_id NOT IN (SELECT id FROM users);

-- Check for orphaned events
SELECT COUNT(*) as orphaned_events FROM events 
WHERE group_id NOT IN (SELECT id FROM groups);
EOF

# 3. Time-series verification
echo "3. Data Timeline Continuity:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF
SELECT 
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  COUNT(*) as total_records
FROM audit_logs;
EOF

# 4. Application health check
echo "4. Application Health Check:"
curl -s https://api.get-together.com/health/ready | jq '.'

# 5. Database connection test
echo "5. Database Connection Test:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT version();"
```

---

## Troubleshooting

### Issue: PITR Cluster Creation Fails with "Invalid DB Subnet Group"

```bash
# Solution: Specify correct subnet group
aws rds describe-db-subnet-groups --query 'DBSubnetGroups[*].DBSubnetGroupName'

# Then include in restore command
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-pitr \
  --restore-type "copy-on-write" \
  --restore-to-time "2026-04-06T10:00:00Z" \
  --db-subnet-group-name "your-subnet-group-name"  # Add this
```

### Issue: Restored Database Connection Timeout

```bash
# Solution: Check security group rules
aws ec2 describe-security-groups \
  --group-ids sg-xxxxxxxx \
  --query 'SecurityGroups[0].IpPermissions'

# Verify connectivity from application
nc -zv get-together-prod-restore.cluster.us-east-1.amazonaws.com 5432
```

### Issue: Data Loss Still Showing After Restore

```bash
# Verify restore timestamp
aws rds describe-db-clusters \
  --db-cluster-identifier "get-together-pitr-xxx" \
  --query 'DBClusters[0].LatestRestorableTime'

# If timestamp is after data loss, choose earlier time
# Example: If loss at 15:30, restore to 15:00 or earlier

aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier get-together-prod \
  --db-cluster-identifier get-together-pitr-retry \
  --restore-type "copy-on-write" \
  --restore-to-time "2026-04-06T14:30:00Z"  # Earlier time
```

### Issue: S3 Object Lock Preventing Restore

```bash
# Check Object Lock status
aws s3api get-object-lock-configuration \
  --bucket get-together-user-content

# If Object Lock is in GOVERNANCE mode, admin can override
aws s3api put-object-retention \
  --bucket get-together-user-content \
  --key "users/path/file.jpg" \
  --retention 'Mode=GOVERNANCE,RetainUntilDate=2026-04-01T00:00:00Z' \
  --bypass-governance-retention

# Then restore
aws s3api copy-object \
  --bucket get-together-user-content \
  --key "users/path/file.jpg" \
  --copy-source "get-together-user-content/users/path/file.jpg?versionId=OLD_VERSION_ID"
```

### Issue: Slow Restore Performance

```bash
# Check for long-running transactions
psql -h get-together-prod.cluster.us-east-1.amazonaws.com \
     -U postgres \
     -d get_together \
     -c "SELECT pid, usename, state, query, query_start FROM pg_stat_activity \
         WHERE state != 'idle' AND query_start < NOW() - INTERVAL '5 minutes';"

# Kill blocking transactions if safe
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 hour';
```

---

## Recovery Checklist

After completing any restoration:

- [ ] Verified row counts match expected values
- [ ] Ran referential integrity checks (no orphaned records)
- [ ] Checked data timeline continuity
- [ ] Confirmed application can connect to database
- [ ] Validated SSL/TLS connections work
- [ ] Performed application health check
- [ ] Verified user-facing features work
- [ ] Checked audit logs for recovery action
- [ ] Documented recovery in incident ticket
- [ ] Notified stakeholders of recovery completion

---

## Related Documentation

- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Disaster recovery procedures
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [AWS RDS Backup & Restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)

---

**Last Reviewed:** 2026-04-07  
**Next Review Due:** 2026-07-07  
**Owner:** DevOps Team  
**Status:** APPROVED FOR PRODUCTION
