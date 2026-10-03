"use client";

import React, { useState, useEffect } from "react";
import { History, X, Clock, Calendar, RefreshCw, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { CallSession } from "@/lib/supabase";

interface CallHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CallSession | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/call-sessions");
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error("Failed to load call sessions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 bg-forest-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-sage-300">
              <History className="w-5 h-5 text-sage-300" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold tracking-wide">
                Supabase Call History
              </h3>
              <p className="text-xs text-stone-300">
                Logged sessions from <span className="font-mono text-emerald-400">public.call_sessions</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={isLoading}
              title="Refresh sessions"
              className="p-2 rounded-lg bg-forest-800 hover:bg-forest-700 text-stone-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-forest-800 hover:bg-forest-700 text-stone-300 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50">
          {isLoading && (
            <div className="text-center py-12 text-stone-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-700" />
              <p className="text-xs">Loading sessions from Supabase...</p>
            </div>
          )}

          {!isLoading && sessions.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <History className="w-8 h-8 mx-auto mb-2 stroke-1" />
              <p className="text-xs font-medium">No recorded sessions found in database</p>
            </div>
          )}

          {!isLoading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const dateStr = sess.created_at
                  ? new Date(sess.created_at).toLocaleString()
                  : "Recent";
                const isSelected = selectedSession?.id === sess.id;

                return (
                  <div
                    key={sess.id || sess.room_name}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-sage-400 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-forest-900 bg-stone-100 px-2 py-0.5 rounded border">
                            {sess.room_name || "Call Session"}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300">
                            {sess.resolution_status || "RESOLVED"}
                          </span>
                          {sess.order_id && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-semibold px-2 py-0.5 rounded border border-amber-300">
                              Order: {sess.order_id}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {dateStr}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-terracotta-600">
                            Intent: {sess.customer_intent || "GENERAL"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedSession(isSelected ? null : sess)}
                        className="text-xs font-medium text-forest-700 hover:text-forest-900 p-1.5 rounded-lg hover:bg-stone-100 flex items-center gap-1 transition"
                      >
                        <span>{isSelected ? "Hide" : "Details"}</span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform ${isSelected ? "rotate-90" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Summary */}
                    {sess.call_summary && (
                      <p className="text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-100 mt-2 leading-relaxed">
                        {sess.call_summary}
                      </p>
                    )}

                    {/* Expanded details */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2">
                        <div className="font-semibold text-xs text-forest-900 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Transcript Record:</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto bg-stone-100 p-3 rounded-xl space-y-1.5 text-[11px] font-mono text-stone-700">
                          {Array.isArray(sess.transcript) && sess.transcript.length > 0 ? (
                            sess.transcript.map((t: any, idx: number) => (
                              <div key={idx}>
                                <strong className={t.role === "agent" ? "text-forest-700" : "text-terracotta-700"}>
                                  {t.role === "agent" ? "Aria" : "User"}:
                                </strong>{" "}
                                {t.content || t.text}
                              </div>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">No turns stored in this record</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
