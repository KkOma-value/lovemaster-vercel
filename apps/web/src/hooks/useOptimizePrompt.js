import { useCallback, useState } from 'react';
import { optimizePrompt as callOptimize } from '../services/chatApi';

export function useOptimizePrompt() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimize = useCallback(async ({ userMessage, imageUrl, mode }) => {
    setIsOptimizing(true);
    try {
      const { optimizedText } = await callOptimize({ userMessage, imageUrl, mode });
      return optimizedText;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return { optimize, isOptimizing };
}
