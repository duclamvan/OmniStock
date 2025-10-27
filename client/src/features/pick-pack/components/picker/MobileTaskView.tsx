import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Timer, 
  ScanLine,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Clock,
  Keyboard,
  Route
} from 'lucide-react';
import { usePickPackQueue } from '../../hooks/usePickPackQueue';
import { useOrderLocking } from '../../hooks/useOrderLocking';
import { LocationGuidance } from './LocationGuidance';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function MobileTaskView() {
  const { queue, isLoading, releaseOrder } = usePickPackQueue();
  const { toast } = useToast();
  const [employeeName] = useState(
    () => localStorage.getItem('pick_pack_employee_name') || ''
  );
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Find my active picking task
  const myTask = queue?.picking?.find(
    (order) => order.lockInfo.lockedBy === employeeName
  );

  useOrderLocking(myTask?.orderId || null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && myTask) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, myTask]);

  // Start timer when task is claimed
  useEffect(() => {
    if (myTask) {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      setTimer(0);
      setPickedItems(new Set());
      setCurrentItemIndex(0);
    }
  }, [myTask?.id]);

  // Auto-focus barcode input
  useEffect(() => {
    if (myTask && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [myTask, currentItemIndex]);

  // Lock expiration countdown
  useEffect(() => {
    if (!myTask?.lockExpiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(myTask.lockExpiresAt);
      const remaining = Math.floor((expiry.getTime() - now.getTime()) / 1000);
      setTimeRemaining(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [myTask?.lockExpiresAt]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!myTask) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't trigger shortcuts if typing in input/textarea
      if (target.matches('input, textarea')) return;

      // Space = Mark current item as picked
      if (e.code === 'Space') {
        e.preventDefault();
        if (!pickedItems.has(`item-${currentItemIndex}`)) {
          handleMarkPicked(currentItemIndex);
        }
      }

      // Enter = Complete picking (if all items picked)
      if (e.code === 'Enter' && pickedCount === totalItems) {
        e.preventDefault();
        handleCompletePicking();
      }

      // Arrow Up = Previous item
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setCurrentItemIndex((prev) => Math.max(0, prev - 1));
      }

      // Arrow Down = Next item
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setCurrentItemIndex((prev) => Math.min(totalItems - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [myTask, currentItemIndex, pickedItems, pickedCount, totalItems]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!myTask) return;

    // Check if barcode matches current item
    const currentItem = myTask.order;
    // In real implementation, check barcode against item SKU/barcode
    
    // For now, mark as picked
    handleMarkPicked(currentItemIndex);
    setBarcodeInput('');

    // Play success sound
    playSuccessSound();
  };

  const handleMarkPicked = async (itemIndex: number) => {
    if (!myTask) return;

    const newPicked = new Set(pickedItems);
    newPicked.add(`item-${itemIndex}`);
    setPickedItems(newPicked);

    // Move to next item
    if (itemIndex < totalItems - 1) {
      setCurrentItemIndex(itemIndex + 1);
    }

    toast({
      title: 'Item Picked',
      description: 'Item marked as picked',
    });
  };

  const handleNotFound = async (itemIndex: number) => {
    if (!myTask) return;

    toast({
      title: 'Item Not Found',
      description: 'This will be reported to inventory team',
      variant: 'destructive',
    });

    // Log event
    // In production, call API to log missing item

    // Move to next item
    if (itemIndex < totalItems - 1) {
      setCurrentItemIndex(itemIndex + 1);
    }
  };

  const handleCompletePicking = async () => {
    if (!myTask) return;

    try {
      // Complete the picking task
      await apiRequest('POST', `/api/pick-pack/complete-pick/${myTask.orderId}`, {
        pickerNotes: '',
      });

      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });
      
      toast({
        title: 'Picking Complete',
        description: 'Order moved to ready for packing',
      });

      setPickedItems(new Set());
      setCurrentItemIndex(0);
      setTimer(0);
    } catch (error: any) {
      toast({
        title: 'Failed to Complete',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleRelease = () => {
    if (!myTask) return;

    releaseOrder(myTask.orderId, {
      onSuccess: () => {
        toast({
          title: 'Order Released',
          description: 'Order is now available for others',
        });
      },
    });
  };

  const playSuccessSound = () => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (!employeeName) {
    return (
      <Alert data-testid="alert-no-employee-name">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please enter your employee name in the Queue Board to start picking.
        </AlertDescription>
      </Alert>
    );
  }

  if (!myTask) {
    return (
      <Card data-testid="card-no-active-task">
        <CardContent className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Active Picking Task</h3>
          <p className="text-muted-foreground mb-4">
            Go to the Queue Board to claim an order to pick.
          </p>
        </CardContent>
      </Card>
    );
  }

  // For demo purposes, create mock items
  const totalItems = 5; // In production, get from myTask.order items
  const pickedCount = pickedItems.size;
  const progress = (pickedCount / totalItems) * 100;

  // Pick path optimization - mock items with locations
  const mockItems = useMemo(() => [
    { id: 1, name: 'Sample Product 1', sku: 'SKU-001', qty: 1, location: 'WH1-A06-R04-L04-B2' },
    { id: 2, name: 'Sample Product 2', sku: 'SKU-002', qty: 1, location: 'WH1-A08-R02-L03-B1' },
    { id: 3, name: 'Sample Product 3', sku: 'SKU-003', qty: 1, location: 'WH1-A10-R01-L05-B3' },
    { id: 4, name: 'Sample Product 4', sku: 'SKU-004', qty: 1, location: 'WH1-A12-R03-L02-B2' },
    { id: 5, name: 'Sample Product 5', sku: 'SKU-005', qty: 1, location: 'WH1-A15-R05-L04-B1' },
  ], []);

  // Sort items by warehouse location for optimal path
  const optimizedItems = useMemo(() => {
    return [...mockItems].sort((a, b) => {
      const locA = a.location || '';
      const locB = b.location || '';
      return locA.localeCompare(locB);
    });
  }, [mockItems]);

  const currentItem = optimizedItems[currentItemIndex];

  return (
    <div className="space-y-4 pb-20" data-testid="mobile-task-view">
      {/* Header with Timer */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white" data-testid="text-order-number">
                {myTask.order.orderNumber}
              </CardTitle>
              <p className="text-sm text-blue-100" data-testid="text-customer-name">
                {myTask.order.customerName}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Timer className="h-5 w-5" />
              <span className="text-xl font-mono font-bold" data-testid="text-timer">
                {formatTimer(timer)}
              </span>
            </div>
          </div>
          {/* Lock Expiration Countdown */}
          {myTask.lockExpiresAt && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span data-testid="text-lock-countdown">
                  Lock expires in {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
                {timeRemaining < 180 && (
                  <Badge variant="destructive" data-testid="badge-expiring-soon">Expiring Soon</Badge>
                )}
              </div>
              {/* Keyboard Shortcuts Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-white hover:bg-white/20" data-testid="button-shortcuts">
                    <Keyboard className="h-3 w-3 mr-1" />
                    Shortcuts
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-shortcuts">
                  <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                    <DialogDescription>
                      Use these shortcuts to speed up your picking workflow
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 text-sm font-semibold bg-gray-100 border border-gray-300 rounded">Space</kbd>
                      <span className="text-sm text-muted-foreground">Mark item as picked</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 text-sm font-semibold bg-gray-100 border border-gray-300 rounded">Enter</kbd>
                      <span className="text-sm text-muted-foreground">Complete picking (when all items picked)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <kbd className="px-3 py-1.5 text-sm font-semibold bg-gray-100 border border-gray-300 rounded">↑ / ↓</kbd>
                      <span className="text-sm text-muted-foreground">Navigate between items</span>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Pick Path Optimization Alert */}
      {optimizedItems.length > 1 && (
        <Alert className="border-blue-200 bg-blue-50" data-testid="alert-optimized-route">
          <Route className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Optimized Route</AlertTitle>
          <AlertDescription className="text-blue-800">
            Items sorted for fastest picking path through warehouse
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span data-testid="text-progress">
                {pickedCount} / {totalItems} items
              </span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-picking" />
          </div>
        </CardContent>
      </Card>

      {/* Barcode Scanner Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-gray-500" />
            <Input
              ref={barcodeInputRef}
              placeholder="Scan barcode or enter SKU"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput) {
                  handleBarcodeScan(barcodeInput);
                }
              }}
              className="text-lg"
              data-testid="input-barcode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Item */}
      <Card className="border-2 border-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Item {currentItemIndex + 1} of {totalItems}
            </CardTitle>
            <Badge variant="outline">Current</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Item Details */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg" data-testid="text-item-name">
              {currentItem.name}
            </h3>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">SKU:</span> {currentItem.sku}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">Quantity:</span> {currentItem.qty}
            </div>
          </div>

          {/* Location Guidance */}
          <LocationGuidance locationCode={currentItem.location} />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              size="lg"
              className="h-16 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleMarkPicked(currentItemIndex)}
              disabled={pickedItems.has(`item-${currentItemIndex}`)}
              data-testid="button-mark-picked"
            >
              <CheckCircle className="h-6 w-6 mr-2" />
              Mark Picked
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-16"
              onClick={() => handleNotFound(currentItemIndex)}
              data-testid="button-not-found"
            >
              <XCircle className="h-6 w-6 mr-2" />
              Not Found
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
              disabled={currentItemIndex === 0}
              className="flex-1"
              data-testid="button-previous-item"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.min(totalItems - 1, currentItemIndex + 1))}
              disabled={currentItemIndex === totalItems - 1}
              className="flex-1"
              data-testid="button-next-item"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Complete Picking Button (Fixed at bottom on mobile) */}
      {pickedCount === totalItems && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:relative md:shadow-none md:border-0">
          <Button
            size="lg"
            className="w-full h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg"
            onClick={handleCompletePicking}
            data-testid="button-complete-picking"
          >
            <CheckCircle className="h-6 w-6 mr-2" />
            Complete Picking
          </Button>
        </div>
      )}

      {/* Release Order Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleRelease}
        data-testid="button-release-order"
      >
        Release Order
      </Button>
    </div>
  );
}
