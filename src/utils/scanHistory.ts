import { ScanResult } from "../types/scan";

const MAX_HISTORY_ITEMS = 20;
const MAX_SCAN_TITLE_LENGTH = 42;

export function addScanToHistory(scanHistory: ScanResult[], scanResult: ScanResult) {
  const preparedScan = prepareScanForHistory(scanResult);
  const withoutDuplicate = scanHistory.filter((scan) => scan.id !== preparedScan.id);
  return [preparedScan, ...withoutDuplicate].slice(0, MAX_HISTORY_ITEMS);
}

export function renameScanInHistory(scanHistory: ScanResult[], scanId: string, title: string) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return scanHistory;
  }

  return scanHistory.map((scan) =>
    scan.id === scanId
      ? {
          ...scan,
          restaurantName: trimmedTitle
        }
      : scan
  );
}

export function normalizeStoredScanHistory(scanHistory: ScanResult[]) {
  const now = Date.now();
  const futureAllowanceMs = 24 * 60 * 60 * 1000;

  return scanHistory.map((scan) => {
    const createdAtTime = new Date(scan.createdAt).getTime();
    const hasInvalidDate = Number.isNaN(createdAtTime);
    const isSuspiciousFutureDate = createdAtTime > now + futureAllowanceMs;

    return {
      ...scan,
      createdAt: hasInvalidDate || isSuspiciousFutureDate ? new Date().toISOString() : scan.createdAt,
      restaurantName: scan.restaurantName?.trim() || generateScanTitle(scan)
    };
  });
}

function prepareScanForHistory(scanResult: ScanResult): ScanResult {
  return {
    ...scanResult,
    createdAt: new Date().toISOString(),
    restaurantName: scanResult.restaurantName?.trim() || generateScanTitle(scanResult)
  };
}

function generateScanTitle(scanResult: ScanResult) {
  const dishNames = scanResult.dishes
    .map((dish) => dish.dishName.trim())
    .filter(Boolean)
    .filter((name) => !/menu image unclear/i.test(name))
    .slice(0, 3);

  if (dishNames.length === 0) {
    return "Menu scan";
  }

  const title = dishNames.join(", ");
  return title.length > MAX_SCAN_TITLE_LENGTH
    ? `${title.slice(0, MAX_SCAN_TITLE_LENGTH - 1).trim()}...`
    : title;
}
