"use client";

// 観客のライト画面。QR/URLで開くだけ。フォローゲート→全画面発光。
import { useEffect, useRef, useState } from "react";
import { LightStage } from "@/components/LightStage";
import { FollowGate } from "@/components/FollowGate";
import { createTransport, Transport } from "@/lib/transport";
import { resolveShowId } from "@/lib/config";
import { BLACKOUT } from "@/lib/scene";
import { SceneMessage } from "@/lib/types";

const ENTERED_KEY = "lel:entered";

export default function AudiencePage() {
  const [entered, setEntered] = useState(false);
  const [msg, setMsg] = useState<SceneMessage>({ scene: BLACKOUT, at: Date.now() });
  const transportRef = useRef<Transport | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 既に一度入場していればゲートを省略
  useEffect(() => {
    try {
      if (localStorage.getItem(ENTERED_KEY) === "1") setEntered(true);
    } catch {
      /* ignore */
    }
  }, []);

  // 入場後: 同期の購読とスリープ防止
  useEffect(() => {
    if (!entered) return;
    const t = createTransport(resolveShowId(), "audience");
    transportRef.current = t;
    const off = t.onScene((m) => setMsg(m));

    // マスターからのリセット指示で初期画面（フォローゲート）へ戻す
    const offCtrl = t.onControl((cmd) => {
      if (cmd === "reset") {
        try {
          localStorage.removeItem(ENTERED_KEY);
        } catch {
          /* ignore */
        }
        setMsg({ scene: BLACKOUT, at: Date.now() });
        setEntered(false);
      }
    });

    // 画面スリープ防止（対応端末のみ）
    const requestWakeLock = async () => {
      try {
        wakeLockRef.current =
          (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* 非対応/失敗は無視 */
      }
    };
    requestWakeLock();
    const onVisible = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      off();
      offCtrl();
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release().catch(() => {});
      t.close();
    };
  }, [entered]);

  const enter = () => {
    try {
      localStorage.setItem(ENTERED_KEY, "1");
    } catch {
      /* ignore */
    }
    setEntered(true);
    // ユーザー操作のタイミングで全画面化を試みる
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  if (!entered) return <FollowGate onEnter={enter} />;

  return (
    <div className="audience" onClick={toggleFullscreen}>
      <LightStage scene={msg.scene} at={msg.at} />
    </div>
  );
}
