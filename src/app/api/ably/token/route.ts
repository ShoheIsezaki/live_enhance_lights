// Ably のトークン発行エンドポイント。
// APIキーはサーバ側だけで使い、クライアントには短命トークンだけを渡す。
import Ably from "ably";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ABLY_API_KEY is not configured" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") || undefined;

  const rest = new Ably.Rest(apiKey);
  const tokenRequest = await rest.auth.createTokenRequest({ clientId });

  return new Response(JSON.stringify(tokenRequest), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
