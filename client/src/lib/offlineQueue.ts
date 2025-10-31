import { nanoid } from 'nanoid';
import { offlineDb, PendingMutation } from './offlineDb';
import { apiRequest } from './queryClient';

class OfflineQueueManager {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncListeners: Set<(status: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    if (this.isOnline) {
      setTimeout(() => this.syncPendingMutations(), 1000);
    }
  }

  private handleOnline() {
    console.log('🌐 Connection restored - starting sync');
    this.isOnline = true;
    this.notifyListeners();
    this.syncPendingMutations();
  }

  private handleOffline() {
    console.log('📴 Connection lost - offline mode activated');
    this.isOnline = false;
    this.notifyListeners();
  }

  public addSyncListener(callback: (isOnline: boolean) => void) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  private notifyListeners() {
    this.syncListeners.forEach(listener => listener(this.isOnline));
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  async queueMutation(
    entityType: PendingMutation['entityType'],
    entityId: string,
    operation: PendingMutation['operation'],
    payload: any
  ): Promise<void> {
    const mutation: PendingMutation = {
      id: nanoid(),
      entityType,
      entityId,
      operation,
      payload,
      timestamp: new Date(),
      version: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    await offlineDb.pendingMutations.add(mutation);
    console.log('📝 Queued mutation for offline sync:', mutation);

    if (this.isOnline && !this.isSyncing) {
      this.syncPendingMutations();
    }
  }

  async syncPendingMutations(): Promise<void> {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting offline mutation sync...');

    try {
      const pendingMutations = await offlineDb.pendingMutations
        .where('status')
        .equals('pending')
        .or('status')
        .equals('failed')
        .toArray();

      if (pendingMutations.length === 0) {
        console.log('✅ No pending mutations to sync');
        this.isSyncing = false;
        return;
      }

      console.log(`📤 Syncing ${pendingMutations.length} pending mutation(s)...`);

      for (const mutation of pendingMutations) {
        try {
          await this.executeMutation(mutation);
          await offlineDb.pendingMutations.update(mutation.id, {
            status: 'completed'
          });
          console.log('✅ Successfully synced mutation:', mutation.id);
        } catch (error) {
          console.error('❌ Failed to sync mutation:', mutation.id, error);
          await offlineDb.pendingMutations.update(mutation.id, {
            status: 'failed',
            retryCount: mutation.retryCount + 1,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      await offlineDb.syncMetadata.put({
        key: 'last_sync',
        lastSyncedAt: new Date(),
        syncStatus: 'idle'
      });

      console.log('✅ Offline sync completed successfully');
    } catch (error) {
      console.error('❌ Offline sync failed:', error);
      await offlineDb.syncMetadata.put({
        key: 'last_sync',
        lastSyncedAt: new Date(),
        syncStatus: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeMutation(mutation: PendingMutation): Promise<void> {
    const { entityType, operation, payload } = mutation;

    let method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' = 'POST';
    let endpoint = '';
    let requestBody: any = payload;

    switch (entityType) {
      case 'pick':
        method = 'PATCH';
        endpoint = `/api/orders/${payload.orderId}/items/${payload.itemId}`;
        const { orderId: _orderId, itemId: _itemId, ...pickBody } = payload;
        requestBody = pickBody;
        break;
      
      case 'pack':
        method = 'PATCH';
        endpoint = `/api/orders/${payload.orderId}`;
        const { orderId: _packOrderId, ...packBody } = payload;
        requestBody = packBody;
        break;
      
      case 'inventory':
        method = 'POST';
        endpoint = `/api/products/${payload.productId}/adjust-stock`;
        const { productId: _productId, ...inventoryBody } = payload;
        requestBody = inventoryBody;
        break;
      
      case 'order':
        if (operation === 'update') {
          method = 'PATCH';
          endpoint = `/api/orders/${mutation.entityId}`;
        }
        break;
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    if (!endpoint) {
      throw new Error(`Could not determine endpoint for mutation: ${entityType} ${operation}`);
    }

    const response = await apiRequest(method, endpoint, requestBody);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 0) {
      return await response.json();
    }
    
    return;
  }

  async clearCompletedMutations(): Promise<void> {
    await offlineDb.pendingMutations
      .where('status')
      .equals('completed')
      .delete();
  }

  async getPendingMutationsCount(): Promise<number> {
    return await offlineDb.pendingMutations
      .where('status')
      .equals('pending')
      .count();
  }

  async getTotalUnsynced(): Promise<number> {
    return await offlineDb.pendingMutations
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
  }

  async getFailedMutationsCount(): Promise<number> {
    return await offlineDb.pendingMutations
      .where('status')
      .equals('failed')
      .count();
  }

  async retryFailedMutations(): Promise<void> {
    const failedMutations = await offlineDb.pendingMutations
      .where('status')
      .equals('failed')
      .toArray();
    
    for (const mutation of failedMutations) {
      await offlineDb.pendingMutations.update(mutation.id, {
        status: 'pending',
        retryCount: 0
      });
    }
    
    if (this.isOnline) {
      this.syncPendingMutations();
    }
  }
}

export const offlineQueue = new OfflineQueueManager();
