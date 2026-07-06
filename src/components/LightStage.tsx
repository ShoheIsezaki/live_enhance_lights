"use client";

// 1つのシーンを画面いっぱいに描画する。明滅・ストロボ・レインボーは
// requestAnimationFrame でこの端末が自前で描画する（サーバ送信は切替時の1回のみ）。

import { useEffect, useRef } from "react";
import { Scene } from "@/lib/types";
import { bpmToMs, strobePeriodMs } from "@/lib/scene";

interface Props {
  scene: Scene;
  at: number; // マスターが押した時刻（位相合わせ用）
  fill?: boolean; // 親要素いっぱいに広げる（プレビュー用）
}

export function LightStage({ scene, at, fill }: Props) {
  const bgRef = useRef<HTMLDivElement>(null);
  const ovRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bg = bgRef.current;
    const ov = ovRef.current;
    if (!bg || !ov) return;

    // リセット
    bg.style.animation = "";
    bg.style.background = "";
    bg.style.backgroundColor = "";
    bg.style.backgroundSize = "";
    ov.style.opacity = "0";

    let raf = 0;
    const p = scene.pattern;

    if (p === "solid") {
      bg.style.backgroundColor = scene.color;
    } else if (p === "blackout") {
      bg.style.backgroundColor = "#000000";
    } else if (p === "text") {
      bg.style.backgroundColor = "#000000";
    } else if (p === "gradient") {
      bg.style.background = `linear-gradient(120deg, ${scene.color}, ${
        scene.color2 || scene.color
      })`;
      bg.style.backgroundSize = "200% 200%";
      bg.style.animation = "lelGradient 8s ease infinite";
    } else if (p === "pulse" || p === "strobe" || p === "rainbow") {
      const period =
        p === "strobe"
          ? strobePeriodMs(scene.bpm || 120)
          : bpmToMs(scene.bpm || 120);

      const frame = () => {
        const t = Date.now() - at;
        if (p === "rainbow") {
          const hue = (t / 20) % 360;
          bg.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        } else if (p === "pulse") {
          bg.style.backgroundColor = scene.color;
          if (scene.repeat === false && t > period) {
            ov.style.opacity = "0"; // 1回鳴らして点灯保持
          } else {
            // 暗→明→暗 を滑らかに繰り返す（下限 20% 程度）
            const level = 0.6 + 0.4 * Math.sin((t / period) * 2 * Math.PI - Math.PI / 2);
            ov.style.opacity = String(1 - level);
          }
        } else if (p === "strobe") {
          bg.style.backgroundColor = scene.color;
          if (scene.repeat === false && t > period) {
            ov.style.opacity = "0"; // 1回点滅して点灯保持
          } else {
            const cycle = (t % period) / period;
            ov.style.opacity = cycle < 0.5 ? "0" : "1";
          }
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scene, at]);

  return (
    <div className={fill ? "stage stage--fill" : "stage"}>
      <div ref={bgRef} className="stage__bg" />
      <div ref={ovRef} className="stage__overlay" />
      {scene.pattern === "text" && scene.text ? (
        <div className="stage__text" style={{ color: scene.color }}>
          {scene.text}
        </div>
      ) : null}
    </div>
  );
}
