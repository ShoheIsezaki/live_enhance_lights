"use client";

// 観客がライト画面に入る前のフォローゲート（自己申告制）。
// Instagram公式APIではフォロー関係を第三者アプリが判定できないため、
// 「フォローした→入場」の名誉制ボタンで解放する。一度通れば localStorage で記憶。

import { useState } from "react";
import { INSTAGRAM_URL, SHOW_TITLE } from "@/lib/config";

interface Props {
  onEnter: () => void;
}

export function FollowGate({ onEnter }: Props) {
  const [warned, setWarned] = useState(false);

  return (
    <div className="gate">
      <div className="gate__card">
        <h1 className="gate__title">{SHOW_TITLE}</h1>
        <p className="gate__lead">
          スマホがペンライトになります。<br />
          バンドを Instagram でフォローして参加しよう！
        </p>

        <a
          className="gate__ig"
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram でフォローする
        </a>

        {!warned ? (
          <button className="gate__enter" onClick={() => setWarned(true)}>
            フォローした → 次へ
          </button>
        ) : (
          <div className="gate__warn">
            <p className="gate__warnText">
              ⚠️ 画面が明るく点滅することがあります。光の点滅で気分が悪くなる方は
              画面から目を離してご参加ください。
            </p>
            <button className="gate__enter" onClick={onEnter}>
              同意して入場する
            </button>
          </div>
        )}

        <p className="gate__note">
          入場後は画面の明るさを最大にし、スリープしないよう設定すると綺麗に光ります。
        </p>
      </div>
    </div>
  );
}
