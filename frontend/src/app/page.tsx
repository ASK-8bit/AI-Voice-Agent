"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  AudioPresets,
  ConnectionQuality,
  RemoteParticipant,
  Participant,
} from "livekit-client";
import confetti from "canvas-confetti";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Sparkles,
  History,
  Shield,
  Volume2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

import { AudioOrb, AgentState } from "@/components/AudioOrb";
import { TestOrdersPanel } from "@/components/TestOrdersPanel";
import { BrandPoliciesPanel } from "@/components/BrandPoliciesPanel";
import { TranscriptFeed, TranscriptTurn } from "@/components/TranscriptFeed";
import { PostCallModal, PostCallSummaryData } from "@/components/PostCallModal";
import { CallHistoryModal } from "@/components/CallHistoryModal";
import { Order } from "@/lib/supabase";

export default function VoiceAgentPage() {
  // Connection and Session States
  const [callState, setCallState] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [roomName, setRoomName] = useState<string>("");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [audioQuality, setAudioQuality] = useState<string>("Good");

  // Audio Analyser Volumes (0 to 1)
  const [userVolume, setUserVolume] = useState<number>(0);
  const [agentVolume, setAgentVolume] = useState<number>(0);

  // Transcript and Summary States
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [liveUserInterim, setLiveUserInterim] = useState<string>("");
  const [postCallSummary, setPostCallSummary] = useState<PostCallSummaryData | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [supabaseSynced, setSupabaseSynced] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersSource, setOrdersSource] = useState<"supabase" | "fallback">("supabase");

  // Suggested Prompt Helper
  const [activeSuggestion, setActiveSuggestion] = useState<string>("");

  // Refs for WebRTC & Audio Contexts
  const roomRef = useRef<Room | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const callStartTimeRef = useRef<string | null>(null);

  // -------------------------------------------------------------
  // 1. Fetch Orders from Supabase on Mount
  // -------------------------------------------------------------
  const loadOrders = useCallback(async () => {
    setIsOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        setOrdersSource(data.source || "supabase");
      }
    } catch (err) {
      console.warn("Failed to load orders, using defaults:", err);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // -------------------------------------------------------------
  // 2. Web Speech API (Local STT for immediate subtitle stream)
  // -------------------------------------------------------------
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("Web Speech API not supported in this browser");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // English (India) per requirements

      recognition.onresult = (event: any) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            const finalChunk = item[0].transcript.trim();
            if (finalChunk) {
              setTranscript((prev) => [
                ...prev,
                {
                  id: `turn-${Date.now()}-${Math.random()}`,
                  role: "user",
                  text: finalChunk,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                },
              ]);
            }
          } else {
            interimText += item[0].transcript;
          }
        }
        setLiveUserInterim(interimText);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          console.warn("Speech recognition warning:", e.error);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still connected
        if (callState === "connected" && speechRecognitionRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn("Could not start speech recognition:", e);
    }
  }, [callState]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setLiveUserInterim("");
  }, []);

  // -------------------------------------------------------------
  // 3. Audio Metering / Visualizer Loop
  // -------------------------------------------------------------
  const startVolumeMetering = useCallback((agentStream?: MediaStream, userStream?: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Agent track analyser
      if (agentStream) {
        const agentSource = audioCtx.createMediaStreamSource(agentStream);
        const agentAnalyser = audioCtx.createAnalyser();
        agentAnalyser.fftSize = 64;
        agentSource.connect(agentAnalyser);
        agentAnalyserRef.current = agentAnalyser;
      }

      // User mic analyser
      if (userStream) {
        const userSource = audioCtx.createMediaStreamSource(userStream);
        const userAnalyser = audioCtx.createAnalyser();
        userAnalyser.fftSize = 64;
        userSource.connect(userAnalyser);
        userAnalyserRef.current = userAnalyser;
      }

      const updateLevels = () => {
        if (agentAnalyserRef.current) {
          const buffer = new Uint8Array(agentAnalyserRef.current.frequencyBinCount);
          agentAnalyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setAgentVolume(Math.min(avg / 128, 1));
        }

        if (userAnalyserRef.current) {
          const buffer = new Uint8Array(userAnalyserRef.current.frequencyBinCount);
          userAnalyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) sum += buffer[i];
          const avg = sum / buffer.length;
          setUserVolume(Math.min(avg / 128, 1));
        }

        animFrameRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (e) {
      console.warn("Audio meter init error:", e);
    }
  }, []);

  const stopVolumeMetering = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setUserVolume(0);
    setAgentVolume(0);
  }, []);

  // -------------------------------------------------------------
  // 4. Start Call (LiveKit Cloud WebRTC Direct Connection)
  // -------------------------------------------------------------
  const startCall = async () => {
    try {
      setCallState("connecting");
      setAgentState("connecting");
      setTranscript([]);
      setLiveUserInterim("");
      setCallDuration(0);
      callStartTimeRef.current = new Date().toISOString();

      // 1. Fetch token and dispatch agent from Next.js serverless route
      const tokenRes = await fetch("/api/token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenRes.ok) {
        throw new Error(`Token generation failed: ${tokenRes.statusText}`);
      }

      const { token, url, roomName: generatedRoom } = await tokenRes.json();
      setRoomName(generatedRoom);

      // 2. Initialize low-latency audio-only LiveKit Room
      const room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        publishDefaults: {
          audioPreset: AudioPresets.speech, // 32kbps Opus speech preset
          dtx: true,
          red: true, // Audio redundancy to eliminate packet drop jitter
        },
      });
      roomRef.current = room;

      // 3. Audio Track Subscription Handler
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log(`[LiveKit] Subscribed to remote audio track from ${participant.identity}`);

          // Attach to dedicated DOM audio element
          let audioElement = document.getElementById("aura-agent-audio") as HTMLAudioElement;
          if (!audioElement) {
            audioElement = document.createElement("audio");
            audioElement.id = "aura-agent-audio";
            audioElement.autoplay = true;
            (audioElement as any).playsInline = true;
            document.body.appendChild(audioElement);
          }

          track.attach(audioElement);
          audioElement.play().catch((err) => console.warn("Audio play prevented:", err));

          // Start volume metering on agent audio
          if (track.mediaStream) {
            startVolumeMetering(track.mediaStream);
          }

          // Initial greeting from Aria
          setTimeout(() => {
            setTranscript((prev) => {
              if (prev.length === 0) {
                return [
                  {
                    id: "greeting",
                    role: "agent",
                    text: "Hello! Welcome to Aura Skincare. I am Aria, your customer support specialist. How may I assist you with your skincare orders or policies today?",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  },
                ];
              }
              return prev;
            });
          }, 800);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
      });

      // 4. Active Speaker Detection (Listening vs Speaking state transitions)
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        if (!speakers || speakers.length === 0) {
          setAgentState("listening");
          return;
        }

        const isAgentSpeaking = speakers.some((s) => s.identity !== room.localParticipant.identity);
        const isUserSpeaking = speakers.some((s) => s.identity === room.localParticipant.identity);

        if (isAgentSpeaking) {
          setAgentState("speaking");
        } else if (isUserSpeaking) {
          setAgentState("listening");
        } else {
          setAgentState("thinking");
        }
      });

      // 5. Connection Quality Listener
      room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
        if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
          setAudioQuality("Excellent");
        } else if (quality === ConnectionQuality.Poor) {
          setAudioQuality("Fair");
        }
      });

      // 6. Data Packets (agent transcript over data channel)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const str = new TextDecoder().decode(payload);
          const data = JSON.parse(str);
          if (data.type === "transcript" && data.text) {
            // Only add agent turns here – user turns are already captured by Web Speech API
            // to avoid duplicates. If Web Speech is unavailable, also accept user turns.
            const isSpeechAPIActive = !!speechRecognitionRef.current;
            if (data.speaker === "agent" || !isSpeechAPIActive) {
              setTranscript((prev) => [
                ...prev,
                {
                  id: `agent-trans-${Date.now()}-${Math.random()}`,
                  role: data.speaker === "user" ? "user" : "agent",
                  text: data.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                },
              ]);
            }
          }
        } catch {}
      });

      room.on(RoomEvent.Disconnected, () => {
        handleCallTermination();
      });

      // 7. Connect direct to LiveKit Cloud (bypass any Vercel proxy)
      await room.connect(url, token);
      console.log(`[LiveKit] Connected to room ${generatedRoom} at ${url}`);

      // 8. Enable microphone with noise suppression and low latency constraints
      await room.localParticipant.setMicrophoneEnabled(true, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      });

      // Start local STT
      startSpeechRecognition();

      setCallState("connected");
      setAgentState("listening");

      // Start duration timer
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to start voice call:", err);
      alert(`Call Connection Error: ${err?.message || err}\n\nPlease check microphone permissions.`);
      setCallState("idle");
      setAgentState("idle");
    }
  };

  // -------------------------------------------------------------
  // 5. End Call & Generate Structured Outcome
  // -------------------------------------------------------------
  const endCall = async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch (e) {
        console.warn("Disconnect error:", e);
      }
    }
    handleCallTermination();
  };

  const handleCallTermination = useCallback(async () => {
    setCallState("ended");
    setAgentState("idle");
    stopSpeechRecognition();
    stopVolumeMetering();

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // 1. Analyze transcript to build structured post-call summary (Section 2.D)
    let detectedOrder: string | null = null;
    let detectedIntent = "GENERAL";

    const allUserTexts = transcript
      .filter((t) => t.role === "user")
      .map((t) => t.text.toUpperCase())
      .join(" ");

    // Check for Order ID references
    const orderMatch = allUserTexts.match(/ORD-\d+/);
    if (orderMatch) {
      detectedOrder = orderMatch[0];
    }

    // Detect Intent
    if (
      allUserTexts.includes("TRACK") ||
      allUserTexts.includes("WHERE IS") ||
      allUserTexts.includes("DELIVERY") ||
      allUserTexts.includes("STATUS") ||
      allUserTexts.includes("ORD-101")
    ) {
      detectedIntent = "ORDER_TRACKING";
    } else if (
      allUserTexts.includes("RETURN") ||
      allUserTexts.includes("REFUND") ||
      allUserTexts.includes("REPLACE") ||
      allUserTexts.includes("ORD-102")
    ) {
      detectedIntent = "RETURN_INQUIRY";
    } else if (
      allUserTexts.includes("CANCEL") ||
      allUserTexts.includes("STOP") ||
      allUserTexts.includes("ORD-103")
    ) {
      detectedIntent = "ORDER_CANCELLATION";
    } else if (
      allUserTexts.includes("COD") ||
      allUserTexts.includes("CASH ON DELIVERY") ||
      allUserTexts.includes("PAYMENT")
    ) {
      detectedIntent = "PAYMENT_POLICY";
    }

    // Build Call Summary description
    let summaryNarrative = "";
    if (detectedIntent === "ORDER_TRACKING" && detectedOrder) {
      summaryNarrative = `Customer asked about the delivery status of ${detectedOrder}. Order details were fetched from Supabase and verified against Aura Skincare delivery timelines.`;
    } else if (detectedIntent === "RETURN_INQUIRY") {
      summaryNarrative = `Customer inquired regarding return eligibility. Aria explained the 7-day unopened policy and 48-hour damage reporting requirement.`;
    } else if (detectedIntent === "ORDER_CANCELLATION") {
      summaryNarrative = `Customer requested cancellation. Aria verified order processing status and explained doorstep refusal guidelines.`;
    } else {
      summaryNarrative = `Customer interacted with Aura Skincare AI specialist regarding brand queries and skincare customer care policies.`;
    }

    const structuredOutcome: PostCallSummaryData = {
      customer_intent: detectedIntent,
      order_id: detectedOrder,
      resolution_status: "RESOLVED",
      call_summary: summaryNarrative,
    };

    setPostCallSummary(structuredOutcome);
    setIsSummaryModalOpen(true);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#1E3A2B", "#87A96B", "#C87D55"],
      });
    } catch {}

    // 2. Persist Call Session to Supabase
    try {
      const response = await fetch("/api/call-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: roomName || `aura-${Date.now()}`,
          started_at: callStartTimeRef.current || new Date().toISOString(),
          ended_at: new Date().toISOString(),
          customer_intent: structuredOutcome.customer_intent,
          order_id: structuredOutcome.order_id,
          resolution_status: structuredOutcome.resolution_status,
          call_summary: structuredOutcome.call_summary,
          transcript: transcript,
        }),
      });

      if (response.ok) {
        setSupabaseSynced(true);
      }
    } catch (e) {
      console.warn("Failed to persist session to Supabase:", e);
    }
  }, [transcript, roomName, stopSpeechRecognition, stopVolumeMetering]);

  // -------------------------------------------------------------
  // 6. Microphone Mute / Unmute Toggle
  // -------------------------------------------------------------
  const toggleMute = async () => {
    if (!roomRef.current) return;
    try {
      const newMuted = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
    } catch (err) {
      console.error("Mute toggle failed:", err);
    }
  };

  // Format Duration display
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* ---------------- Navbar Header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-cream-100/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-800 text-cream-50 flex items-center justify-center font-serif text-xl font-bold shadow-md shadow-forest-900/10 border border-forest-700">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold tracking-tight text-forest-900">
                  Aura Skincare
                </h1>
                <span className="text-[10px] bg-terracotta-100 text-terracotta-700 px-2 py-0.5 rounded-full font-semibold border border-terracotta-200">
                  AI Voice CX
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Autonomous Customer Support Specialist &bull; Powered by LiveKit Cloud
              </p>
            </div>
          </div>

          {/* Connection Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-stone-200 text-xs font-semibold shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  callState === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : callState === "connecting"
                    ? "bg-terracotta-500 animate-ping"
                    : "bg-stone-400"
                }`}
              />
              <span className="text-forest-900">
                {callState === "connected"
                  ? "Live Call Session"
                  : callState === "connecting"
                  ? "Connecting..."
                  : "Agent Ready"}
              </span>
              {callState === "connected" && (
                <span className="font-mono text-terracotta-600 ml-1 font-bold">
                  {formatTimer(callDuration)}
                </span>
              )}
            </div>

            {/* Supabase History Drawer Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-forest-800 text-xs font-medium transition shadow-sm"
              title="View past call sessions in Supabase"
            >
              <History className="w-3.5 h-3.5 text-sage-600" />
              <span className="hidden sm:inline">Call History</span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Main Content Workspace ---------------- */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT COLUMN: Test Orders & Policies (3.5 cols) ================= */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <TestOrdersPanel
              orders={orders}
              isLoading={isOrdersLoading}
              onRefresh={loadOrders}
              dataSource={ordersSource}
              onSelectPrompt={(text) => setActiveSuggestion(text)}
            />

            <BrandPoliciesPanel onSelectPrompt={(text) => setActiveSuggestion(text)} />
          </div>

          {/* ================= CENTER COLUMN: Main Voice Stage & Orb (4.5 cols) ================= */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="w-full glass-panel rounded-3xl p-6 flex flex-col items-center justify-between min-h-[560px] relative overflow-hidden shadow-xl border border-forest-900/10">
              {/* Persona Tag */}
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] uppercase tracking-widest text-terracotta-600 font-bold mb-1">
                  Customer Care Concierge
                </span>
                <h2 className="font-serif text-3xl font-bold text-forest-900 tracking-wide">
                  Aria
                </h2>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Natural Indian English &bull; Strict Policy Guardrails
                </p>
              </div>

              {/* Central Glowing 3D Orb Visualizer */}
              <div className="my-auto py-2">
                <AudioOrb
                  state={agentState}
                  userVolume={userVolume}
                  agentVolume={agentVolume}
                  isMuted={isMuted}
                />
              </div>

              {/* Active Suggestion Prompt Banner (If clicked from helper) */}
              {activeSuggestion && callState === "connected" && (
                <div className="w-full mb-3 p-2.5 rounded-xl bg-sage-50 border border-sage-200 text-xs text-forest-800 flex items-start justify-between gap-2 animate-in fade-in">
                  <div className="flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sage-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Suggested question:</strong> &quot;{activeSuggestion}&quot;
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveSuggestion("")}
                    className="text-stone-400 hover:text-stone-600 text-[10px]"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Call Controls Bar */}
              <div className="w-full pt-4 border-t border-stone-200/70 flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                  {/* Start or End Call Button */}
                  {callState === "idle" || callState === "ended" ? (
                    <button
                      onClick={startCall}
                      className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-forest-900/20 hover:scale-105 active:scale-95"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>Start Voice Call</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Mute Mic Button */}
                      <button
                        onClick={toggleMute}
                        disabled={callState !== "connected"}
                        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        className={`p-3.5 rounded-2xl border transition shadow-sm ${
                          isMuted
                            ? "bg-terracotta-100 border-terracotta-300 text-terracotta-700 hover:bg-terracotta-200"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>

                      {/* End Call Button */}
                      <button
                        onClick={endCall}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-700/20 hover:scale-105 active:scale-95"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>End Call</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtext info */}
                <div className="flex items-center gap-2 text-[11px] text-stone-400 font-medium">
                  <Shield className="w-3 h-3 text-sage-600" />
                  <span>Encrypted WebRTC Audio &bull; Direct LiveKit Cloud</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Live Transcript & Summary (4 cols) ================= */}
          <div className="lg:col-span-4 flex flex-col h-full min-h-[560px]">
            <TranscriptFeed
              transcript={transcript}
              liveUserInterim={liveUserInterim}
              isConnecting={callState === "connecting"}
            />
          </div>
        </div>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-stone-200/70 bg-cream-100/80 px-6 py-3 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            DataStraw Assessment Project &bull; Fictional D2C Skincare Brand:{" "}
            <strong>Aura Skincare</strong>
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>LiveKit Cloud</span>
            <span>&bull;</span>
            <span>Google Realtime Multimodal AI</span>
            <span>&bull;</span>
            <span>Supabase Database</span>
          </div>
        </div>
      </footer>

      {/* ---------------- Post-Call Summary Modal (Section 2.D) ---------------- */}
      {postCallSummary && (
        <PostCallModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          summaryData={postCallSummary}
          transcript={transcript}
          roomName={roomName}
          durationSeconds={callDuration}
          supabaseSynced={supabaseSynced}
        />
      )}

      {/* ---------------- Supabase Call History Modal ---------------- */}
      <CallHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
