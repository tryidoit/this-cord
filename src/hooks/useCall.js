import { useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { toast } from "@/components/ui/use-toast";
import { PeerConnectionManager, buildIceServers } from "@/lib/peerConnection";
import { getAssetUrl } from "@/lib/assets";
import { showNotification } from "@/lib/notify";

const RINGING_TIMEOUT_MS = 45000;
const FALLBACK_DELAY_MS = 15000;
const HEARTBEAT_MS = 10000;
const STALE_THRESHOLD_MS = 60000;
const FRAME_INTERVAL_MS = 2000;
const AUDIO_CHUNK_MS = 1500;

const parse = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

export default function useCall(profile, config) {
  const myId = profile?.created_by_id;

  const [call, setCall] = useState(null);
  const [incoming, setIncoming] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connection, setConnection] = useState("new");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [remoteCamOff, setRemoteCamOff] = useState(false);
  const [error, setError] = useState("");
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackFrame, setFallbackFrame] = useState(null);
  const [stats, setStats] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);
  const [screenSharing, setScreenSharing] = useState(false);

  const pcmRef = useRef(null);
  const localRef = useRef(null);
  const callRef = useRef(null);
  const peerIdRef = useRef(null);
  const roleRef = useRef(null);
  const seenRef = useRef(new Set());
  const incomingTracksRef = useRef(new MediaStream());
  const fallbackTimerRef = useRef(null);
  const ringingTimerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const fallbackVideoRef = useRef(null);
  const fallbackCanvasRef = useRef(null);
  const screenSharingRef = useRef(false);

  function stopLocal() {
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
  }

  function pushRemote() {
    setRemoteStream(new MediaStream(incomingTracksRef.current.getTracks()));
  }

  function stopFallbackCapture() {
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (audioRecorderRef.current?.state !== "inactive") {
      try { audioRecorderRef.current.stop(); } catch { /* already stopped */ }
    }
    audioRecorderRef.current = null;
    fallbackVideoRef.current = null;
    fallbackCanvasRef.current = null;
  }

  function cleanup(notify) {
    stopFallbackCapture();
    setFallbackMode(false);
    setFallbackFrame(null);
    setConnectedAt(null);
    setStats(null);
    if (ringingTimerRef.current) { clearTimeout(ringingTimerRef.current); ringingTimerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    const current = callRef.current;
    const to = peerIdRef.current;
    if (pcmRef.current) {
      pcmRef.current.stopStats();
      pcmRef.current.close();
      pcmRef.current = null;
    }
    if (notify && current && to) {
      api.entities.CallSignal.create({
        call_key: current.id, from_id: myId, to_id: to, kind: "bye", payload: "",
      }).catch(() => {});
      api.entities.Call.update(current.id, { status: "ended" }).catch(() => {});
      // Clean up signals for this call
      api.entities.CallSignal.deleteMany({ call_key: current.id }).catch(() => {});
    }
    stopLocal();
    incomingTracksRef.current = new MediaStream();
    setRemoteStream(null);
    setRemoteMuted(false);
    setRemoteCamOff(false);
    setConnection("new");
    setMuted(false);
    setCamOff(false);
    setScreenSharing(false);
    screenSharingRef.current = false;
    setCall(null);
    callRef.current = null;
    peerIdRef.current = null;
    roleRef.current = null;
    seenRef.current = new Set();
  }

  function sendSignal(callId, toId, kind, payload) {
    return api.entities.CallSignal.create({
      call_key: callId, from_id: myId, to_id: toId, kind,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    }).catch((err) => console.error("signal", err));
  }

  function startFallbackCapture() {
    if (fallbackMode) return;
    setFallbackMode(true);
    setError("Restricted network — switching to low-quality data mode.");

    const stream = localRef.current;
    if (!stream) return;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    fallbackVideoRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    fallbackCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    const captureFrame = () => {
      try {
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, 160, 120);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.25);
          if (dataUrl && dataUrl.length < 20000) {
            const current = callRef.current;
            if (current && peerIdRef.current) {
              sendSignal(current.id, peerIdRef.current, "frame", dataUrl);
            }
          }
        }
      } catch { /* canvas not ready */ }
    };
    frameIntervalRef.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
    setTimeout(captureFrame, 500);

    try {
      const audioStream = new MediaStream(stream.getAudioTracks());
      if (audioStream.getTracks().length > 0 && window.MediaRecorder) {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(audioStream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size === 0) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            if (result && result.length < 20000) {
              const current = callRef.current;
              if (current && peerIdRef.current) {
                sendSignal(current.id, peerIdRef.current, "audio", result);
              }
            }
          };
          reader.readAsDataURL(e.data);
        };
        recorder.start(AUDIO_CHUNK_MS);
        audioRecorderRef.current = recorder;
      }
    } catch { /* MediaRecorder unavailable */ }
  }

  function makePcm(callId, toId, polite) {
    const iceServers = buildIceServers(config);
    const pcm = new PeerConnectionManager({
      iceServers,
      polite,
      onSignal: (type, payload) => sendSignal(callId, toId, type, payload),
      onTrack: () => pushRemote(),
      onStateChange: (state) => {
        setConnection(state);
        if (state === "connected") {
          stopFallbackCapture();
          setFallbackMode(false);
          setError("");
          setConnectedAt(Date.now());
          setCall((c) => (c ? { ...c, status: "active" } : c));
        }
        if (state === "disconnected") {
          setError("Reconnecting…");
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            const pc = pcmRef.current?.pc;
            if (pc && pc.connectionState === "disconnected") {
              pcmRef.current?.restartIce();
            }
          }, 3000);
        }
        if (state === "failed") {
          // After 15s of failure, switch to data mode
          if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = setTimeout(() => {
            const pc = pcmRef.current?.pc;
            if (pc && pc.connectionState === "failed") {
              startFallbackCapture();
            }
          }, FALLBACK_DELAY_MS);
        }
      },
      onIceStateChange: (state) => {
        if (state === "disconnected" && !fallbackMode) {
          setError("Reconnecting…");
        }
      },
      onStats: (s) => setStats(s),
    });
    pcm.init();
    pcmRef.current = pcm;
    pcm.startStats(5000);
    return pcm;
  }

  async function handleSignalEvent(event) {
    const signal = event?.data;
    if (!signal) return;
    const current = callRef.current;
    if (!current || signal.call_key !== current.id) return;
    if (signal.from_id === myId || seenRef.current.has(signal.id)) return;
    seenRef.current.add(signal.id);
    // Delete the signal after consumption to avoid buildup
    api.entities.CallSignal.delete(signal.id).catch(() => {});

    if (signal.kind === "bye") {
      cleanup(false);
      return;
    }
    if (signal.kind === "frame") {
      setFallbackFrame(signal.payload);
      return;
    }
    if (signal.kind === "audio") {
      try {
        const audio = new Audio(signal.payload);
        audio.play().catch(() => {});
      } catch { /* audio playback failed */ }
      return;
    }
    if (signal.kind === "state") {
      const state = parse(signal.payload);
      if (state) {
        setRemoteMuted(!!state.muted);
        setRemoteCamOff(!!state.camOff);
        // Remote upgraded or downgraded the call kind
        if (state.kind && callRef.current?.kind !== state.kind) {
          callRef.current.kind = state.kind;
          setCall({ ...callRef.current });
        }
      }
      return;
    }
    if (signal.kind === "ping") return; // heartbeat acknowledged

    // WebRTC signals: offer, answer, ice
    const pcm = pcmRef.current;
    if (!pcm) return;
    const payload = parse(signal.payload);
    if (!payload) return;
    await pcm.handleSignal(signal.kind, payload);
  }

  async function loadMissedSignals(callId) {
    const page = await api.entities.CallSignal.filter({ call_key: callId }, { sort: "created_date", limit: 120 });
    for (const signal of page?.items || []) {
      if (signal.from_id === myId || seenRef.current.has(signal.id)) continue;
      // Process as a synthetic event
      await handleSignalEvent({ data: signal });
    }
  }

  function startHeartbeat(callId, toId) {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      sendSignal(callId, toId, "ping", "");
    }, HEARTBEAT_MS);
  }

  function startRingingTimeout(callId) {
    if (ringingTimerRef.current) clearTimeout(ringingTimerRef.current);
    ringingTimerRef.current = setTimeout(() => {
      const current = callRef.current;
      if (current && current.status === "ringing") {
        api.entities.Call.update(callId, { status: "ended" }).catch(() => {});
        setError("No answer");
        setTimeout(() => cleanup(false), 2000);
      }
    }, RINGING_TIMEOUT_MS);
  }

  function scheduleFallbackCheck() {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      const pc = pcmRef.current?.pc;
      const current = callRef.current;
      if (!current) return;
      const state = pc?.connectionState || "new";
      if (state !== "connected" && state !== "closed") {
        startFallbackCapture();
      }
    }, FALLBACK_DELAY_MS);
  }

  async function getMedia(kind) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot access the microphone. Try Chrome or Safari.");
      return null;
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: kind === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 24, max: 30 } } : false,
      });
    } catch (err) {
      const name = err?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone blocked — allow mic and camera access, then try again.");
      } else if (name === "NotFoundError") {
        setError("No microphone or camera was found on this device.");
      } else if (name === "NotReadableError") {
        setError("Your microphone or camera is in use by another app.");
      } else if (typeof window !== "undefined" && window.isSecureContext === false) {
        setError("Calls need a secure (HTTPS) connection.");
      } else {
        setError("Could not access microphone or camera.");
      }
      // If video fails, try audio-only
      if (kind === "video") {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          toast({ title: "Camera unavailable", description: "Continuing as an audio call." });
          return audioOnly;
        } catch { /* both failed */ }
      }
      toast({ title: "Permission needed", description: "This-Cord needs your mic to connect the call.", variant: "destructive" });
      return null;
    }
  }

  async function startCall(peer, kind) {
    if (!profile || callRef.current || !peer?.user_id) return;
    if (peer.user_id === myId) return;
    setError("");
    setFallbackMode(false);
    setFallbackFrame(null);
    const stream = await getMedia(kind);
    if (!stream) return;
    localRef.current = stream;
    setLocalStream(stream);

    let record;
    try {
      record = await api.entities.Call.create({
        kind, caller_id: myId, caller_username: profile.username,
        caller_name: profile.display_name || profile.username, caller_avatar: profile.avatar_id,
        callee_id: peer.user_id, callee_username: peer.username,
        callee_name: peer.display_name || peer.username, callee_avatar: peer.avatar_id,
        status: "ringing",
      });
    } catch (err) {
      console.error(err);
      stopLocal();
      setError("Could not place the call.");
      return;
    }

    roleRef.current = "caller";
    peerIdRef.current = peer.user_id;
    incomingTracksRef.current = new MediaStream();
    const state = { id: record.id, role: "caller", kind, peer, status: "ringing", startedAt: Date.now() };
    callRef.current = state;
    setCall(state);

    const pcm = makePcm(record.id, peer.user_id, false);
    pcm.addLocalStream(stream);
    pcm.setAudioCodecPreferences();
    pcm.setDegradationPreference("maintain-framerate");
    pcm.setMaxBitrate("video", 800000);
    pcm.setMaxBitrate("audio", 64000);

    startRingingTimeout(record.id);
    startHeartbeat(record.id, peer.user_id);
    scheduleFallbackCheck();
  }

  async function acceptCall(record) {
    if (!record || callRef.current) return;
    setIncoming(null);
    setError("");
    setFallbackMode(false);
    setFallbackFrame(null);
    const stream = await getMedia(record.kind);
    if (!stream) return;
    localRef.current = stream;
    setLocalStream(stream);

    roleRef.current = "callee";
    peerIdRef.current = record.caller_id;
    incomingTracksRef.current = new MediaStream();
    const state = {
      id: record.id, role: "callee", kind: record.kind, peer: {
        user_id: record.caller_id, username: record.caller_username,
        display_name: record.caller_name, avatar_id: record.caller_avatar,
      }, status: "connecting", startedAt: Date.now(),
    };
    callRef.current = state;
    setCall(state);

    const pcm = makePcm(record.id, record.caller_id, true);
    pcm.addLocalStream(stream);
    pcm.setAudioCodecPreferences();
    pcm.setDegradationPreference("maintain-framerate");
    pcm.setMaxBitrate("video", 800000);
    pcm.setMaxBitrate("audio", 64000);

    api.entities.Call.update(record.id, { status: "active" }).catch(() => {});
    // Load any signals that arrived before we subscribed
    await loadMissedSignals(record.id);
    startHeartbeat(record.id, record.caller_id);
    scheduleFallbackCheck();
  }

  function declineCall(record) {
    setIncoming(null);
    if (!record) return;
    api.entities.CallSignal.create({
      call_key: record.id, from_id: myId, to_id: record.caller_id, kind: "bye", payload: "",
    }).catch(() => {});
    api.entities.Call.update(record.id, { status: "declined" }).catch(() => {});
  }

  function endCall() {
    cleanup(true);
  }

  function toggleMute() {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
    const current = callRef.current;
    if (current && peerIdRef.current) {
      sendSignal(current.id, peerIdRef.current, "state", JSON.stringify({ muted: next, camOff, kind: current.kind }));
    }
  }

  async function upgradeToVideo() {
    const current = callRef.current;
    if (!current || current.kind === "video") return;
    try {
      const vs = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 24, max: 30 } },
        audio: false,
      });
      const track = vs.getVideoTracks()[0];
      if (!track) return;
      if (localRef.current) localRef.current.addTrack(track);
      setLocalStream(new MediaStream(localRef.current.getTracks()));
      const pcm = pcmRef.current;
      if (pcm) {
        pcm.addTrack(track, localRef.current);
        pcm.setMaxBitrate("video", 800000);
      }
      current.kind = "video";
      setCall({ ...current });
      setCamOff(false);
      if (peerIdRef.current) {
        sendSignal(current.id, peerIdRef.current, "state", JSON.stringify({ muted, camOff: false, kind: "video" }));
      }
    } catch {
      setError("Could not access camera for video upgrade.");
    }
  }

  function downgradeToVoice() {
    const current = callRef.current;
    if (!current || current.kind !== "video") return;
    localRef.current?.getVideoTracks().forEach((t) => t.stop());
    const pcm = pcmRef.current;
    if (pcm) pcm.removeTrackByKind("video");
    current.kind = "voice";
    setCall({ ...current });
    setCamOff(true);
    if (peerIdRef.current) {
      sendSignal(current.id, peerIdRef.current, "state", JSON.stringify({ muted, camOff: true, kind: "voice" }));
    }
  }

  async function toggleScreenShare() {
    const current = callRef.current;
    if (!current) return;
    if (screenSharingRef.current) {
      screenSharingRef.current = false;
      setScreenSharing(false);
      const pcm = pcmRef.current;
      if (pcm && localRef.current) {
        const vt = localRef.current.getVideoTracks()[0];
        if (vt) pcm.replaceTrack(null, vt);
      }
      return;
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const dt = ds.getVideoTracks()[0];
      const pcm = pcmRef.current;
      if (pcm) pcm.replaceTrack(null, dt);
      dt.onended = () => {
        screenSharingRef.current = false;
        setScreenSharing(false);
        if (pcm && localRef.current) {
          const vt = localRef.current.getVideoTracks()[0];
          if (vt) pcm.replaceTrack(null, vt);
        }
      };
      screenSharingRef.current = true;
      setScreenSharing(true);
    } catch { /* user cancelled */ }
  }

  async function toggleCam() {
    // If no video track yet (remote upgraded us to video), start the camera
    if (!localRef.current?.getVideoTracks().length) {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 24, max: 30 } },
          audio: false,
        });
        const track = vs.getVideoTracks()[0];
        if (track && localRef.current) {
          localRef.current.addTrack(track);
          setLocalStream(new MediaStream(localRef.current.getTracks()));
          const pcm = pcmRef.current;
          if (pcm) {
            pcm.addTrack(track, localRef.current);
            pcm.setMaxBitrate("video", 800000);
          }
        }
        setCamOff(false);
        const current = callRef.current;
        if (current && peerIdRef.current) {
          sendSignal(current.id, peerIdRef.current, "state", JSON.stringify({ muted, camOff: false, kind: current.kind }));
        }
      } catch {
        setError("Could not access camera.");
      }
      return;
    }
    const next = !camOff;
    localRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCamOff(next);
    const current = callRef.current;
    if (current && peerIdRef.current) {
      sendSignal(current.id, peerIdRef.current, "state", JSON.stringify({ muted, camOff: next, kind: current.kind }));
    }
  }

  // Watch for incoming calls
  const dndRef = useRef(false);
  dndRef.current = !!profile?.notification_prefs?.dnd;

  useEffect(() => {
    if (!myId) return undefined;
    let alive = true;
    let lastAt = 0;
    const load = async (force = false) => {
      if (callRef.current) return;
      const now = Date.now();
      if (!force && now - lastAt < 2000) return; // realtime ring events (force) must never be throttled away
      lastAt = now;
      try {
        const page = await api.entities.Call.filter(
          { callee_id: myId, status: "ringing" },
          { sort: "-created_date", limit: 1 }
        );
        if (!alive) return;
        const record = page?.items?.[0];
        if (record) {
          // Auto-decline if already in a call (busy)
          if (callRef.current) {
            declineCall(record);
            return;
          }
          // Check if stale (older than 60s)
          const age = Date.now() - new Date(record.created_date).getTime();
          if (age > STALE_THRESHOLD_MS) {
            api.entities.Call.update(record.id, { status: "ended" }).catch(() => {});
            return;
          }
          const dnd = dndRef.current;
          setIncoming(record);
          // Browser notification when tab is hidden (skip if DND)
          if (!dnd && document.hidden && "Notification" in window && Notification.permission === "granted") {
            showNotification(`Incoming ${record.kind} call`, {
              body: `${record.caller_name || record.caller_username} is calling you`,
              tag: `call:${record.id}`,
              onClick: () => { window.focus(); },
            });
          }
          // Vibration on phones (skip if DND)
          if (!dnd && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        } else {
          setIncoming(null);
        }
      } catch { /* offline */ }
    };
    load();
    const timer = setInterval(load, 20000); // SSE delivers calls instantly; this is only a safety net
    const unsub = api.entities.Call.subscribe(() => load(true));
    return () => { alive = false; clearInterval(timer); if (typeof unsub === "function") unsub(); };
  }, [myId]);

  // Latest handlers/prefs via refs so long-lived subscriptions never act on stale closures.
  const handleSignalRef = useRef(handleSignalEvent);
  handleSignalRef.current = handleSignalEvent;
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  // Subscribe to call signals for the active call
  useEffect(() => {
    const current = callRef.current;
    if (!current) return undefined;
    const unsub = api.entities.CallSignal.subscribe((event) => {
      if (event?.data?.call_key === current.id) {
        handleSignalRef.current(event);
      }
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [call?.id]);

  // Best-effort cleanup on page hide / unload
  useEffect(() => {
    const handler = () => {
      const current = callRef.current;
      const to = peerIdRef.current;
      if (current && to) {
        // Use sendBeacon-style fire-and-forget
        api.entities.CallSignal.create({
          call_key: current.id, from_id: myId, to_id: to, kind: "bye", payload: "",
        }).catch(() => {});
        api.entities.Call.update(current.id, { status: "ended" }).catch(() => {});
      }
      if (pcmRef.current) { pcmRef.current.close(); pcmRef.current = null; }
      localRef.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [myId]);

  useEffect(() => () => cleanupRef.current(false), []);

  return {
    call, incoming, localStream, remoteStream, connection,
    muted, camOff, remoteMuted, remoteCamOff,
    error, fallbackMode, fallbackFrame, stats, connectedAt,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam,
    upgradeToVideo, downgradeToVoice, toggleScreenShare, screenSharing,
  };
}