// 環境変数を1か所に集約（未設定でもデモとして動く既定値つき）

export const SHOW_ID =
  process.env.NEXT_PUBLIC_SHOW_ID?.trim() || "the-rox-quattro-live";

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
  process.env.NEXT_PUBLIC_SHOW_TITLE?.trim() || "最高は今 TWO-MAN LIVE";

export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() ||
  "https://www.instagram.com/theroxgwo/";

// 注: パスコードはクライアント側の簡易ゲート（デプロイ後のJSにも含まれる）。
// 強固な秘匿ではなく、URLとコードを関係者だけで共有する運用が前提。
export const MASTER_PASSCODE =
  process.env.NEXT_PUBLIC_MASTER_PASSCODE?.trim() || "5150";

// Ably を使うか（本番）。未設定なら同一ブラウザ内デモ（BroadcastChannel）
export const ABLY_ENABLED =
  process.env.NEXT_PUBLIC_ABLY_ENABLED?.trim() === "1";

// 画像アップロード（Cloudflare R2）を有効にするか。編集画面のアップロードボタン表示に使用。
// 実際のR2認証情報はサーバ側の環境変数（R2_*）に置き、/api/upload-url でのみ使用する。
export const UPLOAD_ENABLED =
  process.env.NEXT_PUBLIC_UPLOAD_ENABLED?.trim() === "1";

// 安全上のストロボ点滅の上限周波数（Hz）。光過敏性発作への配慮で 3Hz を超えさせない。
export const MAX_STROBE_HZ = 3;
