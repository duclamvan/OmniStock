import type { Server as HttpServer } from "http";
import type { Server as SocketIOServer, Socket } from "socket.io";
import type { User } from "@shared/schema";

export interface RealTimeViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  socketId: string;
  joinedAt: string;
}

export interface OrderProgress {
  orderId: string;
  itemsScanned: number;
  totalItems: number;
  currentItem?: {
    productId: string;
    productName: string;
    scannedQty: number;
    totalQty: number;
  };
  lastAction?: {
    type: 'scan' | 'manual_update' | 'verify' | 'complete';
    timestamp: string;
    userId: string;
    userName: string;
  };
}

export interface LockInfo {
  lockedByUserId: string;
  lockedByUserName: string;
  lockedByUserAvatar?: string;
  lockedAt: string;
  lockType: 'view' | 'edit';
}

export interface RoomState {
  roomId: string;
  roomType: 'order' | 'shipment';
  viewers: RealTimeViewer[];
  lockInfo?: LockInfo;
  progress?: OrderProgress;
}

export interface SocketEventPayloads {
  join_room: {
    roomType: 'order' | 'shipment';
    entityId: string;
  };
  leave_room: {
    roomType: 'order' | 'shipment';
    entityId: string;
  };
  request_lock: {
    roomType: 'order' | 'shipment';
    entityId: string;
    lockType: 'view' | 'edit';
  };
  release_lock: {
    roomType: 'order' | 'shipment';
    entityId: string;
  };
  update_progress: {
    roomType: 'order' | 'shipment';
    entityId: string;
    progress: Partial<OrderProgress>;
  };
  broadcast_action: {
    actionType: 'label_generated' | 'order_completed' | 'stock_intake' | 'shipment_received' | 'custom';
    entityId?: string;
    message: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    metadata?: Record<string, any>;
  };
}

export interface OrderUpdatePayload {
  orderId: string;
  updateType: 'status' | 'items' | 'shipping' | 'general';
  timestamp: string;
  updatedBy?: string;
}

export interface ServerToClientEvents {
  room_state: (state: RoomState) => void;
  viewer_joined: (viewer: RealTimeViewer) => void;
  viewer_left: (data: { socketId: string; userId: string }) => void;
  lock_acquired: (lockInfo: LockInfo) => void;
  lock_released: (data: { roomId: string }) => void;
  lock_denied: (data: { reason: string; currentLock?: LockInfo }) => void;
  progress_updated: (progress: OrderProgress) => void;
  global_notification: (notification: {
    id: string;
    type: 'info' | 'success' | 'warning';
    actionType: string;
    message: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    entityId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }) => void;
  force_unlock: (data: { roomId: string; reason: string }) => void;
  error: (data: { message: string; code?: string }) => void;
  order_updated: (payload: OrderUpdatePayload) => void;
}

export interface ClientToServerEvents {
  join_room: (payload: SocketEventPayloads['join_room']) => void;
  leave_room: (payload: SocketEventPayloads['leave_room']) => void;
  request_lock: (payload: SocketEventPayloads['request_lock']) => void;
  release_lock: (payload: SocketEventPayloads['release_lock']) => void;
  update_progress: (payload: SocketEventPayloads['update_progress']) => void;
  broadcast_action: (payload: SocketEventPayloads['broadcast_action']) => void;
  ping: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: User;
  currentRooms: Set<string>;
  lastActivity: Date;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type TypedSocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export interface SocketServiceConfig {
  httpServer: HttpServer;
  sessionMiddleware: any;
  disconnectTimeout: number; // Milliseconds before auto-unlock on disconnect
  heartbeatInterval: number; // Milliseconds between heartbeat checks
}
