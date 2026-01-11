declare module 'qz-tray' {
  interface QZWebSocket {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  interface QZSecurity {
    setCertificatePromise(callback: (resolve: (cert: string) => void, reject?: (reason: unknown) => void) => void): void;
    setSignatureAlgorithm(algorithm: string): void;
    setSignaturePromise(callback: (toSign: string) => (resolve: (signature: string) => void, reject?: (reason: unknown) => void) => void): void;
  }

  interface QZPrinters {
    find(): Promise<string | string[]>;
    getDefault(): Promise<string>;
  }

  interface PrintConfig {
    scaleContent?: boolean;
    copies?: number;
    orientation?: 'portrait' | 'landscape';
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    size?: { width: number; height: number; units: 'in' | 'mm' | 'cm' };
    colorType?: 'color' | 'grayscale' | 'blackwhite';
    duplex?: boolean;
    interpolation?: 'nearest-neighbor' | 'bilinear' | 'bicubic';
    jobName?: string;
    printerTray?: string;
    rasterize?: boolean;
    rotation?: number;
    units?: 'in' | 'mm' | 'cm';
  }

  interface QZConfigs {
    create(printer: string, options?: PrintConfig): any;
  }

  interface PrintData {
    type: 'pixel' | 'raw';
    format: 'pdf' | 'image' | 'html' | 'plain' | 'file';
    flavor: 'base64' | 'file' | 'hex';
    data: string;
    options?: Record<string, any>;
  }

  interface QZ {
    websocket: QZWebSocket;
    security: QZSecurity;
    printers: QZPrinters;
    configs: QZConfigs;
    print(config: any, data: PrintData[]): Promise<void>;
    api: {
      getVersion(): string;
      isSecure(): boolean;
    };
  }

  const qz: QZ;
  export default qz;
}
