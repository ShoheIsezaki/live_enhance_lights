"use client";

// マスター（プレゼンター）用コンソール。
// - 編集モード / 本番モードの切替
// - 曲ごとに 4×3=12 個のシーンボタン（名前つき）を用意
// - 各ボタンにシーン（パターン/BPM/繰り返し）を割り当て
// - 本番モードでボタンを押すと全端末がそのシーンに切り替わる

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  BUTTONS_PER_SONG,
  Scene,
  ShowProgram,
  Song,
  SceneMessage,
} from "@/lib/types";
import {
  PATTERN_LABELS,
  makeDefaultScene,
  usesBpm,
  usesColor2,
  usesText,
} from "@/lib/scene";
import { defaultProgram } from "@/lib/defaultShow";
import { createTransport, Transport } from "@/lib/transport";
import { MASTER_PASSCODE, ABLY_ENABLED } from "@/lib/config";
import { LightStage } from "@/components/LightStage";

const PROGRAM_KEY = "lel:program";
const OK_KEY = "lel:master-ok";

type Mode = "live" | "edit";

export default function MasterPage() {
  const [ok, setOk] = useState(false);
  const [pass, setPass] = useState("");
  const [program, setProgram] = useState<ShowProgram | null>(null);
  const [mode, setMode] = useState<Mode>("live");
  const [songIdx, setSongIdx] = useState(0);
  const [activeBtn, setActiveBtn] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [current, setCurrent] = useState<SceneMessage | null>(null);
  const transportRef = useRef<Transport | null>(null);

  // パスコード確認状態の復元
  useEffect(() => {
    try {
      if (sessionStorage.getItem(OK_KEY) === "1") setOk(true);
    } catch {
      /* ignore */
    }
  }, []);

  // プログラム読込（localStorage 優先、無ければサンプル）
  useEffect(() => {
    if (!ok) return;
    try {
      const raw = localStorage.getItem(PROGRAM_KEY);
      setProgram(raw ? (JSON.parse(raw) as ShowProgram) : defaultProgram());
    } catch {
      setProgram(defaultProgram());
    }
  }, [ok]);

  // プログラム変更を保存
  useEffect(() => {
    if (!program) return;
    try {
      localStorage.setItem(PROGRAM_KEY, JSON.stringify(program));
    } catch {
      /* ignore */
    }
  }, [program]);

  // 同期トランスポート
  useEffect(() => {
    if (!ok || !program) return;
    const t = createTransport(program.showId, "master");
    transportRef.current = t;
    const off = t.onCount((n) => setCount(n));
    return () => {
      off();
      t.close();
      transportRef.current = null;
    };
    // showId が変わったら作り直す
  }, [ok, program?.showId]);

  const send = useCallback((scene: Scene, btnIndex: number | null) => {
    const msg: SceneMessage = { scene, at: Date.now() };
    transportRef.current?.publishScene(msg);
    setCurrent(msg);
    setActiveBtn(btnIndex);
  }, []);

  const submitPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === MASTER_PASSCODE) {
      setOk(true);
      try {
        sessionStorage.setItem(OK_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      alert("パスコードが違います");
    }
  };

  if (!ok) {
    return (
      <div className="gate">
        <form className="gate__card" onSubmit={submitPass}>
          <h1 className="gate__title">マスターコンソール</h1>
          <p className="gate__lead">パスコードを入力してください</p>
          <input
            className="passInput"
            type="password"
            value={pass}
            inputMode="numeric"
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="gate__enter" type="submit">
            入室
          </button>
        </form>
      </div>
    );
  }

  if (!program) return <div className="console">読み込み中…</div>;

  const song = program.songs[songIdx];

  return (
    <div className="console">
      <ConsoleHeader
        program={program}
        mode={mode}
        setMode={(m) => {
          setMode(m);
          setEditIdx(null);
        }}
        count={count}
      />

      <SongTabs
        songs={program.songs}
        songIdx={songIdx}
        onSelect={(i) => {
          setSongIdx(i);
          setEditIdx(null);
        }}
        editable={mode === "edit"}
        onProgramChange={setProgram}
        program={program}
      />

      {mode === "live" ? (
        <LivePanel
          song={song}
          activeBtn={activeBtn}
          current={current}
          onPress={send}
        />
      ) : (
        <EditPanel
          program={program}
          songIdx={songIdx}
          editIdx={editIdx}
          setEditIdx={setEditIdx}
          onProgramChange={setProgram}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ConsoleHeader({
  program,
  mode,
  setMode,
  count,
}: {
  program: ShowProgram;
  mode: Mode;
  setMode: (m: Mode) => void;
  count: number;
}) {
  return (
    <header className="console__header">
      <div className="console__title">{program.title}</div>
      <div className="console__modes">
        <button
          className={`modeBtn ${mode === "live" ? "modeBtn--on" : ""}`}
          onClick={() => setMode("live")}
        >
          本番
        </button>
        <button
          className={`modeBtn ${mode === "edit" ? "modeBtn--on modeBtn--edit" : ""}`}
          onClick={() => setMode("edit")}
        >
          編集
        </button>
      </div>
      <div className="console__count" title="接続中のスマホ台数">
        📱 {ABLY_ENABLED ? count : `${count}(demo)`}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
function SongTabs({
  songs,
  songIdx,
  onSelect,
  editable,
  program,
  onProgramChange,
}: {
  songs: Song[];
  songIdx: number;
  onSelect: (i: number) => void;
  editable: boolean;
  program: ShowProgram;
  onProgramChange: (p: ShowProgram) => void;
}) {
  const addSong = () => {
    const n: Song = {
      id: "s" + Date.now().toString(36),
      name: `M${songs.length + 1} 新規曲`,
      buttons: Array(BUTTONS_PER_SONG).fill(null),
    };
    onProgramChange({ ...program, songs: [...songs, n] });
    onSelect(songs.length);
  };

  const rename = (i: number) => {
    const name = prompt("曲名", songs[i].name);
    if (name == null) return;
    const next = songs.slice();
    next[i] = { ...next[i], name };
    onProgramChange({ ...program, songs: next });
  };

  const remove = (i: number) => {
    if (songs.length <= 1) return;
    if (!confirm(`「${songs[i].name}」を削除しますか？`)) return;
    const next = songs.slice();
    next.splice(i, 1);
    onProgramChange({ ...program, songs: next });
    onSelect(Math.max(0, i - 1));
  };

  return (
    <nav className="songTabs">
      {songs.map((s, i) => (
        <button
          key={s.id}
          className={`songTab ${i === songIdx ? "songTab--on" : ""}`}
          onClick={() => onSelect(i)}
          onDoubleClick={() => editable && rename(i)}
        >
          {s.name}
          {editable && i === songIdx ? (
            <span
              className="songTab__x"
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
            >
              ×
            </span>
          ) : null}
        </button>
      ))}
      {editable ? (
        <button className="songTab songTab--add" onClick={addSong}>
          ＋曲
        </button>
      ) : null}
    </nav>
  );
}

// ---------------------------------------------------------------------------
function LivePanel({
  song,
  activeBtn,
  current,
  onPress,
}: {
  song: Song;
  activeBtn: number | null;
  current: SceneMessage | null;
  onPress: (scene: Scene, i: number | null) => void;
}) {
  return (
    <div className="live">
      <div className="grid">
        {song.buttons.map((scene, i) => (
          <button
            key={i}
            className={`cell ${activeBtn === i ? "cell--active" : ""} ${
              scene ? "" : "cell--empty"
            }`}
            style={scene ? cellStyle(scene) : undefined}
            disabled={!scene}
            onClick={() => scene && onPress(scene, i)}
          >
            {scene ? (
              <>
                <span className="cell__label">{scene.label}</span>
                <span className="cell__meta">{metaLabel(scene)}</span>
              </>
            ) : (
              <span className="cell__empty">—</span>
            )}
          </button>
        ))}
      </div>

      <div className="live__side">
        <button
          className="blackout"
          onClick={() =>
            onPress({ label: "暗転", pattern: "blackout", color: "#000000" }, null)
          }
        >
          ■ 暗転（全消灯）
        </button>
        <div className="preview">
          <div className="preview__label">現在の出力</div>
          <div className="preview__stage">
            {current ? (
              <LightStage scene={current.scene} at={current.at} fill />
            ) : (
              <div className="preview__idle">未送信</div>
            )}
          </div>
          <div className="preview__name">
            {current ? current.scene.label : "—"}
          </div>
        </div>
        <JoinPanel />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function EditPanel({
  program,
  songIdx,
  editIdx,
  setEditIdx,
  onProgramChange,
}: {
  program: ShowProgram;
  songIdx: number;
  editIdx: number | null;
  setEditIdx: (i: number | null) => void;
  onProgramChange: (p: ShowProgram) => void;
}) {
  const song = program.songs[songIdx];

  const setButton = (i: number, scene: Scene | null) => {
    const songs = program.songs.slice();
    const buttons = songs[songIdx].buttons.slice();
    buttons[i] = scene;
    songs[songIdx] = { ...songs[songIdx], buttons };
    onProgramChange({ ...program, songs });
  };

  const editing = editIdx != null ? song.buttons[editIdx] : null;

  return (
    <div className="edit">
      <div className="grid">
        {song.buttons.map((scene, i) => (
          <button
            key={i}
            className={`cell cell--edit ${editIdx === i ? "cell--sel" : ""} ${
              scene ? "" : "cell--empty"
            }`}
            style={scene ? cellStyle(scene) : undefined}
            onClick={() => {
              if (!scene) setButton(i, makeDefaultScene(`シーン${i + 1}`));
              setEditIdx(i);
            }}
          >
            {scene ? (
              <>
                <span className="cell__label">{scene.label}</span>
                <span className="cell__meta">{metaLabel(scene)}</span>
              </>
            ) : (
              <span className="cell__empty">＋ 割当</span>
            )}
          </button>
        ))}
      </div>

      <div className="edit__side">
        {editIdx != null && editing ? (
          <SceneEditor
            scene={editing}
            onChange={(s) => setButton(editIdx, s)}
            onClear={() => {
              setButton(editIdx, null);
              setEditIdx(null);
            }}
          />
        ) : (
          <div className="edit__hint">
            ボタンをタップしてシーンを割り当て・編集します。
            <br />
            空きボタンをタップすると新規作成、既存はその場で編集できます。
          </div>
        )}
        <ProgramTools program={program} onProgramChange={onProgramChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SceneEditor({
  scene,
  onChange,
  onClear,
}: {
  scene: Scene;
  onChange: (s: Scene) => void;
  onClear: () => void;
}) {
  const up = (patch: Partial<Scene>) => onChange({ ...scene, ...patch });
  return (
    <div className="editor">
      <div className="editor__row">
        <label>ボタン名</label>
        <input
          value={scene.label}
          onChange={(e) => up({ label: e.target.value })}
          maxLength={20}
        />
      </div>

      <div className="editor__row">
        <label>パターン</label>
        <select
          value={scene.pattern}
          onChange={(e) => up({ pattern: e.target.value as Scene["pattern"] })}
        >
          {(Object.keys(PATTERN_LABELS) as Scene["pattern"][]).map((p) => (
            <option key={p} value={p}>
              {PATTERN_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {scene.pattern !== "blackout" && scene.pattern !== "rainbow" ? (
        <div className="editor__row">
          <label>{usesColor2(scene.pattern) ? "色1" : "色"}</label>
          <input
            type="color"
            value={scene.color}
            onChange={(e) => up({ color: e.target.value })}
          />
          <span className="editor__hex">{scene.color}</span>
        </div>
      ) : null}

      {usesColor2(scene.pattern) ? (
        <div className="editor__row">
          <label>色2</label>
          <input
            type="color"
            value={scene.color2 || "#000000"}
            onChange={(e) => up({ color2: e.target.value })}
          />
          <span className="editor__hex">{scene.color2}</span>
        </div>
      ) : null}

      {usesBpm(scene.pattern) ? (
        <>
          <div className="editor__row">
            <label>BPM</label>
            <input
              type="number"
              min={20}
              max={300}
              value={scene.bpm ?? 120}
              onChange={(e) => up({ bpm: Number(e.target.value) })}
            />
          </div>
          <div className="editor__row">
            <label>繰り返し</label>
            <input
              type="checkbox"
              checked={scene.repeat !== false}
              onChange={(e) => up({ repeat: e.target.checked })}
            />
            <span className="editor__hint2">
              オフ＝1回だけ鳴らして点灯保持
            </span>
          </div>
        </>
      ) : null}

      {usesText(scene.pattern) ? (
        <div className="editor__row">
          <label>表示文字</label>
          <input
            value={scene.text ?? ""}
            onChange={(e) => up({ text: e.target.value })}
            maxLength={12}
          />
        </div>
      ) : null}

      <div className="editor__preview">
        <LightStage scene={scene} at={Date.now()} fill />
      </div>

      <button className="editor__clear" onClick={onClear}>
        このボタンを空にする
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProgramTools({
  program,
  onProgramChange,
}: {
  program: ShowProgram;
  onProgramChange: (p: ShowProgram) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(program, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${program.showId}-program.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result)) as ShowProgram;
        if (!p.songs) throw new Error("invalid");
        onProgramChange(p);
        alert("読み込みました");
      } catch {
        alert("JSONの読み込みに失敗しました");
      }
    };
    reader.readAsText(f);
  };

  return (
    <div className="tools">
      <div className="tools__title">プログラム</div>
      <div className="tools__row">
        <button onClick={exportJson}>書き出し(JSON)</button>
        <button onClick={() => fileRef.current?.click()}>読み込み</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = "";
          }}
        />
      </div>
      <button
        className="tools__reset"
        onClick={() => {
          if (confirm("サンプル構成に戻します。よろしいですか？"))
            onProgramChange(defaultProgram());
        }}
      >
        サンプルに戻す
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
function JoinPanel() {
  const [qr, setQr] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const origin = window.location.origin;
    const params = new URLSearchParams(window.location.search);
    const show = params.get("show");
    const joinUrl = origin + "/" + (show ? `?show=${show}` : "");
    setUrl(joinUrl);
    QRCode.toDataURL(joinUrl, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, []);

  return (
    <div className="join">
      <div className="join__title">観客の参加用</div>
      {qr ? <img className="join__qr" src={qr} alt="参加用QR" /> : null}
      <div className="join__url">{url}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 表示ヘルパー
function metaLabel(scene: Scene): string {
  const base = PATTERN_LABELS[scene.pattern];
  if (usesBpm(scene.pattern)) {
    return `${base} ${scene.bpm ?? 120}${scene.repeat === false ? " 1回" : ""}`;
  }
  return base;
}

// ボタンの見た目にシーンの色をうっすら反映（視認性向上）
function cellStyle(scene: Scene): React.CSSProperties {
  if (scene.pattern === "blackout") {
    return { background: "#111", borderColor: "#333" };
  }
  if (scene.pattern === "gradient") {
    return {
      background: `linear-gradient(120deg, ${scene.color}, ${
        scene.color2 || scene.color
      })`,
    };
  }
  if (scene.pattern === "rainbow") {
    return {
      background:
        "linear-gradient(90deg, red, orange, yellow, green, blue, violet)",
    };
  }
  return { background: scene.color };
}
