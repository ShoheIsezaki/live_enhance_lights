// 演出シーンとセットリストのデータ型

// シーンのパターン種別
export type ScenePattern =
  | "solid" // 単色ベタ塗り
  | "pulse" // BPMに合わせて明滅（滑らかに増減光）
  | "strobe" // BPMに合わせてオン/オフ点滅（安全上 3Hz 上限にクランプ）
  | "gradient" // 2色グラデーション（ゆっくり移動）
  | "rainbow" // 虹色に色相回転
  | "image" // 画像を全画面表示
  | "blackout"; // 暗転（真っ黒）

// テキストのフォント種別（システムフォントのみ＝通信量ゼロ）
export type FontKey = "gothic" | "mincho" | "maru" | "mono";
// テキストのサイズプリセット
export type SizeKey = "s" | "m" | "l" | "xl";
// 画像のフィット方法
export type ImageFit = "contain" | "cover";

export interface Scene {
  // 表示用のボタン名（コントローラの視認性のため）
  label: string;
  pattern: ScenePattern;
  // メインカラー（solid の発光色、pulse/strobe/gradient の1色目）
  color: string;
  // 2色目（gradient / pulse / strobe で使用）
  color2?: string;
  // pulse / strobe のテンポ
  bpm?: number;
  // アニメーションを繰り返すか（false のとき pulse/strobe は1回のみ）
  repeat?: boolean;
  // どのパターンにも重ねられるオーバーレイ文字（改行可・空なら非表示）
  // 文字は常に白＋黒縁取りの固定スタイル（色や明るさの変化はしない）
  text?: string;
  // オーバーレイ文字のフォント・サイズ
  font?: FontKey;
  size?: SizeKey;
  // image パターンの画像URL（Cloudflare R2 等のCDN配信URL）と表示方法
  imageUrl?: string;
  imageFit?: ImageFit;
  // image パターンの背景色（contain時の余白の色）
  bg?: string;
}

// 1曲ぶんの演出。ボタンは 4×3 = 12 個（空きスロットは null）
export interface Song {
  id: string;
  name: string;
  buttons: (Scene | null)[]; // 長さ 12
}

// マスターが編集・保持するショー全体の設定
export interface ShowProgram {
  showId: string; // Ably チャンネルの識別子
  title: string;
  songs: Song[];
}

// 1曲あたりのボタン数（4列 × 3行）
export const BUTTONS_PER_SONG = 12;
export const GRID_COLS = 4;
export const GRID_ROWS = 3;

// 同期でスマホに配信されるメッセージ（シーン切替 or 暗転）
export interface SceneMessage {
  scene: Scene;
  // マスターが押した瞬間のタイムスタンプ（クライアント側アニメーションの位相合わせ用）
  at: number;
}
