"use client";

// Web MIDI API を使ってマスターを外部コントローラーから操作する。
// - Program Change (PC) → 曲の切替
// - Control Change (CC) → シーンボタンの発火
// Chrome/Edge など対応ブラウザ＋HTTPS(またはlocalhost)が必要。Safariは非対応。

import { useCallback, useEffect, useRef, useState } from "react";

export interface MidiHandlers {
  onProgram: (program: number) => void; // Program Change の番号
  onControl: (cc: number, value: number) => void; // CC番号と値(0-127)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useMidi(handlers: MidiHandlers) {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [inputs, setInputs] = useState<string[]>([]);
  const [last, setLast] = useState<string>("");
  const [error, setError] = useState<string>("");
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (typeof navigator === "undefined" || !(navigator as any).requestMIDIAccess) {
      setSupported(false);
    }
  }, []);

  const enable = useCallback(() => setEnabled(true), []);

  useEffect(() => {
    if (!enabled) return;
    const nav = navigator as any;
    if (!nav.requestMIDIAccess) {
      setSupported(false);
      setError("このブラウザは Web MIDI に非対応です（Chrome / Edge を使ってください）");
      return;
    }

    let access: any;
    let cancelled = false;

    const onMsg = (e: any) => {
      const [status, d1, d2] = e.data as Uint8Array;
      const type = status & 0xf0;
      if (type === 0xc0) {
        setLast(`PC ${d1}`);
        handlersRef.current.onProgram(d1);
      } else if (type === 0xb0) {
        setLast(`CC ${d1} = ${d2}`);
        handlersRef.current.onControl(d1, d2);
      }
    };

    const attach = (a: any) => {
      const names: string[] = [];
      a.inputs.forEach((inp: any) => {
        inp.onmidimessage = onMsg;
        names.push(inp.name);
      });
      setInputs(names);
    };

    nav
      .requestMIDIAccess()
      .then((a: any) => {
        if (cancelled) return;
        access = a;
        attach(a);
        a.onstatechange = () => attach(a);
      })
      .catch((err: any) => setError(err?.message || "MIDI接続に失敗しました"));

    return () => {
      cancelled = true;
      if (access) access.inputs.forEach((inp: any) => (inp.onmidimessage = null));
    };
  }, [enabled]);

  return { enabled, enable, supported, inputs, last, error };
}
