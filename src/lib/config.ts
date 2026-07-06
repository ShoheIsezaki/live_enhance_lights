// 環境変数を1か所に集約（未設定でもデモとして動く既定値つき）

export const SHOW_ID =
  process.env.NEXT_PUBLIC_SHOW_ID?.trim() || "band-live";

// 実際に使う showId を解決する。URL の ?show= を最優先し、無ければ環境変数。
// master と audience が必ず同じ値を使うようにして、チャンネル不一致を防ぐ
// （localStorage に保存された古いプログラムの showId には依存しない）。
export function resolveShowId(): string {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search).get("show");
    if (q) return q;
  }
  return SHOW_ID;
}

export const SHOW_TITLE =
  process.env.NEXT_PUBLIC_SHOW_TITLE?.trim() || "LIVE ENHANCE LIGHTS";

export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/";

export const MASTER_PASSCODE =
  process.env.NEXT_PUBLIC_MASTER_PASSCODE?.trim() || "0000";

// Ably を使うか（本番）。未設定なら同一ブラウザ内デモ（BroadcastChannel）
export const ABLY_ENABLED =
  process.env.NEXT_PUBLIC_ABLY_ENABLED?.trim() === "1";

// 安全上のストロボ点滅の上限周波数（Hz）。光過敏性発作への配慮で 3Hz を超えさせない。
export const MAX_STROBE_HZ = 3;
