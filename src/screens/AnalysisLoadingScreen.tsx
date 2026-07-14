import React, { useEffect, useRef } from "react";
import { LoadingAnalysis } from "../components/LoadingAnalysis";

type AnalysisLoadingScreenProps = {
  imageUris?: string[];
  onAnalyze: () => void;
};

export function AnalysisLoadingScreen({ imageUris = [], onAnalyze }: AnalysisLoadingScreenProps) {
  const didStart = useRef(false);
  const stableImageUris = useRef(imageUris).current;

  useEffect(() => {
    if (didStart.current) {
      return;
    }

    didStart.current = true;
    onAnalyze();
  }, [onAnalyze]);

  return (
    <LoadingAnalysis
      imageCount={stableImageUris.length}
      imageUri={stableImageUris[0] ?? null}
      showTopBar
    />
  );
}
