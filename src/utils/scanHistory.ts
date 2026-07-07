import { ScanResult } from "../types/scan";

const DEFAULT_MAX_HISTORY_ITEMS = 20;

export function addScanToHistory(
  scanHistory: ScanResult[],
  scanResult: ScanResult,
  maxHistoryItems = DEFAULT_MAX_HISTORY_ITEMS
) {
  const preparedScan = prepareScanForHistory(scanResult);
  const withoutDuplicate = scanHistory.filter((scan) => scan.id !== preparedScan.id);
  return [preparedScan, ...withoutDuplicate].slice(0, maxHistoryItems);
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
  const menuText = scanResult.dishes
    .map((dish) => dish.dishName.trim())
    .filter(Boolean)
    .filter((name) => !/menu image unclear/i.test(name))
    .join(" ")
    .toLowerCase();

  if (!menuText) {
    return "Menu scan";
  }

  if (/\b(ramen|sushi|tonkotsu|karaage|tempura|mochi|sunomono)\b/.test(menuText)) {
    return "Japanese menu";
  }

  if (/\b(taco|tacos|mole|queso|salsa|churro|churros|baja|corn|crema)\b/.test(menuText)) {
    return "Mexican menu";
  }

  if (/\b(crab|shrimp|lobster|oyster|clam|scallop|salmon|tuna|fish)\b/.test(menuText)) {
    if (/\b(steak|tenderloin|beef|sirloin|ribeye)\b/.test(menuText)) {
      return "Steak and seafood";
    }

    return "Seafood menu";
  }

  if (/\b(pasta|linguini|linguine|spaghetti|ravioli|risotto)\b/.test(menuText)) {
    return "Italian menu";
  }

  if (/\b(burger|sandwich|fries|wings|steak|tenderloin|beef)\b/.test(menuText)) {
    return "American menu";
  }

  return "Menu scan";
}
