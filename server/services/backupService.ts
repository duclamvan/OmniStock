import { db } from '../db';
import { 
  databaseBackups, 
  users, 
  products, 
  orders, 
  orderItems, 
  customers, 
  categories,
  warehouses,
  suppliers,
  employees,
  appSettings,
  productVariants,
  productLocations,
  productFiles,
  discounts,
  expenses,
  tickets,
  notifications,
  importPurchases,
  purchaseItems,
  consolidations,
  shipments,
  receipts,
  receiptItems,
  stockAdjustmentHistory,
  packingMaterials,
  packingCartons,
  orderCartons,
  warehouseLayouts,
  layoutBins,
  customerShippingAddresses,
  customerBillingAddresses,
  activityLog
} from '@shared/schema';
import { eq, desc, lte, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = './backups';

interface BackupResult {
  success: boolean;
  backupId?: number;
  fileName?: string;
  error?: string;
  recordCount?: number;
  fileSize?: number;
}

interface BackupSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
}

const TABLES_TO_BACKUP = [
  { name: 'users', table: users },
  { name: 'products', table: products },
  { name: 'orders', table: orders },
  { name: 'order_items', table: orderItems },
  { name: 'customers', table: customers },
  { name: 'categories', table: categories },
  { name: 'warehouses', table: warehouses },
  { name: 'suppliers', table: suppliers },
  { name: 'employees', table: employees },
  { name: 'app_settings', table: appSettings },
  { name: 'product_variants', table: productVariants },
  { name: 'product_locations', table: productLocations },
  { name: 'product_files', table: productFiles },
  { name: 'discounts', table: discounts },
  { name: 'expenses', table: expenses },
  { name: 'tickets', table: tickets },
  { name: 'notifications', table: notifications },
  { name: 'import_purchases', table: importPurchases },
  { name: 'purchase_items', table: purchaseItems },
  { name: 'consolidations', table: consolidations },
  { name: 'shipments', table: shipments },
  { name: 'receipts', table: receipts },
  { name: 'receipt_items', table: receiptItems },
  { name: 'stock_adjustment_history', table: stockAdjustmentHistory },
  { name: 'packing_materials', table: packingMaterials },
  { name: 'packing_cartons', table: packingCartons },
  { name: 'order_cartons', table: orderCartons },
  { name: 'warehouse_layouts', table: warehouseLayouts },
  { name: 'layout_bins', table: layoutBins },
  { name: 'customer_shipping_addresses', table: customerShippingAddresses },
  { name: 'customer_billing_addresses', table: customerBillingAddresses },
  { name: 'activity_log', table: activityLog },
];

export async function getBackupSettings(): Promise<BackupSettings> {
  const settings = await db.select().from(appSettings);
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));
  
  const getValue = (key: string): string | undefined => {
    const val = settingsMap.get(key);
    if (val === undefined || val === null) return undefined;
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'number') return String(val);
    return undefined;
  };
  
  return {
    enabled: getValue('auto_backup_enabled') === 'true',
    frequency: (getValue('backup_frequency') as 'daily' | 'weekly' | 'monthly') || 'daily',
    retentionDays: parseInt(getValue('data_retention_period_days') || '30', 10),
  };
}

export async function createBackup(
  backupType: 'manual' | 'auto_daily' | 'auto_weekly' | 'auto_monthly' = 'manual',
  triggeredBy?: string
): Promise<BackupResult> {
  console.log(`📦 Starting ${backupType} backup...`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup_${backupType}_${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);
  
  const settings = await getBackupSettings();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + settings.retentionDays);
  
  const [backupRecord] = await db.insert(databaseBackups).values({
    backupType,
    status: 'in_progress',
    fileName,
    filePath,
    triggeredBy,
    expiresAt,
  }).returning();
  
  try {
    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;
    const tablesIncluded: string[] = [];
    
    for (const { name, table } of TABLES_TO_BACKUP) {
      try {
        const data = await db.select().from(table);
        backupData[name] = data;
        totalRecords += data.length;
        tablesIncluded.push(name);
        console.log(`  ✓ ${name}: ${data.length} records`);
      } catch (error) {
        console.warn(`  ⚠ Skipping ${name}: ${error}`);
      }
    }
    
    const backupJson = JSON.stringify({
      metadata: {
        createdAt: new Date().toISOString(),
        backupType,
        version: '1.0',
        totalRecords,
        tablesIncluded,
      },
      data: backupData,
    }, null, 2);
    
    fs.writeFileSync(filePath, backupJson, 'utf-8');
    
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    await db.update(databaseBackups)
      .set({
        status: 'completed',
        fileSize,
        tablesIncluded,
        recordCount: totalRecords,
        completedAt: new Date(),
      })
      .where(eq(databaseBackups.id, backupRecord.id));
    
    console.log(`✅ Backup completed: ${fileName} (${(fileSize / 1024).toFixed(2)} KB, ${totalRecords} records)`);
    
    return {
      success: true,
      backupId: backupRecord.id,
      fileName,
      recordCount: totalRecords,
      fileSize,
    };
    
  } catch (error: any) {
    console.error('❌ Backup failed:', error);
    
    await db.update(databaseBackups)
      .set({
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        completedAt: new Date(),
      })
      .where(eq(databaseBackups.id, backupRecord.id));
    
    return {
      success: false,
      backupId: backupRecord.id,
      error: error.message || 'Unknown error',
    };
  }
}

export async function listBackups() {
  return db.select({
    id: databaseBackups.id,
    backupType: databaseBackups.backupType,
    status: databaseBackups.status,
    fileName: databaseBackups.fileName,
    fileSize: databaseBackups.fileSize,
    recordCount: databaseBackups.recordCount,
    tablesIncluded: databaseBackups.tablesIncluded,
    triggeredBy: databaseBackups.triggeredBy,
    errorMessage: databaseBackups.errorMessage,
    startedAt: databaseBackups.startedAt,
    completedAt: databaseBackups.completedAt,
    expiresAt: databaseBackups.expiresAt,
  })
  .from(databaseBackups)
  .orderBy(desc(databaseBackups.startedAt))
  .limit(50);
}

export async function getBackupById(id: number) {
  const [backup] = await db.select()
    .from(databaseBackups)
    .where(eq(databaseBackups.id, id))
    .limit(1);
  return backup;
}

export async function deleteBackup(id: number): Promise<boolean> {
  const backup = await getBackupById(id);
  if (!backup) return false;
  
  if (backup.filePath && fs.existsSync(backup.filePath)) {
    fs.unlinkSync(backup.filePath);
    console.log(`🗑️ Deleted backup file: ${backup.filePath}`);
  }
  
  await db.delete(databaseBackups).where(eq(databaseBackups.id, id));
  return true;
}

export async function cleanupExpiredBackups(): Promise<number> {
  const now = new Date();
  
  const expiredBackups = await db.select()
    .from(databaseBackups)
    .where(lte(databaseBackups.expiresAt, now));
  
  let deletedCount = 0;
  
  for (const backup of expiredBackups) {
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      try {
        fs.unlinkSync(backup.filePath);
        console.log(`🗑️ Cleaned up expired backup: ${backup.fileName}`);
      } catch (error) {
        console.error(`Failed to delete backup file ${backup.filePath}:`, error);
      }
    }
    
    await db.delete(databaseBackups).where(eq(databaseBackups.id, backup.id));
    deletedCount++;
  }
  
  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} expired backups`);
  }
  
  return deletedCount;
}

export async function getLastSuccessfulBackup() {
  const [backup] = await db.select()
    .from(databaseBackups)
    .where(eq(databaseBackups.status, 'completed'))
    .orderBy(desc(databaseBackups.completedAt))
    .limit(1);
  return backup;
}

export async function getBackupStats() {
  const allBackups = await db.select().from(databaseBackups);
  
  const completed = allBackups.filter(b => b.status === 'completed');
  const failed = allBackups.filter(b => b.status === 'failed');
  const totalSize = completed.reduce((sum, b) => sum + (b.fileSize || 0), 0);
  
  const lastBackup = await getLastSuccessfulBackup();
  
  return {
    totalBackups: allBackups.length,
    completedBackups: completed.length,
    failedBackups: failed.length,
    totalSizeBytes: totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    lastBackupAt: lastBackup?.completedAt || null,
    lastBackupFileName: lastBackup?.fileName || null,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

let backupSchedulerInterval: NodeJS.Timeout | null = null;
let lastAutoBackupCheck: Date | null = null;

export async function startBackupScheduler() {
  console.log('🔄 Starting backup scheduler...');
  
  await cleanupExpiredBackups();
  
  backupSchedulerInterval = setInterval(async () => {
    try {
      const settings = await getBackupSettings();
      
      if (!settings.enabled) {
        return;
      }
      
      const now = new Date();
      const lastBackup = await getLastSuccessfulBackup();
      
      let shouldBackup = false;
      let backupType: 'auto_daily' | 'auto_weekly' | 'auto_monthly' = 'auto_daily';
      
      if (!lastBackup) {
        shouldBackup = true;
      } else {
        const lastBackupDate = new Date(lastBackup.completedAt!);
        const hoursSinceLastBackup = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);
        
        switch (settings.frequency) {
          case 'daily':
            shouldBackup = hoursSinceLastBackup >= 24;
            backupType = 'auto_daily';
            break;
          case 'weekly':
            shouldBackup = hoursSinceLastBackup >= 24 * 7;
            backupType = 'auto_weekly';
            break;
          case 'monthly':
            shouldBackup = hoursSinceLastBackup >= 24 * 30;
            backupType = 'auto_monthly';
            break;
        }
      }
      
      if (shouldBackup) {
        console.log(`⏰ Scheduled ${backupType} backup triggered`);
        await createBackup(backupType);
      }
      
      await cleanupExpiredBackups();
      
      lastAutoBackupCheck = now;
    } catch (error) {
      console.error('Backup scheduler error:', error);
    }
  }, 60 * 60 * 1000);
  
  const settings = await getBackupSettings();
  if (settings.enabled) {
    const lastBackup = await getLastSuccessfulBackup();
    if (!lastBackup) {
      console.log('📦 No previous backup found, creating initial backup...');
      await createBackup('auto_daily');
    }
  }
  
  console.log('✅ Backup scheduler started (checking every hour)');
}

export function stopBackupScheduler() {
  if (backupSchedulerInterval) {
    clearInterval(backupSchedulerInterval);
    backupSchedulerInterval = null;
    console.log('⏹️ Backup scheduler stopped');
  }
}

export function getSchedulerStatus() {
  return {
    isRunning: backupSchedulerInterval !== null,
    lastCheck: lastAutoBackupCheck,
  };
}
