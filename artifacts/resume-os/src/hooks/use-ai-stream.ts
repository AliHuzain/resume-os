import { useState, useCallback } from "react";

interface StreamOptions {
  endpoint: string;
  onChunk?: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

export function useAiStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");

  const startStream = useCallback(async (options: StreamOptions, body: any) => {
    setIsStreaming(true);
    setStreamText("");
    let accumulatedText = "";

    try {
      const response = await fetch(options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, "");
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.done) {
              // Stream complete via SSE message
              setIsStreaming(false);
              options.onDone?.(accumulatedText);
              return;
            } else if (data.content) {
              accumulatedText += data.content;
              setStreamText(accumulatedText);
              options.onChunk?.(accumulatedText);
            }
          } catch (e) {
            console.warn("Failed to parse SSE chunk", jsonStr);
          }
        }
      }

      setIsStreaming(false);
      options.onDone?.(accumulatedText);

    } catch (error) {
      console.error("Stream error:", error);
      setIsStreaming(false);
      options.onError?.(error as Error);
    }
  }, []);

  return { isStreaming, streamText, startStream, setStreamText };
}
