import { ScanResult } from "../types/scan";

const MAX_HISTORY_ITEMS = 20;

export function addScanToHistory(scanHistory: ScanResult[], scanResult: ScanResult) {
  const withoutDuplicate = scanHistory.filter((scan) => scan.id !== scanResult.id);
  return [scanResult, ...withoutDuplicate].slice(0, MAX_HISTORY_ITEMS);
}
