// 演出シーンとセットリストのデータ型

// シーンのパターン種別
export type ScenePattern =
  | "solid" // 単色ベタ塗り
  | "pulse" // BPMに合わせて明滅（滑らかに増減光）
  | "strobe" // BPMに合わせてオン/オフ点滅（安全上 3Hz 上限にクランプ）
  | "gradient" // 2色グラデーション（ゆっくり移動）
  | "rainbow" // 虹色に色相回転
  | "text" // 背景色＋大きな文字（コール用）
  | "blackout"; // 暗転（真っ黒）

export interface Scene {
  // 表示用のボタン名（コントローラの視認性のため）
  label: string;
  pattern: ScenePattern;
  // メインカラー（solid/pulse/strobe/text の発光色、gradient の1色目）
  color: string;
  // 2色目（gradient 用）
  color2?: string;
  // pulse / strobe のテンポ
  bpm?: number;
  // アニメーションを繰り返すか（false のとき pulse/strobe は1回のみ）
  repeat?: boolean;
  // text パターンの表示文字
  text?: string;
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
