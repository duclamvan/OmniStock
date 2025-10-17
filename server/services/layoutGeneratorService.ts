/**
 * Layout Generator Service
 * Generates warehouse bin layouts automatically based on warehouse dimensions
 */

interface LayoutConfig {
  name: string;
  width: number;
  length: number;
  rows: number;
  columns: number;
  binWidth: number;
  binHeight: number;
  aisleWidth: number;
  binCapacity: number;
}

interface GeneratedBin {
  code: string;
  row: string;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  type: string;
  status: string;
}

/**
 * Generate a warehouse bin layout based on configuration
 */
export function generateBinLayout(config: LayoutConfig): GeneratedBin[] {
  const bins: GeneratedBin[] = [];
  const { rows, columns, binWidth, binHeight, aisleWidth, binCapacity } = config;

  // Generate row labels (A, B, C, ...)
  const rowLabels: string[] = [];
  for (let i = 0; i < rows; i++) {
    rowLabels.push(String.fromCharCode(65 + i)); // A = 65 in ASCII
  }

  // Calculate bin positions with aisle spacing
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowLabel = rowLabels[rowIndex];
    
    for (let col = 1; col <= columns; col++) {
      const binCode = `${rowLabel}${col}`;
      
      // Calculate x position (columns with aisle spacing)
      const x = (col - 1) * (binWidth + aisleWidth);
      
      // Calculate y position (rows with aisle spacing)
      const y = rowIndex * (binHeight + aisleWidth);

      bins.push({
        code: binCode,
        row: rowLabel,
        column: col,
        x,
        y,
        width: binWidth,
        height: binHeight,
        capacity: binCapacity,
        type: 'standard',
        status: 'active',
      });
    }
  }

  return bins;
}

/**
 * Validate layout configuration
 */
export function validateLayoutConfig(config: LayoutConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.rows < 1 || config.rows > 26) {
    errors.push('Rows must be between 1 and 26 (A-Z)');
  }

  if (config.columns < 1) {
    errors.push('Columns must be at least 1');
  }

  if (config.binWidth <= 0 || config.binHeight <= 0) {
    errors.push('Bin dimensions must be positive');
  }

  if (config.width < (config.columns * config.binWidth + (config.columns - 1) * config.aisleWidth)) {
    errors.push('Warehouse width is too small for the specified layout');
  }

  if (config.length < (config.rows * config.binHeight + (config.rows - 1) * config.aisleWidth)) {
    errors.push('Warehouse length is too small for the specified layout');
  }

  if (config.binCapacity < 1) {
    errors.push('Bin capacity must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate layout statistics
 */
export function calculateLayoutStats(config: LayoutConfig) {
  const totalBins = config.rows * config.columns;
  const totalCapacity = totalBins * config.binCapacity;
  const gridWidth = config.columns * config.binWidth + (config.columns - 1) * config.aisleWidth;
  const gridLength = config.rows * config.binHeight + (config.rows - 1) * config.aisleWidth;

  return {
    totalBins,
    totalCapacity,
    gridWidth,
    gridLength,
    warehouseUtilization: ((gridWidth * gridLength) / (config.width * config.length)) * 100,
  };
}
