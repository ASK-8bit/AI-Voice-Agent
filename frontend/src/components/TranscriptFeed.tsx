"use client";

import React, { useEffect, useRef } from "react";
import { MessageSquare, User, Bot, Clock, Copy, Check } from "lucide-react";

export interface TranscriptTurn {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

interface TranscriptFeedProps {
  transcript: TranscriptTurn[];
  liveUserInterim?: string;
  isConnecting?: boolean;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  transcript,
  liveUserInterim = "",
  isConnecting = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, liveUserInterim]);

  const handleCopyTranscript = () => {
    const text = transcript
      .map((t) => `[${t.timestamp}] ${t.role === "agent" ? "Aria" : "User"}: ${t.text}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage-100 text-forest-700 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-forest-700" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-forest-800 leading-tight">
              Live Call Transcript
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Chronological conversation log
            </p>
          </div>
        </div>

        {transcript.length > 0 && (
          <button
            onClick={handleCopyTranscript}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-forest-700 px-2 py-1 rounded border border-stone-200 hover:bg-white transition shadow-sm"
            title="Copy full transcript"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy Log</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[520px]"
      >
        {transcript.length === 0 && !liveUserInterim && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <Bot className="w-10 h-10 mb-2 stroke-1 text-stone-300" />
            <p className="text-xs font-medium text-stone-500">No active conversation yet</p>
            <p className="text-[11px] text-stone-400 mt-1 max-w-[220px]">
              Click &apos;Start Voice Call&apos; to speak with Aria. Live speech and agent replies will appear here in real-time.
            </p>
          </div>
        )}

        {transcript.map((turn) => {
          const isAgent = turn.role === "agent";
          return (
            <div
              key={turn.id}
              className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-stone-400">
                {isAgent ? (
                  <>
                    <div className="w-4 h-4 rounded-full bg-forest-700 text-white flex items-center justify-center text-[9px] font-bold">
                      A
                    </div>
                    <span className="font-semibold text-forest-800">Aria</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-stone-700">You</span>
                    <div className="w-4 h-4 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center text-[9px]">
                      <User className="w-2.5 h-2.5" />
                    </div>
                  </>
                )}
                <span className="text-[10px] text-stone-400 flex items-center gap-0.5 ml-1">
                  <Clock className="w-2.5 h-2.5" />
                  {turn.timestamp}
                </span>
              </div>

              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm transition-all ${
                  isAgent
                    ? "bg-white text-forest-950 border border-stone-200/80 rounded-tl-sm"
                    : "bg-forest-700 text-white rounded-tr-sm font-medium"
                }`}
              >
                {turn.text}
              </div>
            </div>
          );
        })}

        {/* Live Subtitle Interim typing preview */}
        {liveUserInterim && (
          <div className="flex flex-col items-end opacity-90 animate-pulse">
            <div className="flex items-center gap-1 mb-1 text-[10px] text-stone-400 font-medium">
              <span>Transcribing live speech...</span>
            </div>
            <div className="max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed bg-forest-600/90 text-white rounded-tr-sm border border-forest-500/50 italic">
              {liveUserInterim} &hellip;
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-stone-200/50 flex items-center justify-between text-[11px] text-stone-400">
        <span>{transcript.length} turns recorded</span>
        <span className="font-mono text-[10px]">Aura CX Pipeline</span>
      </div>
    </div>
  );
};
