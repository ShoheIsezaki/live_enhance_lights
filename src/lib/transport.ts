"use client";

// リアルタイム同期の抽象化。
// - Ably 実装: 本番。スマホ間を低遅延 pub/sub で同期し、presence で接続数を取得。
// - Local 実装: 同一ブラウザ内タブのみ（BroadcastChannel）。Ablyキー無しで挙動確認用。
//
// アニメーションはクライアント側で完結するため、送信されるのはボタンを押した
// 瞬間の「シーン切替メッセージ」だけ。メッセージ量は極小に保たれる。

import { SceneMessage } from "./types";
import { ABLY_ENABLED } from "./config";

export type Role = "audience" | "master";

export interface Transport {
  // マスターがシーンを配信
  publishScene(msg: SceneMessage): void;
  // シーン受信の購読（解除関数を返す）
  onScene(cb: (msg: SceneMessage) => void): () => void;
  // 接続数の購読（解除関数を返す）。マスターのみ使用。
  onCount(cb: (n: number) => void): () => void;
  // 後入店の端末が現在のシーンへ追従できたか（Ablyはrewindで自動、Localはstorage）
  close(): void;
}

const channelName = (showId: string) => `show:${showId}`;
const lastKey = (showId: string) => `lel:last:${showId}`;

// ---------------------------------------------------------------------------
// Ably 実装
// ---------------------------------------------------------------------------
class AblyTransport implements Transport {
  private client: import("ably").Realtime | null = null;
  private channel: import("ably").RealtimeChannel | null = null;
  private ready: Promise<void>;

  constructor(showId: string, role: Role) {
    this.ready = this.init(showId, role);
  }

  private async init(showId: string, role: Role) {
    const Ably = await import("ably");
    const clientId =
      role +
      "-" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);

    this.client = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authParams: { clientId },
      clientId,
    });

    // 後入店の端末が直近のシーンを受け取れるよう rewind(1) を付与。
    // master は params 不要。undefined を渡すと Ably がエラーになるため、
    // オプションが必要なときだけ第2引数を渡す。
    const name = channelName(showId);
    this.channel =
      role === "audience"
        ? this.client.channels.get(name, { params: { rewind: "1" } })
        : this.client.channels.get(name);

    if (role === "audience") {
      // 接続数カウント用に presence へ参加
      try {
        await this.channel.presence.enter({ role });
      } catch {
        // presence 失敗は致命的でないため無視
      }
    }
  }

  publishScene(msg: SceneMessage): void {
    this.ready.then(() => {
      this.channel?.publish("scene", msg);
    });
  }

  onScene(cb: (msg: SceneMessage) => void): () => void {
    let listener: ((m: unknown) => void) | null = null;
    this.ready.then(() => {
      listener = (m: unknown) => {
        const message = m as { data: SceneMessage };
        cb(message.data);
      };
      this.channel?.subscribe("scene", listener as never);
    });
    return () => {
      if (listener) this.channel?.unsubscribe("scene", listener as never);
    };
  }

  onCount(cb: (n: number) => void): () => void {
    let handler: (() => void) | null = null;
    this.ready.then(() => {
      const update = async () => {
        try {
          const members = (await this.channel?.presence.get()) ?? [];
          cb(members.length);
        } catch {
          /* ignore */
        }
      };
      handler = update;
      this.channel?.presence.subscribe(update as never);
      update();
    });
    return () => {
      if (handler) this.channel?.presence.unsubscribe(handler as never);
    };
  }

  close(): void {
    this.ready.then(() => {
      try {
        this.channel?.presence.leave();
      } catch {
        /* ignore */
      }
      this.client?.close();
    });
  }
}

// ---------------------------------------------------------------------------
// Local 実装（同一ブラウザ内タブのみ・デモ用）
// ---------------------------------------------------------------------------
class LocalTransport implements Transport {
  private bc: BroadcastChannel;
  private showId: string;
  private role: Role;
  private myId = Math.random().toString(36).slice(2);
  private seen = new Map<string, number>(); // audienceId -> lastSeen(ms)
  private heartbeat?: ReturnType<typeof setInterval>;
  private sweep?: ReturnType<typeof setInterval>;

  constructor(showId: string, role: Role) {
    this.showId = showId;
    this.role = role;
    this.bc = new BroadcastChannel(channelName(showId));

    if (role === "audience") {
      // 生存通知を定期送信
      const beat = () => this.bc.postMessage({ type: "beat", id: this.myId });
      beat();
      this.heartbeat = setInterval(beat, 3000);
      window.addEventListener("beforeunload", () =>
        this.bc.postMessage({ type: "bye", id: this.myId })
      );
    }
  }

  publishScene(msg: SceneMessage): void {
    this.bc.postMessage({ type: "scene", msg });
    try {
      localStorage.setItem(lastKey(this.showId), JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  }

  onScene(cb: (msg: SceneMessage) => void): () => void {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "scene") cb(e.data.msg as SceneMessage);
    };
    this.bc.addEventListener("message", handler);
    // 後入店: 直近のシーンを storage から復元
    if (this.role === "audience") {
      try {
        const raw = localStorage.getItem(lastKey(this.showId));
        if (raw) cb(JSON.parse(raw) as SceneMessage);
      } catch {
        /* ignore */
      }
    }
    return () => this.bc.removeEventListener("message", handler);
  }

  onCount(cb: (n: number) => void): () => void {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "beat") {
        this.seen.set(e.data.id, Date.now());
        cb(this.aliveCount());
      } else if (e.data?.type === "bye") {
        this.seen.delete(e.data.id);
        cb(this.aliveCount());
      }
    };
    this.bc.addEventListener("message", handler);
    // 8秒生存が途切れた端末を掃除
    this.sweep = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, t] of this.seen) {
        if (now - t > 8000) {
          this.seen.delete(id);
          changed = true;
        }
      }
      if (changed) cb(this.aliveCount());
    }, 3000);
    return () => {
      this.bc.removeEventListener("message", handler);
      if (this.sweep) clearInterval(this.sweep);
    };
  }

  private aliveCount(): number {
    return this.seen.size;
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.sweep) clearInterval(this.sweep);
    if (this.role === "audience") {
      this.bc.postMessage({ type: "bye", id: this.myId });
    }
    this.bc.close();
  }
}

export function createTransport(showId: string, role: Role): Transport {
  if (ABLY_ENABLED) return new AblyTransport(showId, role);
  return new LocalTransport(showId, role);
}
