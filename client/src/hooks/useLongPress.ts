import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: (event: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (event: React.TouchEvent | React.MouseEvent) => void;
  delay?: number;
  shouldPreventDefault?: boolean;
}

interface UseLongPressResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  shouldPreventDefault = true
}: UseLongPressOptions): UseLongPressResult {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);
  const longPressTriggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('contextmenu', preventDefault, { passive: false });
        targetRef.current = event.target;
      }

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      startPosRef.current = { x: clientX, y: clientY };
      longPressTriggeredRef.current = false;

      timeoutRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (shouldTriggerClick && !longPressTriggeredRef.current && onClick) {
        onClick(event);
      }

      if (shouldPreventDefault && targetRef.current) {
        targetRef.current.removeEventListener('contextmenu', preventDefault);
        targetRef.current = null;
      }

      startPosRef.current = null;
    },
    [shouldPreventDefault, onClick]
  );

  const move = useCallback(
    (event: React.TouchEvent) => {
      if (!startPosRef.current) return;

      const clientX = event.touches[0].clientX;
      const clientY = event.touches[0].clientY;
      const moveThreshold = 10;

      const deltaX = Math.abs(clientX - startPosRef.current.x);
      const deltaY = Math.abs(clientY - startPosRef.current.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clear(event, false);
      }
    },
    [clear]
  );

  return {
    onTouchStart: (e: React.TouchEvent) => start(e),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onTouchMove: (e: React.TouchEvent) => move(e),
    onMouseDown: (e: React.MouseEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
  };
}

function preventDefault(e: Event) {
  if (!e.cancelable) return;
  e.preventDefault();
}
