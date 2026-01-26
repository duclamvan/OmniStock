import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";

interface RealTimeViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  socketId: string;
  joinedAt: string;
}

interface OrderProgress {
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

interface LockInfo {
  lockedByUserId: string;
  lockedByUserName: string;
  lockedByUserAvatar?: string;
  lockedAt: string;
  lockType: 'view' | 'edit';
}

interface RoomState {
  roomId: string;
  roomType: 'order' | 'shipment';
  viewers: RealTimeViewer[];
  lockInfo?: LockInfo;
  progress?: OrderProgress;
}

interface GlobalNotification {
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
}

let socketInstance: Socket | null = null;
let socketConnectionCount = 0;

export function useSocketConnection() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user) {
      return;
    }
    
    socketConnectionCount++;
    
    if (!socketInstance) {
      const wsUrl = window.location.origin;
      
      socketInstance = io(wsUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
    }
    
    const handleConnect = () => {
      console.log("[Socket] Connected:", socketInstance?.id);
      setIsConnected(true);
      setConnectionError(null);
    };
    
    const handleDisconnect = (reason: string) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    };
    
    const handleConnectError = (error: Error) => {
      console.error("[Socket] Connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    };
    
    const handleError = (data: { message: string; code?: string }) => {
      console.error("[Socket] Error:", data.message);
      setConnectionError(data.message);
    };
    
    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);
    socketInstance.on("error", handleError);
    
    if (socketInstance.connected) {
      setIsConnected(true);
    }
    
    return () => {
      socketConnectionCount--;
      
      if (socketInstance) {
        socketInstance.off("connect", handleConnect);
        socketInstance.off("disconnect", handleDisconnect);
        socketInstance.off("connect_error", handleConnectError);
        socketInstance.off("error", handleError);
      }
      
      if (socketConnectionCount === 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, [user]);
  
  const getSocket = useCallback(() => socketInstance, []);
  
  return { socket: socketInstance, isConnected, connectionError, getSocket };
}

export function useRealTimeOrder(orderId: string | undefined) {
  const { socket, isConnected } = useSocketConnection();
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [viewers, setViewers] = useState<RealTimeViewer[]>([]);
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [progress, setProgress] = useState<OrderProgress | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockDenied, setLockDenied] = useState<{ reason: string; currentLock?: LockInfo } | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!socket || !isConnected || !orderId) {
      setViewers([]);
      setLockInfo(null);
      setProgress(null);
      setIsLocked(false);
      return;
    }
    
    const handleRoomState = (state: RoomState) => {
      if (state.roomId !== `order:${orderId}`) return;
      setRoomState(state);
      setViewers(state.viewers);
      setLockInfo(state.lockInfo || null);
      setProgress(state.progress || null);
      setIsLocked(!!state.lockInfo && state.lockInfo.lockedByUserId !== user?.id);
    };
    
    const handleViewerJoined = (viewer: RealTimeViewer) => {
      setViewers(prev => {
        const exists = prev.find(v => v.userId === viewer.userId);
        if (exists) return prev.map(v => v.userId === viewer.userId ? viewer : v);
        return [...prev, viewer];
      });
    };
    
    const handleViewerLeft = (data: { socketId: string; userId: string }) => {
      setViewers(prev => prev.filter(v => v.socketId !== data.socketId));
    };
    
    const handleLockAcquired = (info: LockInfo) => {
      setLockInfo(info);
      setIsLocked(info.lockedByUserId !== user?.id);
      setLockDenied(null);
    };
    
    const handleLockReleased = () => {
      setLockInfo(null);
      setIsLocked(false);
    };
    
    const handleLockDenied = (data: { reason: string; currentLock?: LockInfo }) => {
      setLockDenied(data);
    };
    
    const handleProgressUpdated = (progressUpdate: OrderProgress) => {
      setProgress(progressUpdate);
    };
    
    const handleForceUnlock = (data: { roomId: string; reason: string }) => {
      console.log("[Socket] Force unlock:", data.reason);
      setLockInfo(null);
      setIsLocked(false);
    };
    
    socket.on("room_state", handleRoomState);
    socket.on("viewer_joined", handleViewerJoined);
    socket.on("viewer_left", handleViewerLeft);
    socket.on("lock_acquired", handleLockAcquired);
    socket.on("lock_released", handleLockReleased);
    socket.on("lock_denied", handleLockDenied);
    socket.on("progress_updated", handleProgressUpdated);
    socket.on("force_unlock", handleForceUnlock);
    
    socket.emit("join_room", { roomType: 'order', entityId: orderId });
    currentRoomRef.current = orderId;
    
    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("viewer_joined", handleViewerJoined);
      socket.off("viewer_left", handleViewerLeft);
      socket.off("lock_acquired", handleLockAcquired);
      socket.off("lock_released", handleLockReleased);
      socket.off("lock_denied", handleLockDenied);
      socket.off("progress_updated", handleProgressUpdated);
      socket.off("force_unlock", handleForceUnlock);
      
      if (currentRoomRef.current) {
        socket.emit("leave_room", { roomType: 'order', entityId: currentRoomRef.current });
        currentRoomRef.current = null;
      }
    };
  }, [socket, isConnected, orderId, user?.id]);
  
  const requestLock = useCallback((lockType: 'view' | 'edit' = 'edit') => {
    if (!socket || !orderId) return;
    socket.emit("request_lock", { roomType: 'order', entityId: orderId, lockType });
  }, [socket, orderId]);
  
  const releaseLock = useCallback(() => {
    if (!socket || !orderId) return;
    socket.emit("release_lock", { roomType: 'order', entityId: orderId });
  }, [socket, orderId]);
  
  const updateProgress = useCallback((progressData: Partial<OrderProgress>) => {
    if (!socket || !orderId) return;
    socket.emit("update_progress", { 
      roomType: 'order', 
      entityId: orderId, 
      progress: progressData 
    });
  }, [socket, orderId]);
  
  const isCurrentUserLockOwner = lockInfo?.lockedByUserId === user?.id;
  
  return {
    viewers,
    lockInfo,
    progress,
    isLocked,
    lockDenied,
    isCurrentUserLockOwner,
    requestLock,
    releaseLock,
    updateProgress,
    roomState
  };
}

export function useRealTimeShipment(shipmentId: string | undefined) {
  const { socket, isConnected } = useSocketConnection();
  const [viewers, setViewers] = useState<RealTimeViewer[]>([]);
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const currentRoomRef = useRef<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!socket || !isConnected || !shipmentId) {
      setViewers([]);
      setLockInfo(null);
      setIsLocked(false);
      return;
    }
    
    const handleRoomState = (state: RoomState) => {
      if (state.roomId !== `shipment:${shipmentId}`) return;
      setViewers(state.viewers);
      setLockInfo(state.lockInfo || null);
      setIsLocked(!!state.lockInfo && state.lockInfo.lockedByUserId !== user?.id);
    };
    
    const handleViewerJoined = (viewer: RealTimeViewer) => {
      setViewers(prev => {
        const exists = prev.find(v => v.userId === viewer.userId);
        if (exists) return prev.map(v => v.userId === viewer.userId ? viewer : v);
        return [...prev, viewer];
      });
    };
    
    const handleViewerLeft = (data: { socketId: string; userId: string }) => {
      setViewers(prev => prev.filter(v => v.socketId !== data.socketId));
    };
    
    const handleLockAcquired = (info: LockInfo) => {
      setLockInfo(info);
      setIsLocked(info.lockedByUserId !== user?.id);
    };
    
    const handleLockReleased = () => {
      setLockInfo(null);
      setIsLocked(false);
    };
    
    socket.on("room_state", handleRoomState);
    socket.on("viewer_joined", handleViewerJoined);
    socket.on("viewer_left", handleViewerLeft);
    socket.on("lock_acquired", handleLockAcquired);
    socket.on("lock_released", handleLockReleased);
    
    socket.emit("join_room", { roomType: 'shipment', entityId: shipmentId });
    currentRoomRef.current = shipmentId;
    
    return () => {
      socket.off("room_state", handleRoomState);
      socket.off("viewer_joined", handleViewerJoined);
      socket.off("viewer_left", handleViewerLeft);
      socket.off("lock_acquired", handleLockAcquired);
      socket.off("lock_released", handleLockReleased);
      
      if (currentRoomRef.current) {
        socket.emit("leave_room", { roomType: 'shipment', entityId: currentRoomRef.current });
        currentRoomRef.current = null;
      }
    };
  }, [socket, isConnected, shipmentId, user?.id]);
  
  const requestLock = useCallback((lockType: 'view' | 'edit' = 'edit') => {
    if (!socket || !shipmentId) return;
    socket.emit("request_lock", { roomType: 'shipment', entityId: shipmentId, lockType });
  }, [socket, shipmentId]);
  
  const releaseLock = useCallback(() => {
    if (!socket || !shipmentId) return;
    socket.emit("release_lock", { roomType: 'shipment', entityId: shipmentId });
  }, [socket, shipmentId]);
  
  return {
    viewers,
    lockInfo,
    isLocked,
    isCurrentUserLockOwner: lockInfo?.lockedByUserId === user?.id,
    requestLock,
    releaseLock
  };
}

interface OrderUpdatePayload {
  orderId: string;
  updateType: 'status' | 'items' | 'shipping' | 'general';
  timestamp: string;
  updatedBy?: string;
}

export function useOrderUpdates(onOrderUpdate?: (payload: OrderUpdatePayload) => void) {
  const { socket, isConnected } = useSocketConnection();
  const callbackRef = useRef(onOrderUpdate);
  
  useEffect(() => {
    callbackRef.current = onOrderUpdate;
  }, [onOrderUpdate]);
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleOrderUpdated = (payload: OrderUpdatePayload) => {
      console.log("[Socket] Order updated:", payload.orderId, payload.updateType);
      if (callbackRef.current) {
        callbackRef.current(payload);
      }
    };
    
    socket.on("order_updated", handleOrderUpdated);
    
    return () => {
      socket.off("order_updated", handleOrderUpdated);
    };
  }, [socket, isConnected]);
  
  return { socket, isConnected };
}

export function useGlobalNotifications() {
  const { socket, isConnected } = useSocketConnection();
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleGlobalNotification = (notification: GlobalNotification) => {
      if (notification.userId === user?.id) return;
      
      setNotifications(prev => {
        const updated = [notification, ...prev].slice(0, 50);
        return updated;
      });
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 10000);
    };
    
    socket.on("global_notification", handleGlobalNotification);
    
    return () => {
      socket.off("global_notification", handleGlobalNotification);
    };
  }, [socket, isConnected, user?.id]);
  
  const broadcastAction = useCallback((
    actionType: string,
    message: string,
    entityId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!socket || !user) return;
    socket.emit("broadcast_action", {
      actionType,
      message,
      entityId,
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      userAvatar: user.profileImageUrl,
      metadata
    });
  }, [socket, user]);
  
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  return {
    notifications,
    broadcastAction,
    dismissNotification
  };
}
