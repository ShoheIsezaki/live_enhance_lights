"use client";

// 1つのシーンを画面いっぱいに描画する。明滅・ストロボ・レインボーは
// requestAnimationFrame でこの端末が自前で描画する（サーバ送信は切替時の1回のみ）。

import { useEffect, useRef } from "react";
import { Scene } from "@/lib/types";
import { bpmToMs, strobePeriodMs, FONT_STACKS, TEXT_SIZES } from "@/lib/scene";

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
    ov.style.backgroundColor = "#000000";

    let raf = 0;
    const p = scene.pattern;

    if (p === "solid") {
      bg.style.backgroundColor = scene.color;
    } else if (p === "blackout") {
      bg.style.backgroundColor = "#000000";
    } else if (p === "image") {
      // 画像の余白（contain時）の背景色。未指定は黒
      bg.style.backgroundColor = scene.bg || "#000000";
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
      // 明滅/ストロボは 色1(bg) ↔ 色2(overlay) の2色切替。色2未指定は黒。
      const c2 = scene.color2 || "#000000";
      if (p !== "rainbow") {
        bg.style.backgroundColor = scene.color;
        ov.style.backgroundColor = c2;
      }

      const frame = () => {
        const t = Date.now() - at;
        if (p === "rainbow") {
          const hue = (t / 20) % 360;
          bg.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        } else if (p === "pulse") {
          if (scene.repeat === false && t > period) {
            ov.style.opacity = "0"; // 1回鳴らして色1で点灯保持
          } else {
            // 色1↔色2 を滑らかにクロスフェード（0↔1）
            const x = (1 - Math.cos((t / period) * 2 * Math.PI)) / 2;
            ov.style.opacity = String(x);
          }
        } else if (p === "strobe") {
          if (scene.repeat === false && t > period) {
            ov.style.opacity = "0"; // 1回点滅して色1で点灯保持
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
      {scene.pattern === "image" && scene.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="stage__img"
          src={scene.imageUrl}
          alt=""
          style={{ objectFit: scene.imageFit ?? "contain" }}
        />
      ) : null}
      {scene.pattern !== "blackout" && scene.text ? (
        // オーバーレイ文字。背景がどう動いても文字は白＋黒縁取りで固定表示
        <div
          className="stage__text"
          style={{
            fontFamily: FONT_STACKS[scene.font ?? "gothic"],
            fontSize: TEXT_SIZES[scene.size ?? "l"],
          }}
        >
          {scene.text}
        </div>
      ) : null}
    </div>
  );
}
