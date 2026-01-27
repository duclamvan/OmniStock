import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { 
  TypedSocket, 
  TypedSocketServer, 
  RoomState, 
  RealTimeViewer, 
  LockInfo, 
  OrderProgress,
  SocketServiceConfig,
  OrderUpdatePayload
} from "./types";
import { db } from "../db";
import { orders, shipments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class SocketService {
  private io: TypedSocketServer;
  private roomStates: Map<string, RoomState> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: SocketServiceConfig;
  
  constructor(config: SocketServiceConfig) {
    this.config = config;
    
    this.io = new SocketIOServer(config.httpServer, {
      cors: {
        origin: process.env.NODE_ENV === "production" 
          ? [
              process.env.REPLIT_DEV_DOMAIN || "", 
              `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
              "https://wms.davie.shop",
              "https://www.wms.davie.shop"
            ].filter(Boolean)
          : ["http://localhost:5000", "http://localhost:3000", "http://0.0.0.0:5000"],
        credentials: true,
        methods: ["GET", "POST"]
      },
      allowEIO3: true,
      pingTimeout: 20000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });
    
    this.setupMiddleware(config.sessionMiddleware);
    this.setupEventHandlers();
    this.startHeartbeat();
    
    console.log("[SocketService] Initialized and ready for connections");
  }
  
  private setupMiddleware(sessionMiddleware: any) {
    this.io.use((socket, next) => {
      sessionMiddleware(socket.request, {} as any, next);
    });
    
    this.io.use((socket, next) => {
      const req = socket.request as any;
      if (req.session?.passport?.user) {
        socket.data.user = req.session.passport.user;
        socket.data.currentRooms = new Set();
        socket.data.lastActivity = new Date();
        next();
      } else {
        console.log("[SocketService] Unauthorized connection attempt");
        next(new Error("Unauthorized"));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on("connection", (socket: TypedSocket) => {
      const user = socket.data.user;
      console.log(`[SocketService] User connected: ${user?.firstName || user?.username} (${socket.id})`);
      
      socket.join(`user:${user?.id}`);
      
      socket.on("join_room", async (payload) => {
        await this.handleJoinRoom(socket, payload);
      });
      
      socket.on("leave_room", async (payload) => {
        await this.handleLeaveRoom(socket, payload);
      });
      
      socket.on("request_lock", async (payload) => {
        await this.handleRequestLock(socket, payload);
      });
      
      socket.on("release_lock", async (payload) => {
        await this.handleReleaseLock(socket, payload);
      });
      
      socket.on("update_progress", async (payload) => {
        await this.handleUpdateProgress(socket, payload);
      });
      
      socket.on("broadcast_action", async (payload) => {
        await this.handleBroadcastAction(socket, payload);
      });
      
      socket.on("ping", () => {
        socket.data.lastActivity = new Date();
      });
      
      socket.on("disconnect", async (reason) => {
        console.log(`[SocketService] User disconnected: ${user?.firstName || user?.username} (${reason})`);
        await this.handleDisconnect(socket);
      });
    });
  }
  
  private getRoomId(roomType: 'order' | 'shipment', entityId: string): string {
    return `${roomType}:${entityId}`;
  }
  
  private async handleJoinRoom(
    socket: TypedSocket, 
    payload: { roomType: 'order' | 'shipment'; entityId: string }
  ) {
    const roomId = this.getRoomId(payload.roomType, payload.entityId);
    const user = socket.data.user;
    
    if (!user) {
      socket.emit("error", { message: "User not authenticated", code: "AUTH_ERROR" });
      return;
    }
    
    socket.join(roomId);
    socket.data.currentRooms.add(roomId);
    
    this.clearDisconnectTimer(socket.id);
    
    const viewer: RealTimeViewer = {
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      userAvatar: user.profileImageUrl || undefined,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    };
    
    let roomState = this.roomStates.get(roomId);
    if (!roomState) {
      roomState = {
        roomId,
        roomType: payload.roomType,
        viewers: [],
        lockInfo: await this.getLockFromDb(payload.roomType, payload.entityId)
      };
      this.roomStates.set(roomId, roomState);
    }
    
    const existingViewerIndex = roomState.viewers.findIndex(v => v.userId === user.id);
    if (existingViewerIndex >= 0) {
      roomState.viewers[existingViewerIndex] = viewer;
    } else {
      roomState.viewers.push(viewer);
    }
    
    await this.updateViewersInDb(payload.roomType, payload.entityId, roomState.viewers);
    
    socket.emit("room_state", roomState);
    
    socket.to(roomId).emit("viewer_joined", viewer);
    
    console.log(`[SocketService] ${viewer.userName} joined ${roomId} (${roomState.viewers.length} viewers)`);
  }
  
  private async handleLeaveRoom(
    socket: TypedSocket,
    payload: { roomType: 'order' | 'shipment'; entityId: string }
  ) {
    const roomId = this.getRoomId(payload.roomType, payload.entityId);
    await this.removeViewerFromRoom(socket, roomId, payload.roomType, payload.entityId);
  }
  
  private async removeViewerFromRoom(
    socket: TypedSocket,
    roomId: string,
    roomType: 'order' | 'shipment',
    entityId: string
  ) {
    const user = socket.data.user;
    if (!user) return;
    
    socket.leave(roomId);
    socket.data.currentRooms.delete(roomId);
    
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.viewers = roomState.viewers.filter(v => v.socketId !== socket.id);
      
      if (roomState.lockInfo?.lockedByUserId === user.id) {
        await this.releaseLockInternal(roomType, entityId, roomState);
        this.io.to(roomId).emit("lock_released", { roomId });
      }
      
      await this.updateViewersInDb(roomType, entityId, roomState.viewers);
      
      this.io.to(roomId).emit("viewer_left", { socketId: socket.id, userId: user.id });
      
      if (roomState.viewers.length === 0) {
        this.roomStates.delete(roomId);
      }
      
      console.log(`[SocketService] ${user.firstName || user.username} left ${roomId} (${roomState.viewers.length} viewers)`);
    }
  }
  
  private async handleRequestLock(
    socket: TypedSocket,
    payload: { roomType: 'order' | 'shipment'; entityId: string; lockType: 'view' | 'edit' }
  ) {
    const roomId = this.getRoomId(payload.roomType, payload.entityId);
    const user = socket.data.user;
    
    if (!user) {
      socket.emit("error", { message: "User not authenticated", code: "AUTH_ERROR" });
      return;
    }
    
    const roomState = this.roomStates.get(roomId);
    if (!roomState) {
      socket.emit("error", { message: "Room not found. Join the room first.", code: "ROOM_NOT_FOUND" });
      return;
    }
    
    if (roomState.lockInfo) {
      if (roomState.lockInfo.lockedByUserId === user.id) {
        socket.emit("lock_acquired", roomState.lockInfo);
        return;
      }
      
      if (roomState.lockInfo.lockType === 'edit') {
        socket.emit("lock_denied", { 
          reason: `This ${payload.roomType} is currently being edited by ${roomState.lockInfo.lockedByUserName}`,
          currentLock: roomState.lockInfo 
        });
        return;
      }
      
      if (payload.lockType === 'edit' && roomState.lockInfo.lockType === 'view') {
        socket.emit("lock_denied", { 
          reason: `This ${payload.roomType} is currently being viewed by ${roomState.lockInfo.lockedByUserName}. They must release it first.`,
          currentLock: roomState.lockInfo 
        });
        return;
      }
    }
    
    const lockInfo: LockInfo = {
      lockedByUserId: user.id,
      lockedByUserName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      lockedByUserAvatar: user.profileImageUrl || undefined,
      lockedAt: new Date().toISOString(),
      lockType: payload.lockType
    };
    
    roomState.lockInfo = lockInfo;
    
    await this.updateLockInDb(payload.roomType, payload.entityId, user.id);
    
    this.io.to(roomId).emit("lock_acquired", lockInfo);
    
    console.log(`[SocketService] ${lockInfo.lockedByUserName} acquired ${payload.lockType} lock on ${roomId}`);
  }
  
  private async handleReleaseLock(
    socket: TypedSocket,
    payload: { roomType: 'order' | 'shipment'; entityId: string }
  ) {
    const roomId = this.getRoomId(payload.roomType, payload.entityId);
    const user = socket.data.user;
    
    if (!user) return;
    
    const roomState = this.roomStates.get(roomId);
    if (!roomState?.lockInfo) return;
    
    if (roomState.lockInfo.lockedByUserId !== user.id) {
      socket.emit("error", { message: "You don't own this lock", code: "LOCK_NOT_OWNED" });
      return;
    }
    
    await this.releaseLockInternal(payload.roomType, payload.entityId, roomState);
    
    this.io.to(roomId).emit("lock_released", { roomId });
    
    console.log(`[SocketService] ${user.firstName || user.username} released lock on ${roomId}`);
  }
  
  private async releaseLockInternal(
    roomType: 'order' | 'shipment',
    entityId: string,
    roomState: RoomState
  ) {
    roomState.lockInfo = undefined;
    
    try {
      if (roomType === 'order') {
        await db.update(orders)
          .set({ lockedByUserId: null, lockedAt: null })
          .where(eq(orders.id, entityId));
      } else {
        await db.update(shipments)
          .set({ lockedByUserId: null, lockedAt: null })
          .where(eq(shipments.id, entityId));
      }
    } catch (error) {
      console.error(`[SocketService] Failed to release lock in DB:`, error);
    }
  }
  
  private async handleUpdateProgress(
    socket: TypedSocket,
    payload: { roomType: 'order' | 'shipment'; entityId: string; progress: Partial<OrderProgress> }
  ) {
    const roomId = this.getRoomId(payload.roomType, payload.entityId);
    const user = socket.data.user;
    
    if (!user) return;
    
    const roomState = this.roomStates.get(roomId);
    if (!roomState) return;
    
    const updatedProgress: OrderProgress = {
      orderId: payload.entityId,
      itemsScanned: payload.progress.itemsScanned ?? roomState.progress?.itemsScanned ?? 0,
      totalItems: payload.progress.totalItems ?? roomState.progress?.totalItems ?? 0,
      currentItem: payload.progress.currentItem ?? roomState.progress?.currentItem,
      lastAction: {
        type: payload.progress.lastAction?.type ?? 'manual_update',
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown'
      }
    };
    
    roomState.progress = updatedProgress;
    
    socket.to(roomId).emit("progress_updated", updatedProgress);
  }
  
  private async handleBroadcastAction(
    socket: TypedSocket,
    payload: {
      actionType: string;
      entityId?: string;
      message: string;
      userId: string;
      userName: string;
      userAvatar?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const user = socket.data.user;
    if (!user) return;
    
    const notification = {
      id: nanoid(),
      type: 'success' as const,
      actionType: payload.actionType,
      message: payload.message,
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      userAvatar: user.profileImageUrl || undefined,
      entityId: payload.entityId,
      timestamp: new Date().toISOString(),
      metadata: payload.metadata
    };
    
    this.io.emit("global_notification", notification);
    
    console.log(`[SocketService] Global broadcast: ${notification.message}`);
  }
  
  private async handleDisconnect(socket: TypedSocket) {
    const user = socket.data.user;
    if (!user) return;
    
    this.disconnectTimers.set(socket.id, setTimeout(async () => {
      const rooms = Array.from(socket.data.currentRooms);
      for (const roomId of rooms) {
        const [roomType, entityId] = roomId.split(':') as ['order' | 'shipment', string];
        await this.removeViewerFromRoom(socket, roomId, roomType, entityId);
      }
      this.disconnectTimers.delete(socket.id);
      console.log(`[SocketService] Cleanup completed for ${user.firstName || user.username}`);
    }, this.config.disconnectTimeout));
  }
  
  private clearDisconnectTimer(socketId: string) {
    const timer = this.disconnectTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(socketId);
    }
  }
  
  private async getLockFromDb(
    roomType: 'order' | 'shipment',
    entityId: string
  ): Promise<LockInfo | undefined> {
    try {
      if (roomType === 'order') {
        const [order] = await db.select({
          lockedByUserId: orders.lockedByUserId,
          lockedAt: orders.lockedAt
        }).from(orders).where(eq(orders.id, entityId));
        
        if (order?.lockedByUserId && order?.lockedAt) {
          const lockAge = Date.now() - new Date(order.lockedAt).getTime();
          if (lockAge < this.config.disconnectTimeout * 2) {
            return {
              lockedByUserId: order.lockedByUserId,
              lockedByUserName: 'Another user',
              lockedAt: order.lockedAt.toISOString(),
              lockType: 'edit'
            };
          } else {
            await db.update(orders)
              .set({ lockedByUserId: null, lockedAt: null })
              .where(eq(orders.id, entityId));
          }
        }
      } else {
        const [shipment] = await db.select({
          lockedByUserId: shipments.lockedByUserId,
          lockedAt: shipments.lockedAt
        }).from(shipments).where(eq(shipments.id, entityId));
        
        if (shipment?.lockedByUserId && shipment?.lockedAt) {
          const lockAge = Date.now() - new Date(shipment.lockedAt).getTime();
          if (lockAge < this.config.disconnectTimeout * 2) {
            return {
              lockedByUserId: shipment.lockedByUserId,
              lockedByUserName: 'Another user',
              lockedAt: shipment.lockedAt.toISOString(),
              lockType: 'edit'
            };
          } else {
            await db.update(shipments)
              .set({ lockedByUserId: null, lockedAt: null })
              .where(eq(shipments.id, entityId));
          }
        }
      }
    } catch (error) {
      console.error(`[SocketService] Failed to get lock from DB:`, error);
    }
    return undefined;
  }
  
  private async updateLockInDb(
    roomType: 'order' | 'shipment',
    entityId: string,
    userId: string
  ) {
    try {
      if (roomType === 'order') {
        await db.update(orders)
          .set({ lockedByUserId: userId, lockedAt: new Date() })
          .where(eq(orders.id, entityId));
      } else {
        await db.update(shipments)
          .set({ lockedByUserId: userId, lockedAt: new Date() })
          .where(eq(shipments.id, entityId));
      }
    } catch (error) {
      console.error(`[SocketService] Failed to update lock in DB:`, error);
    }
  }
  
  private async updateViewersInDb(
    roomType: 'order' | 'shipment',
    entityId: string,
    viewers: RealTimeViewer[]
  ) {
    try {
      const viewerData = viewers.map(v => ({
        userId: v.userId,
        userName: v.userName,
        userAvatar: v.userAvatar,
        joinedAt: v.joinedAt
      }));
      
      if (roomType === 'order') {
        await db.update(orders)
          .set({ viewedBy: viewerData })
          .where(eq(orders.id, entityId));
      } else {
        await db.update(shipments)
          .set({ viewedBy: viewerData })
          .where(eq(shipments.id, entityId));
      }
    } catch (error) {
      console.error(`[SocketService] Failed to update viewers in DB:`, error);
    }
  }
  
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = this.config.heartbeatInterval * 3;
      
      const entries = Array.from(this.roomStates.entries());
      for (const [roomId, roomState] of entries) {
        if (roomState.lockInfo) {
          const lockAge = now - new Date(roomState.lockInfo.lockedAt).getTime();
          if (lockAge > this.config.disconnectTimeout * 6) {
            console.log(`[SocketService] Force unlocking stale lock on ${roomId}`);
            const [roomType, entityId] = roomId.split(':') as ['order' | 'shipment', string];
            this.releaseLockInternal(roomType, entityId, roomState);
            this.io.to(roomId).emit("force_unlock", { 
              roomId, 
              reason: "Lock expired due to inactivity" 
            });
          }
        }
      }
    }, this.config.heartbeatInterval);
  }
  
  public getIO(): TypedSocketServer {
    return this.io;
  }
  
  public getRoomState(roomType: 'order' | 'shipment', entityId: string): RoomState | undefined {
    return this.roomStates.get(this.getRoomId(roomType, entityId));
  }
  
  public broadcastToRoom(
    roomType: 'order' | 'shipment',
    entityId: string,
    event: keyof import("./types").ServerToClientEvents,
    data: any
  ) {
    const roomId = this.getRoomId(roomType, entityId);
    this.io.to(roomId).emit(event, data);
  }
  
  public broadcastGlobal(notification: {
    actionType: string;
    message: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }) {
    this.io.emit("global_notification", {
      id: nanoid(),
      type: 'success',
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
  
  public broadcastOrderUpdate(payload: OrderUpdatePayload) {
    this.io.emit("order_updated", payload);
    console.log(`[SocketService] Order update broadcast: ${payload.orderId} (${payload.updateType})`);
  }
  
  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    const timers = Array.from(this.disconnectTimers.values());
    for (const timer of timers) {
      clearTimeout(timer);
    }
    this.io.close();
    console.log("[SocketService] Shutdown complete");
  }
}

let socketServiceInstance: SocketService | null = null;

export function initializeSocketService(config: SocketServiceConfig): SocketService {
  if (socketServiceInstance) {
    console.warn("[SocketService] Already initialized, returning existing instance");
    return socketServiceInstance;
  }
  socketServiceInstance = new SocketService(config);
  return socketServiceInstance;
}

export function getSocketService(): SocketService | null {
  return socketServiceInstance;
}
