// マスターの初期セットリスト（サンプル）。本番は編集モードで自由に差し替え可能。
import { ShowProgram, Song, Scene, BUTTONS_PER_SONG } from "./types";
import { SHOW_ID, SHOW_TITLE } from "./config";

// 12スロットに収まるようパディング
function pad(buttons: (Scene | null)[]): (Scene | null)[] {
  const out = buttons.slice(0, BUTTONS_PER_SONG);
  while (out.length < BUTTONS_PER_SONG) out.push(null);
  return out;
}

const song = (id: string, name: string, buttons: (Scene | null)[]): Song => ({
  id,
  name,
  buttons: pad(buttons),
});

export function defaultProgram(): ShowProgram {
  return {
    showId: SHOW_ID,
    title: SHOW_TITLE,
    songs: [
      song("s1", "M1 オープニング", [
        { label: "SE 青", pattern: "solid", color: "#1e90ff" },
        { label: "サビ 赤明滅", pattern: "pulse", color: "#ff2d55", bpm: 128, repeat: true },
        { label: "Aメロ 紫", pattern: "solid", color: "#8e2de2" },
        { label: "落ちサビ 白", pattern: "solid", color: "#ffffff" },
        { label: "レインボー", pattern: "rainbow", color: "#ffffff" },
        { label: "暗転", pattern: "blackout", color: "#000000" },
      ]),
      song("s2", "M2 バラード", [
        { label: "グラデ 紫青", pattern: "gradient", color: "#8e2de2", color2: "#4a00e0" },
        { label: "淡い青 明滅", pattern: "pulse", color: "#6ec6ff", bpm: 72, repeat: true },
        { label: "白ベタ", pattern: "solid", color: "#fff8e1" },
        { label: "暗転", pattern: "blackout", color: "#000000" },
      ]),
      song("s3", "M3 ラスト", [
        { label: "赤ストロボ", pattern: "strobe", color: "#ff3b30", bpm: 160, repeat: true },
        { label: "金 明滅", pattern: "pulse", color: "#ffd60a", bpm: 140, repeat: true },
        { label: "コール『せーの！』", pattern: "solid", color: "#000000", text: "せーの！" },
        { label: "レインボー", pattern: "rainbow", color: "#ffffff" },
        { label: "総立ち 全白", pattern: "solid", color: "#ffffff" },
        { label: "暗転", pattern: "blackout", color: "#000000" },
      ]),
    ],
  };
}
