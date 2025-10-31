import Dexie, { Table } from 'dexie';

export interface CachedOrder {
  id: string;
  orderId: string;
  customerName: string;
  status: string;
  pickStatus: string;
  packStatus: string;
  items: any[];
  version: number;
  lastSyncedAt: Date;
  cachedAt: Date;
}

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  warehouseLocation: string | null;
  quantity: number;
  version: number;
  cachedAt: Date;
}

export interface PendingMutation {
  id: string;
  entityType: 'order' | 'product' | 'inventory' | 'pick' | 'pack';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: Date;
  version: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

export interface SyncMetadata {
  key: string;
  lastSyncedAt: Date;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

export class OfflineDatabase extends Dexie {
  cachedOrders!: Table<CachedOrder, string>;
  cachedProducts!: Table<CachedProduct, string>;
  pendingMutations!: Table<PendingMutation, string>;
  syncMetadata!: Table<SyncMetadata, string>;

  constructor() {
    super('DavieSupplyOfflineDB');
    
    this.version(1).stores({
      cachedOrders: 'id, orderId, status, pickStatus, packStatus, lastSyncedAt',
      cachedProducts: 'id, sku, barcode, warehouseLocation',
      pendingMutations: 'id, entityType, entityId, timestamp, status',
      syncMetadata: 'key, lastSyncedAt, syncStatus'
    });
  }
}

export const offlineDb = new OfflineDatabase();
