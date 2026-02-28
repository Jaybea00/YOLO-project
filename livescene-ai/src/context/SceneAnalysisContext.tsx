import React, { createContext, useContext, ReactNode } from "react";
import { useSceneAnalysis } from "../hooks/useSceneAnalysis";

// Infer the return type of the hook so we never need to maintain a separate interface
type SceneAnalysisState = ReturnType<typeof useSceneAnalysis>;

const SceneAnalysisContext = createContext<SceneAnalysisState | null>(null);

export const SceneAnalysisProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useSceneAnalysis();
  return (
    <SceneAnalysisContext.Provider value={value}>
      {children}
    </SceneAnalysisContext.Provider>
  );
};

// Drop-in replacement for `useSceneAnalysis()` — reads from the shared instance
export const useSceneAnalysisContext = (): SceneAnalysisState => {
  const ctx = useContext(SceneAnalysisContext);
  if (!ctx)
    throw new Error(
      "useSceneAnalysisContext must be used inside <SceneAnalysisProvider>",
    );
  return ctx;
};
