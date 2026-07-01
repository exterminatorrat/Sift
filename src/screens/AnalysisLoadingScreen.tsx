import React, { useEffect, useRef } from "react";
import { LoadingAnalysis } from "../components/LoadingAnalysis";

type AnalysisLoadingScreenProps = {
  onAnalyze: () => void;
};

export function AnalysisLoadingScreen({ onAnalyze }: AnalysisLoadingScreenProps) {
  const didStart = useRef(false);

  useEffect(() => {
    if (didStart.current) {
      return;
    }

    didStart.current = true;
    onAnalyze();
  }, [onAnalyze]);

  return <LoadingAnalysis showTopBar />;
}
