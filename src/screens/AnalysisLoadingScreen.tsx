import React, { useEffect, useRef } from "react";
import { LoadingAnalysis } from "../components/LoadingAnalysis";

type AnalysisLoadingScreenProps = {
  imageUri?: string | null;
  onAnalyze: () => void;
};

export function AnalysisLoadingScreen({ imageUri, onAnalyze }: AnalysisLoadingScreenProps) {
  const didStart = useRef(false);
  const stableImageUri = useRef(imageUri ?? null).current;

  useEffect(() => {
    if (didStart.current) {
      return;
    }

    didStart.current = true;
    onAnalyze();
  }, [onAnalyze]);

  return <LoadingAnalysis imageUri={stableImageUri} showTopBar />;
}
