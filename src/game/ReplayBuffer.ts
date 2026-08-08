export type ReplayPose = {
  id: string;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
};

export type ReplayFrame = {
  at: number;
  poses: ReplayPose[];
};

export class ReplayBuffer {
  private frames: ReplayFrame[] = [];
  private lastCaptureAt = 0;

  constructor(
    private windowMs = 5200,
    private captureIntervalMs = 50
  ) {}

  reset() {
    this.frames = [];
    this.lastCaptureAt = 0;
  }

  capture(at: number, poses: ReplayPose[]) {
    if (at - this.lastCaptureAt < this.captureIntervalMs) return;
    this.lastCaptureAt = at;
    this.frames.push({
      at,
      poses: poses.map((pose) => ({ ...pose }))
    });
    const cutoff = at - this.windowMs;
    while (this.frames.length && this.frames[0].at < cutoff) this.frames.shift();
  }

  snapshot(fromAt?: number) {
    const frames = fromAt === undefined
      ? this.frames
      : this.frames.filter((frame) => frame.at >= fromAt);
    return frames.map((frame) => ({
      at: frame.at,
      poses: frame.poses.map((pose) => ({ ...pose }))
    }));
  }

  duration(frames: ReplayFrame[]) {
    if (frames.length < 2) return 0;
    return Math.max(0, frames[frames.length - 1].at - frames[0].at);
  }

  sample(frames: ReplayFrame[], replayElapsedMs: number, playbackRate: number) {
    if (!frames.length) return [] as ReplayPose[];
    if (frames.length === 1) return frames[0].poses.map((pose) => ({ ...pose }));

    const targetAt = frames[0].at + replayElapsedMs * playbackRate;
    if (targetAt <= frames[0].at) return frames[0].poses.map((pose) => ({ ...pose }));
    if (targetAt >= frames[frames.length - 1].at) return frames[frames.length - 1].poses.map((pose) => ({ ...pose }));

    let upperIndex = 1;
    while (upperIndex < frames.length && frames[upperIndex].at < targetAt) upperIndex += 1;
    const lower = frames[Math.max(0, upperIndex - 1)];
    const upper = frames[Math.min(frames.length - 1, upperIndex)];
    const span = Math.max(1, upper.at - lower.at);
    const t = Math.max(0, Math.min(1, (targetAt - lower.at) / span));
    const upperById = new Map(upper.poses.map((pose) => [pose.id, pose]));

    return lower.poses.map((pose) => {
      const next = upperById.get(pose.id) ?? pose;
      const qx = lerp(pose.qx, next.qx, t);
      const qy = lerp(pose.qy, next.qy, t);
      const qz = lerp(pose.qz, next.qz, t);
      const qw = lerp(pose.qw, next.qw, t);
      const qLength = Math.hypot(qx, qy, qz, qw) || 1;
      return {
        id: pose.id,
        x: lerp(pose.x, next.x, t),
        y: lerp(pose.y, next.y, t),
        z: lerp(pose.z, next.z, t),
        qx: qx / qLength,
        qy: qy / qLength,
        qz: qz / qLength,
        qw: qw / qLength
      };
    });
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
