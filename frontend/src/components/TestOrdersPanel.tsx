"use client";

import React, { useState } from "react";
import { Order } from "@/lib/supabase";
import { Copy, Check, Package, RefreshCw, Sparkles, Database, ExternalLink } from "lucide-react";

interface TestOrdersPanelProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
  dataSource: "supabase" | "fallback";
  onSelectPrompt?: (text: string) => void;
}

export const TestOrdersPanel: React.FC<TestOrdersPanelProps> = ({
  orders,
  isLoading,
  onRefresh,
  dataSource,
  onSelectPrompt,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "out for delivery":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "processing":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-forest-800 leading-tight">
              Test Orders Database
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
              <Database className="w-3 h-3 text-sage-600" />
              <span>
                {dataSource === "supabase" ? "Live Supabase DB" : "Mock Fallback Data"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh orders from Supabase"
          className="p-1.5 rounded-lg border border-stone-200 hover:bg-white text-stone-500 hover:text-forest-700 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="text-xs text-stone-600 mb-3 leading-relaxed">
        Click an order below or copy its ID to test Aria&apos;s real-time database lookup and policy verification.
      </p>

      {/* Orders List */}
      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[460px]">
        {orders.map((ord) => {
          const isCopied = copiedId === ord.order_id;
          return (
            <div
              key={ord.order_id}
              className="group p-3 rounded-xl border border-stone-200/80 bg-white/70 hover:bg-white hover:border-sage-400 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => {
                if (onSelectPrompt) {
                  onSelectPrompt(`Can you tell me the status of my order ${ord.order_id}?`);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-forest-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 group-hover:border-forest-400">
                    {ord.order_id}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      ord.status
                    )}`}
                  >
                    {ord.status}
                  </span>
                </div>

                <button
                  onClick={(e) => handleCopy(ord.order_id, e)}
                  title="Copy Order ID"
                  className="opacity-70 group-hover:opacity-100 p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-forest-700 transition"
                >
                  {isCopied ? (
                    <span className="flex items-center text-[10px] text-emerald-600 font-bold gap-1">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Customer & Product details */}
              <div className="text-xs font-medium text-forest-900 mb-1">
                {ord.customer} &bull;{" "}
                <span className="font-semibold text-terracotta-600">{ord.value}</span>
              </div>
              <div className="text-xs text-stone-600 truncate mb-1">
                <span className="text-stone-400">Item:</span> {ord.product}
              </div>

              {/* Notes */}
              {ord.notes && (
                <div className="text-[11px] text-stone-500 italic bg-stone-50/70 p-1.5 rounded border border-stone-100 mt-1.5 flex items-start gap-1">
                  <span className="font-semibold not-italic text-stone-600 text-[10px] uppercase">
                    Note:
                  </span>
                  <span className="line-clamp-2">{ord.notes}</span>
                </div>
              )}

              {/* Quick Prompt Suggester */}
              <div className="mt-2 pt-2 border-t border-dashed border-stone-100 flex items-center justify-between text-[11px] text-sage-600 group-hover:text-forest-700">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3" /> Try asking Aria about this
                </span>
                <span className="text-[10px] bg-sage-50 text-sage-700 px-1.5 py-0.5 rounded border border-sage-200 group-hover:bg-forest-50">
                  {ord.order_id === "ORD-101"
                    ? "Where is my order?"
                    : ord.order_id === "ORD-102"
                    ? "Can I return this?"
                    : "Can I cancel this?"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-stone-200/60 text-[11px] text-stone-500 flex items-center justify-between">
        <span>Evaluator testing helper</span>
        <span className="font-mono text-[10px] text-stone-400">public.orders</span>
      </div>
    </div>
  );
};
