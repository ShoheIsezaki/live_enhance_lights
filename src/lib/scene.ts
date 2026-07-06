// シーン→画面スタイルの変換とアニメーション計算（すべてクライアント側で完結）
// サーバからはシーン定義を1回送るだけ。明滅などの毎フレーム描画は各端末が自前で行う
// ことで、Ably のメッセージ量（＝従量課金）を最小に抑える。

import { Scene } from "./types";
import { MAX_STROBE_HZ } from "./config";

// BPM を1拍あたりのミリ秒に変換
export function bpmToMs(bpm: number): number {
  const safe = Math.max(20, Math.min(300, bpm || 120));
  return 60000 / safe;
}

// ストロボの周期（ms）。安全上、点滅頻度を MAX_STROBE_HZ 以下にクランプする。
export function strobePeriodMs(bpm: number): number {
  const ms = bpmToMs(bpm);
  const minPeriod = 1000 / MAX_STROBE_HZ; // 3Hz → 333ms
  return Math.max(minPeriod, ms);
}

// 空のシーン（暗転）
export const BLACKOUT: Scene = {
  label: "暗転",
  pattern: "blackout",
  color: "#000000",
};

// 新規スロット用のデフォルトシーン
export function makeDefaultScene(label = "新規シーン"): Scene {
  return {
    label,
    pattern: "solid",
    color: "#1e90ff",
    color2: "#8e2de2",
    bpm: 120,
    repeat: true,
    text: "",
  };
}

// このシーンで BPM 指定が意味を持つか
export function usesBpm(pattern: Scene["pattern"]): boolean {
  return pattern === "pulse" || pattern === "strobe";
}

// このシーンで2色目が意味を持つか
export function usesColor2(pattern: Scene["pattern"]): boolean {
  return pattern === "gradient";
}

// このシーンでテキストが意味を持つか
export function usesText(pattern: Scene["pattern"]): boolean {
  return pattern === "text";
}

// パターンの日本語ラベル（編集UI用）
export const PATTERN_LABELS: Record<Scene["pattern"], string> = {
  solid: "単色",
  pulse: "明滅(BPM)",
  strobe: "ストロボ(BPM)",
  gradient: "グラデーション",
  rainbow: "レインボー",
  text: "テキスト",
  blackout: "暗転",
};
