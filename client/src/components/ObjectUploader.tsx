import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file?: any) => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file: any) => {
          const params = await onGetUploadParameters(file);
          return {
            method: params.method,
            url: params.url,
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          };
        },
      })
      .on("complete", (result) => {
        onComplete?.(result);
      })
  );

  return (
    <div>
      <style>{`
        .uppy-Dashboard-inner {
          border-radius: 16px !important;
          border: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
        }
        .uppy-Dashboard-AddFiles {
          border: 2px dashed hsl(var(--border)) !important;
          border-radius: 12px !important;
          background: hsl(var(--muted) / 0.3) !important;
        }
        .uppy-Dashboard-AddFiles:hover {
          border-color: hsl(var(--primary)) !important;
          background: hsl(var(--muted) / 0.5) !important;
        }
        .uppy-Dashboard-AddFiles-title {
          font-size: 14px !important;
          color: hsl(var(--foreground)) !important;
        }
        .uppy-Dashboard-note {
          font-size: 12px !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        .uppy-Dashboard-browse {
          color: hsl(var(--primary)) !important;
        }
        .uppy-DashboardContent-bar {
          background: hsl(var(--muted)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .uppy-DashboardContent-title {
          color: hsl(var(--foreground)) !important;
        }
        .uppy-Dashboard-Item {
          border-radius: 8px !important;
        }
        .uppy-StatusBar {
          background: hsl(var(--muted)) !important;
        }
        .uppy-StatusBar-actionBtn--upload {
          background: hsl(var(--primary)) !important;
          border-radius: 8px !important;
        }
        @media (max-width: 640px) {
          .uppy-Dashboard-inner {
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
          .uppy-Dashboard-overlay {
            background: rgba(0, 0, 0, 0.6) !important;
          }
        }
      `}</style>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
