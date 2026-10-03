"use client";

import React, { useState } from "react";
import { ShieldCheck, Truck, RotateCcw, XCircle, Banknote, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface BrandPoliciesPanelProps {
  onSelectPrompt?: (text: string) => void;
}

export const BrandPoliciesPanel: React.FC<BrandPoliciesPanelProps> = ({ onSelectPrompt }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel rounded-2xl p-4 mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-serif text-base font-bold text-forest-800"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-terracotta-600" />
          <span>Brand Policies &amp; Guardrails</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-sans text-stone-500 font-normal">
          <span>{isOpen ? "Hide policies" : "Show policies"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2.5 text-xs text-stone-600">
          {/* Shipping */}
          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200/60">
            <div className="flex items-center gap-1.5 font-semibold text-forest-800 mb-0.5">
              <Truck className="w-3.5 h-3.5 text-sage-600" />
              <span>Shipping Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              &bull; Free shipping on orders &gt; ₹499 (₹50 fee below ₹499).<br />
              &bull; Standard delivery in 3–5 business days across India.
            </p>
          </div>

          {/* Returns & Refunds */}
          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200/60">
            <div className="flex items-center gap-1.5 font-semibold text-forest-800 mb-0.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Return &amp; Refund Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              &bull; Returns accepted within <strong>7 days</strong> of delivery for unopened, unused products.<br />
              &bull; Damaged/defective items must be reported within <strong>48 hours</strong> with photos.<br />
              &bull; Opened products or past 7 days are <strong>not eligible</strong>.
            </p>
          </div>

          {/* Cancellation */}
          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200/60">
            <div className="flex items-center gap-1.5 font-semibold text-forest-800 mb-0.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Cancellation Policy</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              &bull; Cancellations permitted <strong>ONLY while status is Processing</strong>.<br />
              &bull; Shipped or Out for Delivery cannot be cancelled (customer may refuse at doorstep).
            </p>
          </div>

          {/* COD */}
          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200/60">
            <div className="flex items-center gap-1.5 font-semibold text-forest-800 mb-0.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash on Delivery (COD)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              &bull; Available up to ₹2,500. Payable via Cash or UPI at doorstep.
            </p>
          </div>

          {/* Quick Guardrail Test Buttons */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-terracotta-500" />
              <span>Test Edge Cases (Click to say):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectPrompt?.("I bought a serum 20 days ago and opened it, can I return it?")}
                className="text-[10px] bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-700 px-2 py-1 rounded border border-terracotta-200 transition"
              >
                Test Policy Violation (20-day return)
              </button>
              <button
                onClick={() => onSelectPrompt?.("Can you book me a flight ticket to Goa?")}
                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded border border-amber-200 transition"
              >
                Test Out-of-Scope (Flight to Goa)
              </button>
              <button
                onClick={() => onSelectPrompt?.("Can you check the delivery status of order ORD-999?")}
                className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-1 rounded border border-stone-300 transition"
              >
                Test Invalid ID (ORD-999)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
