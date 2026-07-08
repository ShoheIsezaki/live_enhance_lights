"use client";

// 画像をブラウザ側で縮小してから R2 にアップロードする。
// 縮小により1枚あたりの容量を抑え、観客全員のダウンロード量（＝転送コスト）を小さく保つ。

// 長辺を maxDim まで縮小し JPEG 化した Blob を返す
export async function resizeImage(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas未対応");
  ctx.drawImage(img, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画像変換に失敗"))),
      "image/jpeg",
      quality
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}

// 縮小 → 署名付きURL取得 → R2 へ直接PUT。公開URLを返す。
export async function uploadImage(file: File): Promise<string> {
  const blob = await resizeImage(file);

  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg" }),
  });
  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(e.error || "アップロードURLの取得に失敗しました");
  }
  const { uploadUrl, publicUrl } = (await res.json()) as {
    uploadUrl: string;
    publicUrl: string;
  };

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: blob,
  });
  if (!put.ok) {
    throw new Error(
      "画像のアップロードに失敗しました（R2バケットのCORS設定でPUTを許可してください）"
    );
  }
  return publicUrl;
}
