import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/api/client";
import { PeerConnectionManager, buildIceServers } from "@/lib/peerConnection";
import { createVoiceEffectChain, getVoiceEffects } from "@/lib/voiceEffects";
import { playJoinSound, playLeaveSound, playSound } from "@/lib/soundboard";
import { toast } from "@/components/ui/use-toast";

const MAX_PARTICIPANTS = 8;
const SIGNAL_KEY_PREFIX = "voice:";
const VAD_INTERVAL_MS = 200;
const VAD_THRESHOLD = 0.08;
const STATE_THROTTLE_MS = 1000;
const HEARTBEAT_MS = 15000;

const parse = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

export default function useVoiceChannel(profile, config) {
  const myId = profile?.created_by_id;
  const myUsername = profile?.username;
  const myDisplayName = profile?.display_name || profile?.username;
  const myAvatarId = profile?.avatar_id;

  const [activeChannel, setActiveChannel] = useState(null); // { id, name, server_id, type }
  const [participants, setParticipants] = useState([]); // VoiceRoom records
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [connectionQuality, setConnectionQuality] = useState("good");
  const [voiceEffect, setVoiceEffect] = useState("none");
  const [pushToTalkKey, setPushToTalkKey] = useState(null); // null = off
  const [pttActive, setPttActive] = useState(false);
  const [perUserVolume, setPerUserVolume] = useState({}); // { userId: 0-100 }
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [inputVolume, setInputVolume] = useState(100);
  const [isPrioritySpeaker, setIsPrioritySpeaker] = useState(false);

  // Refs
  const peersRef = useRef(new Map()); // userId → { pcm, remoteStream, audioEl, gainNode, analyser, speaking, stats }
  const localStreamRef = useRef(null);
  const processedAudioTrackRef = useRef(null);
  const effectChainRef = useRef(null);
  const audioCtxRef = useRef(null);
  const myRoomRef = useRef(null); // my VoiceRoom record
  const channelRef = useRef(null);
  const seenSignalsRef = useRef(new Set());
  const vadTimerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastStateUpdateRef = useRef(0);
  const deafenedRef = useRef(false);
  const mutedRef = useRef(false);
  const camOnRef = useRef(false);
  const screenSharingRef = useRef(false);
  const voiceEffectRef = useRef("none");
  const inputVolumeRef = useRef(100);
  const perUserVolumeRef = useRef({});
  const pttKeyRef = useRef(null);
  const pttActiveRef = useRef(false);
  const effectAudioSourceRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const vadSourceRef = useRef(null);

  const sendSignal = useCallback((callId, toId, kind, payload) => {
    return api.entities.CallSignal.create({
      call_key: callId, from_id: myId, to_id: toId, kind,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    }).catch(() => {});
  }, [myId]);

  const updateMyState = useCallback(async (overrides = {}) => {
    if (!myRoomRef.current) return;
    const now = Date.now();
    if (now - lastStateUpdateRef.current < STATE_THROTTLE_MS && !overrides._force) return;
    lastStateUpdateRef.current = now;
    try {
      const updated = await api.entities.VoiceRoom.update(myRoomRef.current.id, {
        muted: overrides.muted ?? mutedRef.current,
        deafened: overrides.deafened ?? deafenedRef.current,
        camera_on: overrides.camera_on ?? camOnRef.current,
        screen_sharing: overrides.screen_sharing ?? screenSharingRef.current,
        speaking: overrides.speaking ?? false,
        voice_effect: overrides.voice_effect ?? voiceEffectRef.current,
        priority_speaker: overrides.priority_speaker ?? isPrioritySpeaker,
        connection_quality: overrides.connection_quality ?? "good",
        ...overrides,
      });
      myRoomRef.current = updated;
    } catch { /* ignore */ }
  }, [myId, isPrioritySpeaker]);

  // --- Media acquisition ---
  const getLocalMedia = useCallback(async (withVideo = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot access the microphone. Try Chrome or Safari.");
      return null;
    }
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(selectedInput ? { deviceId: { exact: selectedInput } } : {}),
        },
        video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 24, max: 30 } } : false,
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const name = err?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone blocked — allow mic access, then try again.");
      } else if (name === "NotFoundError") {
        setError("No microphone was found on this device.");
      } else if (name === "NotReadableError") {
        setError("Your microphone is in use by another app.");
      } else {
        setError("Could not access microphone.");
      }
      return null;
    }
  }, [selectedInput]);

  // --- Voice effects ---
  const rebuildEffectChain = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const rawAudioTrack = stream.getAudioTracks()[0];
    if (!rawAudioTrack) return;

    // Clean up previous chain
    if (effectChainRef.current) {
      effectChainRef.current.cleanup();
      effectChainRef.current = null;
    }

    const effect = voiceEffectRef.current;
    if (effect === "none") {
      // Use raw track
      processedAudioTrackRef.current = rawAudioTrack;
      replaceAudioTrackInPeers(rawAudioTrack);
      return;
    }

    const chain = createVoiceEffectChain(rawAudioTrack, effect);
    if (!chain) {
      processedAudioTrackRef.current = rawAudioTrack;
      replaceAudioTrackInPeers(rawAudioTrack);
      return;
    }
    effectChainRef.current = chain;
    processedAudioTrackRef.current = chain.outputTrack;
    replaceAudioTrackInPeers(chain.outputTrack);
  }, []);

  function replaceAudioTrackInPeers(newTrack) {
    for (const { pcm } of peersRef.current.values()) {
      if (pcm) {
        const senders = pcm.pc?.getSenders?.() || [];
        const audioSender = senders.find((s) => s.track?.kind === "audio");
        if (audioSender) {
          audioSender.replaceTrack(newTrack).catch(() => {});
        }
      }
    }
  }

  // --- VAD (Voice Activity Detection) ---
  const setupVAD = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = audioCtxRef.current || new AC();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
      vadSourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSpeaking = false;

      if (vadTimerRef.current) clearInterval(vadTimerRef.current);
      vadTimerRef.current = setInterval(() => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        const isSpeaking = avg > VAD_THRESHOLD && !mutedRef.current && (!pttKeyRef.current || pttActiveRef.current);
        if (isSpeaking !== lastSpeaking) {
          lastSpeaking = isSpeaking;
          setSpeaking(isSpeaking);
          updateMyState({ speaking: isSpeaking, _force: true });
        }
      }, VAD_INTERVAL_MS);
    } catch { /* VAD unavailable */ }
  }, [updateMyState]);

  // --- Per-peer connection management ---
  const makePeerPcm = useCallback((callId, peerUserId, polite) => {
    const iceServers = buildIceServers(config);
    const remoteStream = new MediaStream();
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    document.body.appendChild(audioEl);
    audioEl.style.display = "none";

    const pcm = new PeerConnectionManager({
      iceServers,
      polite,
      onSignal: (type, payload) => sendSignal(callId, peerUserId, type, payload),
      onTrack: (track, stream) => {
        remoteStream.addTrack(track);
        if (track.kind === "audio") {
          // Set up per-user volume via Web Audio
          setupPerUserAudio(peerUserId, remoteStream, audioEl);
        }
      },
      onStateChange: (state) => {
        if (state === "connected") {
          setError("");
        }
        if (state === "disconnected" || state === "failed") {
          const entry = peersRef.current.get(peerUserId);
          if (entry) entry.connectionQuality = state === "failed" ? "poor" : "medium";
        }
      },
      onStats: (s) => {
        const entry = peersRef.current.get(peerUserId);
        if (entry) {
          entry.stats = s;
          if (s.rtt != null) {
            if (s.rtt < 150) entry.connectionQuality = "good";
            else if (s.rtt < 400) entry.connectionQuality = "medium";
            else entry.connectionQuality = "poor";
          }
        }
      },
    });
    pcm.init();
    pcm.startStats(5000);

    // Add local stream
    const ls = localStreamRef.current;
    if (ls) {
      const audioTrack = processedAudioTrackRef.current || ls.getAudioTracks()[0];
      if (audioTrack) pcm.pc.addTrack(audioTrack, ls);
      if (camOnRef.current) {
        const videoTrack = ls.getVideoTracks()[0];
        if (videoTrack) pcm.pc.addTrack(videoTrack, ls);
      }
    }

    peersRef.current.set(peerUserId, {
      pcm,
      remoteStream,
      audioEl,
      speaking: false,
      stats: null,
      connectionQuality: "good",
      gainNode: null,
      analyser: null,
    });

    return pcm;
  }, [config, sendSignal]);

  function setupPerUserAudio(peerUserId, stream, audioEl) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
      return;
    }
    try {
      const ctx = audioCtxRef.current || new AC();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const gain = ctx.createGain();
      const vol = perUserVolumeRef.current[peerUserId];
      gain.gain.value = vol != null ? vol / 100 : 1;
      source.connect(gain);
      gain.connect(ctx.destination);
      const entry = peersRef.current.get(peerUserId);
      if (entry) {
        entry.gainNode = gain;
        entry.audioSource = source;
      }
    } catch {
      audioEl.srcObject = stream;
      audioEl.play().catch(() => {});
    }
  }

  // --- Signal handling ---
  const handleSignal = useCallback(async (signal) => {
    if (!signal || signal.from_id === myId || seenSignalsRef.current.has(signal.id)) return;
    seenSignalsRef.current.add(signal.id);
    api.entities.CallSignal.delete(signal.id).catch(() => {});

    const currentChannel = channelRef.current;
    if (!currentChannel) return;
    const expectedKey = SIGNAL_KEY_PREFIX + currentChannel.id;
    if (signal.call_key !== expectedKey) return;

    if (signal.kind === "bye") {
      const entry = peersRef.current.get(signal.from_id);
      if (entry) {
        entry.pcm.close();
        entry.audioEl?.remove();
        peersRef.current.delete(signal.from_id);
        setParticipants((prev) => prev.filter((p) => p.user_id !== signal.from_id));
      }
      return;
    }
    if (signal.kind === "state") {
      // Handled via VoiceRoom subscription
      return;
    }
    if (signal.kind === "soundboard") {
      const data = parse(signal.payload);
      if (data?.soundId) playSound(data.soundId, data.volume ?? 0.7);
      return;
    }

    // WebRTC signals
    let entry = peersRef.current.get(signal.from_id);
    if (!entry) {
      // Create PCM for incoming peer (we are polite if our id > their id)
      const polite = myId > signal.from_id;
      makePeerPcm(signal.call_key, signal.from_id, polite);
      entry = peersRef.current.get(signal.from_id);
    }
    if (!entry?.pcm) return;
    const payload = parse(signal.payload);
    if (!payload && signal.kind !== "ice") return;
    await entry.pcm.handleSignal(signal.kind, payload);
  }, [myId, makePeerPcm]);

  // --- Load missed signals ---
  const loadMissedSignals = useCallback(async (channelId) => {
    const key = SIGNAL_KEY_PREFIX + channelId;
    const page = await api.entities.CallSignal.filter({ call_key: key, to_id: myId }, { sort: "created_date", limit: 200 });
    for (const signal of page?.items || []) {
      if (signal.from_id === myId || seenSignalsRef.current.has(signal.id)) continue;
      await handleSignal(signal);
    }
  }, [myId, handleSignal]);

  // --- VoiceRoom subscription ---
  useEffect(() => {
    if (!activeChannel?.id) return undefined;
    const channelId = activeChannel.id;
    let alive = true;

    const participantsRef = { current: [] };
    let firstLoad = true;
    const loadParticipants = async () => {
      try {
        const page = await api.entities.VoiceRoom.filter({ channel_id: channelId }, { limit: 50, sort: "joined_at" });
        if (!alive) return;
        const list = page?.items || [];
        const now = Date.now();
        const fresh = list.filter((r) => {
          const age = now - new Date(r.created_date).getTime();
          return age < 120000 || r.user_id === myId;
        });
        setParticipants(fresh);

        for (const p of fresh) {
          if (p.user_id === myId) continue;
          if (peersRef.current.has(p.user_id)) continue;
          const polite = myId > p.user_id;
          const callKey = SIGNAL_KEY_PREFIX + channelId;
          makePeerPcm(callKey, p.user_id, polite);
        }

        if (!firstLoad) {
          const prevIds = new Set((participantsRef.current || []).map((p) => p.user_id));
          const currentIds = new Set(fresh.map((p) => p.user_id));
          for (const id of currentIds) {
            if (!prevIds.has(id) && id !== myId) playJoinSound();
          }
          for (const id of prevIds) {
            if (!currentIds.has(id) && id !== myId) playLeaveSound();
          }
        }
        participantsRef.current = fresh;
        firstLoad = false;
      } catch { /* offline */ }
    };
    loadParticipants();
    const unsub = api.entities.VoiceRoom.subscribe(() => loadParticipants());
    return () => { alive = false; if (typeof unsub === "function") unsub(); };
  }, [activeChannel?.id, myId, makePeerPcm]);

  // --- CallSignal subscription ---
  useEffect(() => {
    if (!activeChannel?.id || !myId) return undefined;
    const unsub = api.entities.CallSignal.subscribe((event) => {
      if (event?.data?.to_id === myId) {
        handleSignal(event.data);
      }
    });
    // Load missed signals
    loadMissedSignals(activeChannel.id);
    return () => { if (typeof unsub === "function") unsub(); };
  }, [activeChannel?.id, myId, handleSignal, loadMissedSignals]);

  // --- Heartbeat ---
  useEffect(() => {
    if (!activeChannel?.id || !myId) return undefined;
    const channelId = activeChannel.id;
    heartbeatRef.current = setInterval(() => {
      updateMyState({ _force: true });
    }, HEARTBEAT_MS);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [activeChannel?.id, myId, updateMyState]);

  // --- Push-to-talk keybind ---
  useEffect(() => {
    if (!pushToTalkKey) return undefined;
    const onKeyDown = (e) => {
      if (e.code === pushToTalkKey && !pttActiveRef.current) {
        pttActiveRef.current = true;
        setPttActive(true);
        applyMute(false);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === pushToTalkKey && pttActiveRef.current) {
        pttActiveRef.current = false;
        setPttActive(false);
        applyMute(mutedRef.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [pushToTalkKey]);

  // --- Device enumeration ---
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
    }).catch(() => {});
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => () => {
    cleanupAll();
  }, []);

  function cleanupAll() {
    for (const { pcm, audioEl } of peersRef.current.values()) {
      pcm?.close();
      audioEl?.remove();
    }
    peersRef.current.clear();
    if (vadTimerRef.current) { clearInterval(vadTimerRef.current); vadTimerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (effectChainRef.current) { effectChainRef.current.cleanup(); effectChainRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* */ } audioCtxRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setParticipants([]);
    setSpeaking(false);
    setCamOn(false);
    setScreenSharing(false);
    setMuted(false);
    setDeafened(false);
    setActiveChannel(null);
    channelRef.current = null;
    myRoomRef.current = null;
  }

  function applyMute(nextMuted) {
    const track = processedAudioTrackRef.current || localStreamRef.current?.getAudioTracks()?.[0];
    if (track) track.enabled = !nextMuted;
    setMuted(nextMuted);
    mutedRef.current = nextMuted;
  }

  // --- Public API ---

  const joinChannel = useCallback(async (channel) => {
    if (!profile || !channel) return;
    if (channelRef.current) {
      if (channelRef.current.id === channel.id) return;
      await leaveChannel();
    }
    if ((participants.length || 0) >= MAX_PARTICIPANTS) {
      toast({ title: "Room full", description: `Voice channels support up to ${MAX_PARTICIPANTS} people.`, variant: "destructive" });
      return;
    }

    setError("");
    channelRef.current = channel;
    const stream = await getLocalMedia(false);
    if (!stream) return;
    localStreamRef.current = stream;
    setLocalStream(stream);
    processedAudioTrackRef.current = stream.getAudioTracks()[0];

    // Create VoiceRoom record
    try {
      const room = await api.entities.VoiceRoom.create({
        channel_id: channel.id,
        server_id: channel.server_id || "",
        channel_name: channel.name,
        user_id: myId,
        username: myUsername,
        display_name: myDisplayName,
        avatar_id: myAvatarId,
        muted: false,
        deafened: false,
        camera_on: false,
        screen_sharing: false,
        speaking: false,
        is_speaker: channel.type === "stage",
        hand_raised: false,
        connection_quality: "good",
        priority_speaker: false,
        voice_effect: voiceEffectRef.current,
        joined_at: new Date().toISOString(),
      });
      myRoomRef.current = room;
    } catch (err) {
      console.error(err);
      setError("Could not join voice channel.");
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      channelRef.current = null;
      return;
    }

    setActiveChannel(channel);
    setupVAD();

    // Load existing participants and create connections
    try {
      const page = await api.entities.VoiceRoom.filter({ channel_id: channel.id }, { limit: 50, sort: "joined_at" });
      const existing = (page?.items || []).filter((r) => r.user_id !== myId);
      const callKey = SIGNAL_KEY_PREFIX + channel.id;
      for (const p of existing) {
        if (peersRef.current.has(p.user_id)) continue;
        const polite = myId > p.user_id;
        makePeerPcm(callKey, p.user_id, polite);
      }
    } catch { /* ignore */ }
  }, [profile, participants.length, getLocalMedia, myId, myUsername, myDisplayName, myAvatarId, setupVAD, makePeerPcm]);

  const leaveChannel = useCallback(async () => {
    const channelId = channelRef.current?.id;
    const callKey = channelId ? SIGNAL_KEY_PREFIX + channelId : null;

    // Send bye to all peers
    if (callKey) {
      for (const peerId of peersRef.current.keys()) {
        sendSignal(callKey, peerId, "bye", "");
      }
    }

    // Delete VoiceRoom record
    if (myRoomRef.current) {
      try { await api.entities.VoiceRoom.delete(myRoomRef.current.id); } catch { /* */ }
    }

    cleanupAll();
  }, [sendSignal]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    applyMute(next);
    updateMyState({ muted: next, _force: true });
  }, [updateMyState]);

  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    // Mute all remote audio
    for (const { audioEl, gainNode } of peersRef.current.values()) {
      if (gainNode) gainNode.gain.value = next ? 0 : 1;
      else if (audioEl) audioEl.muted = next;
    }
    // Also mute self when deafened
    if (next) applyMute(true);
    updateMyState({ deafened: next, muted: next, _force: true });
  }, [updateMyState]);

  const toggleCamera = useCallback(async () => {
    if (!camOnRef.current) {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 24, max: 30 } },
          audio: false,
        });
        const track = vs.getVideoTracks()[0];
        if (track && localStreamRef.current) {
          localStreamRef.current.addTrack(track);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        camOnRef.current = true;
        setCamOn(true);
        for (const { pcm } of peersRef.current.values()) {
          if (pcm && track) pcm.addTrack(track, localStreamRef.current);
        }
        updateMyState({ camera_on: true, _force: true });
      } catch {
        setError("Could not access camera.");
      }
    } else {
      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      for (const { pcm } of peersRef.current.values()) {
        pcm?.removeTrackByKind("video");
      }
      camOnRef.current = false;
      setCamOn(false);
      updateMyState({ camera_on: false, _force: true });
    }
  }, [updateMyState]);

  const toggleScreenShare = useCallback(async () => {
    if (!screenSharingRef.current) {
      try {
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const dt = ds.getVideoTracks()[0];
        for (const { pcm } of peersRef.current.values()) {
          if (pcm && dt) pcm.addTrack(dt, ds);
        }
        dt.onended = () => {
          screenSharingRef.current = false;
          setScreenSharing(false);
          for (const { pcm } of peersRef.current.values()) {
            pcm?.removeTrackByKind("video");
          }
          updateMyState({ screen_sharing: false, _force: true });
        };
        screenSharingRef.current = true;
        setScreenSharing(true);
        updateMyState({ screen_sharing: true, _force: true });
      } catch { /* user cancelled */ }
    } else {
      for (const { pcm } of peersRef.current.values()) {
        pcm?.removeTrackByKind("video");
      }
      screenSharingRef.current = false;
      setScreenSharing(false);
      updateMyState({ screen_sharing: false, _force: true });
    }
  }, [updateMyState]);

  const changeVoiceEffect = useCallback((effect) => {
    voiceEffectRef.current = effect;
    setVoiceEffect(effect);
    rebuildEffectChain();
    updateMyState({ voice_effect: effect, _force: true });
  }, [rebuildEffectChain, updateMyState]);

  const changeInputVolume = useCallback((vol) => {
    inputVolumeRef.current = vol;
    setInputVolume(vol);
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (track?.applyConstraints) {
      track.applyConstraints({ volume: vol / 100 }).catch(() => {});
    }
  }, []);

  const changePerUserVolume = useCallback((userId, vol) => {
    const next = { ...perUserVolumeRef.current, [userId]: vol };
    perUserVolumeRef.current = next;
    setPerUserVolume(next);
    const entry = peersRef.current.get(userId);
    if (entry?.gainNode) entry.gainNode.gain.value = vol / 100;
  }, []);

  const changeInputDevice = useCallback(async (deviceId) => {
    setSelectedInput(deviceId);
    if (!localStreamRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, deviceId: { exact: deviceId } },
        video: false,
      });
      const newTrack = newStream.getAudioTracks()[0];
      const oldTrack = localStreamRef.current.getAudioTracks()[0];
      if (oldTrack) localStreamRef.current.removeTrack(oldTrack);
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      processedAudioTrackRef.current = newTrack;
      rebuildEffectChain();
    } catch {
      setError("Could not switch input device.");
    }
  }, [rebuildEffectChain]);

  const changeOutputDevice = useCallback((deviceId) => {
    setSelectedOutput(deviceId);
    for (const { audioEl } of peersRef.current.values()) {
      if (audioEl?.setSinkId) {
        audioEl.setSinkId(deviceId).catch(() => {});
      }
    }
  }, []);

  const togglePrioritySpeaker = useCallback(() => {
    const next = !isPrioritySpeaker;
    setIsPrioritySpeaker(next);
    updateMyState({ priority_speaker: next, _force: true });
  }, [isPrioritySpeaker, updateMyState]);

  const playSoundboardSound = useCallback((soundId, volume = 0.7) => {
    playSound(soundId, volume);
    // Broadcast to all peers
    const callKey = channelRef.current ? SIGNAL_KEY_PREFIX + channelRef.current.id : null;
    if (callKey) {
      for (const peerId of peersRef.current.keys()) {
        sendSignal(callKey, peerId, "soundboard", JSON.stringify({ soundId, volume }));
      }
    }
  }, [sendSignal]);

  // Stage channel actions
  const raiseHand = useCallback(() => {
    if (!myRoomRef.current) return;
    const next = !myRoomRef.current.hand_raised;
    updateMyState({ hand_raised: next, _force: true });
  }, [updateMyState]);

  const inviteToSpeak = useCallback(async (userId) => {
    if (!channelRef.current) return;
    const callKey = SIGNAL_KEY_PREFIX + channelRef.current.id;
    sendSignal(callKey, userId, "stage", JSON.stringify({ action: "invite_to_speak" }));
    // Update their VoiceRoom record
    try {
      const page = await api.entities.VoiceRoom.filter({ channel_id: channelRef.current.id, user_id: userId }, { limit: 1 });
      if (page?.items?.[0]) {
        await api.entities.VoiceRoom.update(page.items[0].id, { is_speaker: true, hand_raised: false });
      }
    } catch { /* */ }
  }, [sendSignal]);

  const removeFromStage = useCallback(async (userId) => {
    if (!channelRef.current) return;
    try {
      const page = await api.entities.VoiceRoom.filter({ channel_id: channelRef.current.id, user_id: userId }, { limit: 1 });
      if (page?.items?.[0]) {
        await api.entities.VoiceRoom.update(page.items[0].id, { is_speaker: false });
      }
    } catch { /* */ }
  }, []);

  // Page hide cleanup
  useEffect(() => {
    const handler = () => {
      if (channelRef.current && myRoomRef.current) {
        const callKey = SIGNAL_KEY_PREFIX + channelRef.current.id;
        for (const peerId of peersRef.current.keys()) {
          sendSignal(callKey, peerId, "bye", "");
        }
        api.entities.VoiceRoom.delete(myRoomRef.current.id).catch(() => {});
      }
      for (const { pcm } of peersRef.current.values()) pcm?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [sendSignal]);

  return {
    activeChannel,
    participants,
    localStream,
    muted,
    deafened,
    camOn,
    screenSharing,
    speaking,
    error,
    connectionQuality,
    voiceEffect,
    pushToTalkKey,
    pttActive,
    perUserVolume,
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    inputVolume,
    isPrioritySpeaker,
    maxParticipants: MAX_PARTICIPANTS,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
    changeVoiceEffect,
    changeInputVolume,
    changePerUserVolume,
    changeInputDevice,
    changeOutputDevice,
    togglePrioritySpeaker,
    setPushToTalkKey,
    playSoundboardSound,
    raiseHand,
    inviteToSpeak,
    removeFromStage,
  };
}