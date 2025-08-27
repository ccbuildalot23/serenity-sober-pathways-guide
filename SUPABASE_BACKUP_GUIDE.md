# 🔒 Supabase Backup Configuration Guide
## For Non-PHI Data Only (PHI stored in AWS RDS)

### ⚡ Quick Setup (3 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in with your credentials

2. **Select Your Project**
   - Project: `tqyiqstpvwztvofrxpuf`
   - URL: `https://tqyiqstpvwztvofrxpuf.supabase.co`

3. **Navigate to Backup Settings**
   - Click: **Settings** (gear icon in sidebar)
   - Select: **Database** from the left menu
   - Click: **Backups** tab

4. **Enable Daily Backups**
   - Toggle: **Enable Point-in-Time Recovery** to ON
   - Set: **Backup Frequency** = Daily
   - Set: **Retention Period** = 30 days
   - Enable: **Email notifications for backup failures**

5. **Save Configuration**
   - Click: **Save** button
   - Verify: "Daily backups enabled" message appears
   - Check: Next scheduled backup time is displayed

### ✅ Verification Steps

After enabling backups:
1. Look for green checkmark next to "Backups enabled"
2. Verify backup schedule shows (e.g., "Next backup: 2:00 AM UTC")
3. Check email for backup confirmation notification

### 📊 What Gets Backed Up

**Included (Non-PHI only):**
- User authentication records (emails, IDs)
- Application settings and preferences
- Anonymous usage statistics
- Support tickets (without medical details)
- Session logs (without health data)
- UI preferences and themes

**NOT Included (Stored in AWS RDS):**
- Patient medical records
- Diagnoses and medications
- SSN and date of birth
- Insurance information
- Clinical notes
- Mental health assessments
- Substance use history

### 🔄 Restore Procedures

**For Non-PHI Data (Supabase):**
1. Go to Settings → Database → Backups
2. Select restoration point (up to 30 days)
3. Click "Restore" and confirm
4. Wait 5-15 minutes for restoration

**For PHI Data (AWS RDS):**
- Automated daily snapshots with 30-day retention
- Point-in-time recovery to any second
- Cross-region backup replication
- Encrypted backups with KMS

### 🚨 Important Security Notes

1. **Data Separation is Critical**
   - Supabase = Operational data only
   - AWS RDS = All PHI and medical data
   - Never store PHI in Supabase

2. **Compliance Requirements**
   - 30-day retention meets HIPAA standards
   - Daily backups ensure < 24hr data loss
   - Encrypted storage and transmission

3. **Testing Backups**
   - Test restore monthly to staging
   - Document restore time (RTO)
   - Verify data integrity post-restore

### 📝 Quick Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Selected correct project
- [ ] Navigated to Settings → Database → Backups
- [ ] Enabled Point-in-Time Recovery
- [ ] Set retention to 30 days
- [ ] Enabled email notifications
- [ ] Saved configuration
- [ ] Verified "Backups enabled" status
- [ ] Documented in compliance records

### 🎯 Next Steps

Once Supabase backups are enabled:
1. Document backup configuration in `docs/COMPLIANCE.md`
2. Set calendar reminder for monthly restore tests
3. Configure AWS RDS automated backups
4. Proceed with staging deployment

**Reply "BACKUPS DONE" when configuration is complete!**