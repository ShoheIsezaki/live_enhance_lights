// シーン→画面スタイルの変換とアニメーション計算（すべてクライアント側で完結）
// サーバからはシーン定義を1回送るだけ。明滅などの毎フレーム描画は各端末が自前で行う
// ことで、Ably のメッセージ量（＝従量課金）を最小に抑える。

import { Scene, FontKey, SizeKey, ShowProgram } from "./types";
import { MAX_STROBE_HZ } from "./config";

// テキスト用のシステムフォント（webフォント配信なし＝通信量ゼロ・全端末で即表示）
export const FONT_STACKS: Record<FontKey, string> = {
  gothic:
    '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif',
  mincho: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif',
  maru: '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Yu Gothic", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
};

export const FONT_LABELS: Record<FontKey, string> = {
  gothic: "ゴシック",
  mincho: "明朝",
  maru: "丸ゴシック",
  mono: "等幅",
};

// サイズはコンテナ幅基準(cqw)。全画面でもプレビュー枠でも同じ見え方になる。
export const TEXT_SIZES: Record<SizeKey, string> = {
  s: "8cqw",
  m: "14cqw",
  l: "22cqw",
  xl: "32cqw",
};

export const SIZE_LABELS: Record<SizeKey, string> = {
  s: "小",
  m: "中",
  l: "大",
  xl: "特大",
};

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
    font: "gothic",
    size: "l",
    imageFit: "contain",
    bg: "#000000",
  };
}

// このシーンで BPM 指定が意味を持つか
export function usesBpm(pattern: Scene["pattern"]): boolean {
  return pattern === "pulse" || pattern === "strobe";
}

// このシーンで2色目が意味を持つか（グラデ＝2色、明滅/ストロボ＝色1↔色2の切替）
export function usesColor2(pattern: Scene["pattern"]): boolean {
  return pattern === "gradient" || pattern === "pulse" || pattern === "strobe";
}

// このシーンでオーバーレイ文字が意味を持つか（暗転以外はどのパターンにも重ねられる）
export function usesText(pattern: Scene["pattern"]): boolean {
  return pattern !== "blackout";
}

// このシーンで画像が意味を持つか
export function usesImage(pattern: Scene["pattern"]): boolean {
  return pattern === "image";
}

// パターンの日本語ラベル（編集UI用）
export const PATTERN_LABELS: Record<Scene["pattern"], string> = {
  solid: "単色",
  pulse: "明滅(BPM)",
  strobe: "ストロボ(BPM)",
  gradient: "グラデーション",
  rainbow: "レインボー",
  image: "画像",
  blackout: "暗転",
};

// 旧データ移行：かつての「テキスト」パターン（黒背景＋文字）は
// 「単色（黒）＋オーバーレイ文字」として読み替える。
export function migrateScene(scene: Scene): Scene {
  if ((scene.pattern as string) === "text") {
    return { ...scene, pattern: "solid", color: "#000000" };
  }
  return scene;
}

export function migrateProgram(p: ShowProgram): ShowProgram {
  return {
    ...p,
    songs: p.songs.map((s) => ({
      ...s,
      buttons: s.buttons.map((b) => (b ? migrateScene(b) : null)),
    })),
  };
}
