"use client";

import React, { useMemo } from "react";
import { Mic, Volume2, Sparkles, Loader2, Radio } from "lucide-react";

export type AgentState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

interface AudioOrbProps {
  state: AgentState;
  userVolume?: number; // 0 to 1
  agentVolume?: number; // 0 to 1
  isMuted?: boolean;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  state,
  userVolume = 0,
  agentVolume = 0,
  isMuted = false,
}) => {
  // Dynamic scale calculation based on audio volume
  const scale = useMemo(() => {
    if (state === "speaking") {
      return 1 + Math.min(agentVolume * 0.45, 0.35);
    }
    if (state === "listening") {
      return 1 + Math.min(userVolume * 0.35, 0.25);
    }
    return 1;
  }, [state, agentVolume, userVolume]);

  const stateDetails = useMemo(() => {
    switch (state) {
      case "connecting":
        return {
          label: "Connecting to Aura Cloud...",
          subtext: "Initializing WebRTC & dispatching Aria",
          color: "border-terracotta-500/40 text-terracotta-600 bg-terracotta-50",
          dotColor: "bg-terracotta-500 animate-ping",
          icon: Loader2,
          iconClass: "animate-spin text-terracotta-500",
        };
      case "listening":
        return {
          label: isMuted ? "Microphone Muted" : "Aria is Listening",
          subtext: isMuted ? "Unmute to speak" : "Speak naturally — Indian English supported",
          color: "border-sage-500/40 text-forest-700 bg-sage-50",
          dotColor: "bg-sage-500 animate-pulse",
          icon: Mic,
          iconClass: "text-sage-600",
        };
      case "thinking":
        return {
          label: "Aria is Processing...",
          subtext: "Checking Aura Skincare policies & database",
          color: "border-terracotta-500/50 text-terracotta-700 bg-terracotta-50",
          dotColor: "bg-terracotta-600 animate-bounce",
          icon: Sparkles,
          iconClass: "animate-pulse text-terracotta-500",
        };
      case "speaking":
        return {
          label: "Aria is Speaking",
          subtext: "Streaming real-time voice response",
          color: "border-forest-500/40 text-forest-800 bg-forest-50",
          dotColor: "bg-emerald-500 animate-pulse",
          icon: Volume2,
          iconClass: "text-forest-600",
        };
      default:
        return {
          label: "Ready to Connect",
          subtext: "Click 'Start Voice Call' to begin",
          color: "border-gray-200 text-stone-600 bg-stone-50",
          dotColor: "bg-stone-400",
          icon: Radio,
          iconClass: "text-stone-400",
        };
    }
  }, [state, isMuted]);

  const StateIcon = stateDetails.icon;

  return (
    <div className="flex flex-col items-center justify-center py-6 select-none relative">
      {/* Background ambient radial glow */}
      <div
        className={`absolute w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          state === "speaking"
            ? "bg-terracotta-200/50 scale-125"
            : state === "listening"
            ? "bg-sage-200/60 scale-110"
            : state === "thinking"
            ? "bg-amber-200/50 scale-105"
            : "bg-sage-100/40 scale-90"
        }`}
      />

      {/* Main Orb Container */}
      <div className="relative flex items-center justify-center w-52 h-52 my-4">
        {/* Outermost Ripple Rings (Active when speaking or listening) */}
        {(state === "speaking" || state === "listening") && (
          <>
            <div
              className={`absolute inset-0 rounded-full border border-dashed transition-all duration-300 pointer-events-none ${
                state === "speaking" ? "border-terracotta-400/40 animate-spin-slow" : "border-sage-400/50 animate-pulse"
              }`}
              style={{
                transform: `scale(${scale * 1.3})`,
              }}
            />
            <div
              className={`absolute inset-0 rounded-full border pointer-events-none opacity-40 transition-all duration-500 ${
                state === "speaking"
                  ? "border-forest-500 animate-ping"
                  : "border-sage-500 animate-ping"
              }`}
            />
          </>
        )}

        {/* Outer Aura Ring */}
        <div
          className={`absolute inset-2 rounded-full transition-transform duration-300 pointer-events-none ${
            state === "speaking"
              ? "bg-gradient-to-tr from-forest-600/20 via-terracotta-400/30 to-sage-400/25 blur-md"
              : state === "listening"
              ? "bg-gradient-to-tr from-sage-500/25 via-forest-500/20 to-emerald-300/30 blur-md"
              : state === "thinking"
              ? "bg-gradient-to-tr from-amber-400/25 via-terracotta-400/20 to-amber-200/30 blur-md animate-spin-slow"
              : "bg-sage-200/20 blur-sm"
          }`}
          style={{ transform: `scale(${scale * 1.12})` }}
        />

        {/* 3D Main Glowing Orb Sphere */}
        <div
          className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-default overflow-hidden ${
            state === "speaking"
              ? "orb-speaking bg-gradient-to-br from-terracotta-500 via-forest-700 to-forest-900 border-2 border-terracotta-300/60"
              : state === "listening"
              ? "orb-listening bg-gradient-to-br from-sage-400 via-forest-600 to-forest-800 border-2 border-sage-200/70"
              : state === "thinking"
              ? "orb-thinking bg-gradient-to-br from-terracotta-600 via-amber-600 to-forest-800 border-2 border-amber-300/60"
              : state === "connecting"
              ? "bg-gradient-to-br from-terracotta-400 via-forest-600 to-forest-800 animate-pulse border border-white/40"
              : "orb-idle bg-gradient-to-br from-sage-200 via-forest-700 to-forest-900 border-2 border-white/50"
          }`}
          style={{ transform: `scale(${scale})` }}
        >
          {/* Inner Light Reflection (Specularity) */}
          <div className="absolute top-2 left-4 w-12 h-6 rounded-full bg-white/40 blur-[2px] -rotate-45 pointer-events-none" />

          {/* Sound Wave Bars when Speaking */}
          {state === "speaking" && (
            <div className="flex items-center gap-1.5 z-10">
              <span className="w-1 bg-white/90 rounded-full wave-bar" style={{ animationDelay: "0ms" }} />
              <span className="w-1 bg-white/90 rounded-full wave-bar" style={{ animationDelay: "200ms" }} />
              <span className="w-1 bg-white/90 rounded-full wave-bar" style={{ animationDelay: "400ms" }} />
              <span className="w-1 bg-white/90 rounded-full wave-bar" style={{ animationDelay: "150ms" }} />
              <span className="w-1 bg-white/90 rounded-full wave-bar" style={{ animationDelay: "300ms" }} />
            </div>
          )}

          {/* Sound Wave Rings when Listening */}
          {state === "listening" && (
            <div className="flex items-center justify-center z-10">
              <div
                className="w-12 h-12 rounded-full border-2 border-white/60 flex items-center justify-center transition-all duration-150"
                style={{
                  transform: `scale(${1 + userVolume * 0.8})`,
                  borderColor: userVolume > 0.1 ? "#FFFFFF" : "rgba(255,255,255,0.4)",
                }}
              >
                <Mic className="w-5 h-5 text-white/90" />
              </div>
            </div>
          )}

          {/* Spinner when Thinking or Connecting */}
          {(state === "thinking" || state === "connecting") && (
            <div className="z-10 text-white/90 animate-spin">
              <Sparkles className="w-7 h-7" />
            </div>
          )}

          {/* Idle Logo Accent */}
          {state === "idle" && (
            <div className="text-white/80 flex flex-col items-center">
              <span className="font-serif text-2xl font-bold tracking-widest">A</span>
              <span className="text-[9px] uppercase tracking-widest text-white/60">Aura</span>
            </div>
          )}
        </div>
      </div>

      {/* Live State Badge */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all shadow-sm ${stateDetails.color}`}
        >
          <span className={`w-2 h-2 rounded-full ${stateDetails.dotColor}`} />
          <StateIcon className={`w-3.5 h-3.5 ${stateDetails.iconClass}`} />
          <span>{stateDetails.label}</span>
        </div>
        <p className="text-xs text-stone-500 font-medium text-center">
          {stateDetails.subtext}
        </p>
      </div>
    </div>
  );
};
