"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Typewriter effect hook — replaces StringSplit typing behavior.
 * Reveals text character by character with a blinking cursor.
 */
export function useTypewriter(
  text: string,
  {
    speed = 40,
    delay = 0,
    enabled = true,
  }: { speed?: number; delay?: number; enabled?: boolean } = {}
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const indexRef = useRef(0);

  const reset = useCallback(() => {
    indexRef.current = 0;
    setDisplayedText("");
    setIsTyping(false);
    setIsDone(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reset();

    const delayTimer = setTimeout(() => {
      setIsTyping(true);
      const interval = setInterval(() => {
        if (indexRef.current < text.length) {
          indexRef.current += 1;
          setDisplayedText(text.slice(0, indexRef.current));
        } else {
          clearInterval(interval);
          setIsTyping(false);
          setIsDone(true);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [text, speed, delay, enabled, reset]);

  return { displayedText, isTyping, isDone, reset };
}
