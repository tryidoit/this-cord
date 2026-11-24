// Reusable WebRTC peer-connection manager using the "perfect negotiation" pattern.
// One instance = one RTCPeerConnection to one remote peer.
// Phase 7 (group calls) can create one per remote peer.

const DEFAULT_STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function buildIceServers(turnConfig) {
  const servers = [...DEFAULT_STUN];
  if (turnConfig?.turn_urls) {
    const urls = turnConfig.turn_urls.split(",").map((u) => u.trim()).filter(Boolean);
    if (urls.length && turnConfig.turn_username && turnConfig.turn_credential) {
      servers.push({
        urls,
        username: turnConfig.turn_username,
        credential: turnConfig.turn_credential,
      });
    }
  }
  return servers;
}

export class PeerConnectionManager {
  constructor({ iceServers, polite, onSignal, onTrack, onStateChange, onIceStateChange, onStats }) {
    this.iceServers = iceServers || DEFAULT_STUN;
    this.polite = !!polite;
    this.onSignal = onSignal;
    this.onTrack = onTrack;
    this.onStateChange = onStateChange;
    this.onIceStateChange = onIceStateChange;
    this.onStats = onStats;

    this.pc = null;
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.queuedCandidates = [];
    this.remoteDescriptionSet = false;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this._statsTimer = null;
  }

  init() {
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.onSignal?.("ice", e.candidate.toJSON());
    };

    this.pc.ontrack = (e) => {
      this.remoteStream.addTrack(e.track);
      this.onTrack?.(e.track, this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      this.onStateChange?.(this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      this.onIceStateChange?.(this.pc.iceConnectionState);
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        this.onSignal?.("offer", this.pc.localDescription.toJSON());
      } catch (err) {
        // Glare — if we're the impolite peer we just let the remote retry
        if (!this.polite) console.warn("negotiation error", err);
      } finally {
        this.makingOffer = false;
      }
    };

    return this.pc;
  }

  addLocalStream(stream) {
    this.localStream = stream;
    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }
  }

  removeTrack(kind) {
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === kind) {
        try { this.pc.removeTrack(sender); } catch { /* already removed */ }
      }
    }
  }

  replaceTrack(oldTrack, newTrack) {
    const senders = this.pc.getSenders();
    const sender = senders.find((s) => s.track?.kind === newTrack.kind);
    if (sender) return sender.replaceTrack(newTrack);
  }

  addTrack(track, stream) {
    if (this.localStream) this.localStream.addTrack(track);
    return this.pc.addTrack(track, stream || this.localStream);
  }

  removeTrackByKind(kind) {
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === kind) {
        try { this.pc.removeTrack(sender); } catch { /* already removed */ }
      }
    }
  }

  setAudioCodecPreferences() {
    try {
      const transceivers = this.pc.getTransceivers();
      for (const t of transceivers) {
        if (t.setCodecPreferences && (t.sender?.track?.kind === "audio" || t.receiver?.track?.kind === "audio")) {
          const codecs = RTCRtpReceiver.getCapabilities?.("audio")?.codecs;
          if (codecs) {
            const opus = codecs.filter((c) => c.mimeType === "audio/opus");
            const others = codecs.filter((c) => c.mimeType !== "audio/opus");
            t.setCodecPreferences([...opus, ...others]);
          }
        }
      }
    } catch { /* not supported */ }
  }

  async handleSignal(type, payload) {
    if (!this.pc) return;
    if (type === "ice") {
      try {
        if (this.remoteDescriptionSet) {
          await this.pc.addIceCandidate(payload);
        } else {
          this.queuedCandidates.push(payload);
        }
      } catch {
        if (!this.ignoreOffer) { /* stale candidate */ }
      }
      return;
    }
    // offer or answer
    const description = new RTCSessionDescription(payload);
    const collision = this.makingOffer || this.pc.signalingState !== "stable";
    this.ignoreOffer = !this.polite && collision;
    if (this.ignoreOffer) return;

    // Polite peer rolls back its pending offer on glare
    if (collision && this.polite) {
      try { await this.pc.setLocalDescription({ type: "rollback" }); } catch { /* rollback failed */ }
    }

    await this.pc.setRemoteDescription(description);
    this.remoteDescriptionSet = true;

    // Flush queued ICE candidates now that remote description is set
    for (const candidate of this.queuedCandidates.splice(0)) {
      try { await this.pc.addIceCandidate(candidate); } catch { /* stale */ }
    }

    if (type === "offer") {
      await this.pc.setLocalDescription();
      this.onSignal?.("answer", this.pc.localDescription.toJSON());
    }
  }

  queueCandidate(candidate) {
    this.queuedCandidates.push(candidate);
  }

  restartIce() {
    try { this.pc.restartIce(); } catch { /* not supported */ }
  }

  setMaxBitrate(kind, bitrate) {
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === kind && sender.getParameters) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = bitrate;
        sender.setParameters(params).catch(() => {});
      }
    }
  }

  setDegradationPreference(pref) {
    try {
      this.pc.getTransceivers?.().forEach((t) => {
        if (t.setCodecPreferences) {
          // Just set degradation preference on the sender
        }
      });
    } catch { /* not supported */ }
    const senders = this.pc.getSenders?.() || [];
    for (const sender of senders) {
      const params = sender.getParameters?.();
      if (params) {
        params.degradationPreference = pref;
        sender.setParameters?.(params).catch(() => {});
      }
    }
  }

  startStats(intervalMs = 5000) {
    if (this._statsTimer) clearInterval(this._statsTimer);
    this._statsTimer = setInterval(async () => {
      if (!this.pc) return;
      try {
        const stats = await this.pc.getStats();
        const summary = { rtcType: null, rtt: null, packetsLost: 0, bitrate: null, iceState: this.pc.iceConnectionState };
        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.nominated) {
            summary.rtcType = report.localCandidateId?.includes("srflx") ? "srflx" : report.localCandidateId?.includes("relay") ? "relay" : "host";
            summary.rtt = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : null;
          }
          if (report.type === "inbound-rtp") {
            summary.packetsLost += report.packetsLost || 0;
            if (report.bytesReceived) summary.bitrate = Math.round((report.bytesReceived * 8) / 1000);
          }
        });
        this.onStats?.(summary);
      } catch { /* stats unavailable */ }
    }, intervalMs);
  }

  stopStats() {
    if (this._statsTimer) clearInterval(this._statsTimer);
    this._statsTimer = null;
  }

  close() {
    this.stopStats();
    if (!this.pc) return;
    try {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onnegotiationneeded = null;
      this.pc.close();
    } catch { /* already closed */ }
    this.pc = null;
    this.remoteDescriptionSet = false;
    this.queuedCandidates = [];
  }
}