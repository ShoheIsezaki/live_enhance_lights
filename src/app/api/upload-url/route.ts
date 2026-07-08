// 画像アップロード用の署名付きURLを発行する（Cloudflare R2 / S3互換）。
// ブラウザはこのURLへ直接 PUT するので、大きな画像も Vercel の関数を経由せず
// R2 に届き、費用・制限の面で有利。R2 認証情報はサーバ側だけで使用する。
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    return json(
      { error: "R2 が未設定です（R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL）" },
      500
    );
  }

  const { contentType } = (await request.json().catch(() => ({}))) as {
    contentType?: string;
  };
  const ct = contentType || "image/jpeg";
  const ext = ct.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "jpg";
  const key = `uploads/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}.${ext}`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: ct }),
    { expiresIn: 600 }
  );

  return json({ uploadUrl, publicUrl: `${publicBase}/${key}`, contentType: ct });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
