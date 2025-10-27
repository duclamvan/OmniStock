export interface PickPackWorkflow {
  id: string;
  orderId: string;
  status: 'pending' | 'picking' | 'ready_to_pack' | 'packing' | 'complete';
  lockedBy: string | null;
  lockExpiresAt: Date | null;
  priority: 'low' | 'medium' | 'high' | 'rush';
  waveId: string | null;
  rushFlag: boolean;
  pickerNotes: string | null;
  packerNotes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PickWave {
  id: string;
  name: string;
  orderIds: string[];
  createdBy: string;
  pickedBy: string | null;
  status: 'pending' | 'picking' | 'completed' | 'cancelled';
  priority: string;
  totalItems: number;
  pickedItems: number;
  createdAt?: Date;
  completedAt?: Date | null;
}

export interface PickPackEvent {
  id: string;
  orderId: string;
  eventType: 'claim_pick' | 'start_pick' | 'complete_pick' | 'claim_pack' | 'start_pack' | 'complete_pack' | 'release' | 'message';
  actorId: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PickPackQueue {
  pending: QueuedOrder[];
  picking: QueuedOrder[];
  ready_to_pack: QueuedOrder[];
  packing: QueuedOrder[];
  complete: QueuedOrder[];
}

export interface QueuedOrder {
  id: string;
  orderId: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'rush';
  rushFlag: boolean;
  lockedBy: string | null;
  lockExpiresAt: Date | null;
  waveId: string | null;
  pickerNotes: string | null;
  packerNotes: string | null;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    orderStatus: string;
    items?: Array<{
      id: string;
      productName: string | null;
      sku: string | null;
      quantity: number;
      warehouseLocation: string | null;
      barcode: string | null;
    }>;
  };
  lockInfo: {
    isLocked: boolean;
    lockedBy: string | null;
    expiresAt: Date | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PerformanceMetrics {
  ordersCompleted: number;
  avgPickTime: number;
  avgPackTime: number;
  itemsPerHour: number;
  queueDepth: {
    pending: number;
    picking: number;
    ready_to_pack: number;
    packing: number;
  };
  period: string;
}

export interface LeaderboardEntry {
  employeeName: string;
  ordersCompleted: number;
  avgTime: number;
  accuracy: number;
}
