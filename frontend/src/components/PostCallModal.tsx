"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, Check, X, FileJson, FileText, Database, Clock } from "lucide-react";
import { TranscriptTurn } from "./TranscriptFeed";

export interface PostCallSummaryData {
  customer_intent: string;
  order_id: string | null;
  resolution_status: string;
  call_summary: string;
}

interface PostCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: PostCallSummaryData;
  transcript: TranscriptTurn[];
  roomName: string;
  durationSeconds: number;
  supabaseSynced: boolean;
}

export const PostCallModal: React.FC<PostCallModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  transcript,
  roomName,
  durationSeconds,
  supabaseSynced,
}) => {
  const [activeTab, setActiveTab] = useState<"json" | "transcript" | "meta">("json");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(summaryData, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}m ${remainingSec}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-forest-800 to-forest-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-500/20 border border-sage-400/40 flex items-center justify-center text-sage-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-bold tracking-wide">
                  Post-Call Summary &amp; Analytics
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 font-medium">
                  {summaryData.resolution_status}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Session concluded &bull; Duration: {formatDuration(durationSeconds)} &bull; Room: {roomName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-stone-200 bg-stone-50">
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "json"
                ? "border-forest-700 text-forest-900 bg-white rounded-t-lg"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <FileJson className="w-4 h-4 text-terracotta-600" />
            <span>Structured Outcome (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab("transcript")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "transcript"
                ? "border-forest-700 text-forest-900 bg-white rounded-t-lg"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <FileText className="w-4 h-4 text-sage-600" />
            <span>Full Transcript ({transcript.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("meta")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === "meta"
                ? "border-forest-700 text-forest-900 bg-white rounded-t-lg"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Database className="w-4 h-4 text-forest-600" />
            <span>Database Sync</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === "json" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500">
                  Formatted per DataStraw Assessment Section 2.D:
                </span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-200 transition shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-forest-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-forest-800/80 leading-relaxed shadow-inner">
                {jsonString}
              </pre>

              <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                <div className="font-semibold text-stone-800 mb-1">Summary Overview:</div>
                <p className="leading-relaxed">{summaryData.call_summary}</p>
              </div>
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="space-y-3">
              {transcript.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No turns recorded.</p>
              ) : (
                transcript.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl text-xs border ${
                      t.role === "agent"
                        ? "bg-sage-50/60 border-sage-200 text-forest-900"
                        : "bg-stone-50 border-stone-200 text-stone-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1 opacity-75">
                      <span>{t.role === "agent" ? "Aria (Customer Support)" : "Customer"}</span>
                      <span className="font-mono text-[10px]">{t.timestamp}</span>
                    </div>
                    <div className="leading-relaxed">{t.text}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "meta" && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">LiveKit Room Name:</span>
                  <span className="font-mono font-bold text-forest-900">{roomName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Duration:</span>
                  <span className="font-medium">{formatDuration(durationSeconds)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Customer Intent:</span>
                  <span className="font-semibold text-terracotta-600">{summaryData.customer_intent}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200/60">
                  <span className="text-stone-500">Referenced Order ID:</span>
                  <span className="font-mono font-bold">{summaryData.order_id || "None"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Supabase Table:</span>
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    public.call_sessions {supabaseSynced ? "(Synced ✓)" : "(Pending Sync)"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Aura Skincare AI CX &bull; Assessment Complete
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold transition shadow-sm"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
