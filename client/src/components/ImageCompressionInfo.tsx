import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileImage, HardDrive, Zap, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompressionInfo {
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  format: string;
}

interface ImageCompressionInfoProps {
  compressionInfo?: CompressionInfo;
  showAlert?: boolean;
}

export function ImageCompressionInfo({ compressionInfo, showAlert = true }: ImageCompressionInfoProps) {
  if (!compressionInfo) return null;

  const { originalSize, compressedSize, compressionRatio } = compressionInfo;
  const originalKB = (originalSize / 1024).toFixed(2);
  const compressedKB = (compressedSize / 1024).toFixed(2);
  const savingsPercent = parseFloat(compressionRatio);

  return (
    <div className="space-y-4">
      {showAlert && savingsPercent > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Zap className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Image compressed successfully! Saved {compressionRatio} of storage space.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            Compression Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Original Size</p>
              <p className="text-sm font-medium">{originalKB} KB</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Compressed Size</p>
              <p className="text-sm font-medium text-green-600">{compressedKB} KB</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Space Saved</span>
              <span className="font-medium">{compressionRatio}</span>
            </div>
            <Progress value={savingsPercent} className="h-2" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Format: {compressionInfo.format.toUpperCase()} (Lossless)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BatchCompressionResults({ results }: { results: any[] }) {
  if (!results || results.length === 0) return null;

  const successCount = results.filter(r => r.success).length;
  const totalOriginal = results.reduce((sum, r) => sum + (r.originalSize || 0), 0);
  const totalCompressed = results.reduce((sum, r) => sum + (r.compressedSize || 0), 0);
  const totalSaved = totalOriginal - totalCompressed;
  const avgRatio = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(2) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-green-600" />
          Batch Compression Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Images Compressed</p>
            <p className="text-2xl font-bold text-green-600">
              {successCount}/{results.length}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Space Saved</p>
            <p className="text-2xl font-bold text-green-600">
              {(totalSaved / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Average Compression</span>
            <span className="font-medium">{avgRatio}%</span>
          </div>
          <Progress value={parseFloat(avgRatio)} className="h-2" />
        </div>

        {results.some(r => !r.success) && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              {results.filter(r => !r.success).length} image(s) failed to compress.
              Check console for details.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-t pt-4">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium mb-2">Detailed Results</summary>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg text-xs ${
                    result.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate max-w-[200px]">
                      {result.original}
                    </span>
                    {result.success ? (
                      <span className="text-green-600">
                        {result.compressionRatio?.toFixed(2)}% saved
                      </span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )}
                  </div>
                  {result.error && (
                    <p className="text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}