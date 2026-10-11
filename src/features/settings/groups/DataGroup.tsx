"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Row } from "@/components/ui/Row";
import { signOut } from "@/features/auth/session";
import { exportJson, importJson, resetAll } from "@/features/storage/store";
import styles from "./groups.module.css";

type Message = { text: string; error?: boolean };

function download(): void {
  const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `i-am-speed-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataGroup({ signedIn }: { signedIn: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [confirming, setConfirming] = useState(false);

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const err = importJson(await file.text());
    setMessage(
      err
        ? { text: err, error: true }
        : {
            text: signedIn
              ? "Imported. Your data was replaced and is merged into your account."
              : "Imported. Your data was replaced.",
          },
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const reset = async (): Promise<void> => {
    setConfirming(false);
    if (signedIn) await signOut();
    resetAll();
    setMessage({ text: "All data deleted." });
  };

  return (
    <Panel
      id="data"
      title="your data"
      description={
        signedIn
          ? "Synced to your account."
          : "Stored in this browser. Sign in on the account page to sync across devices."
      }
      className={styles.panel}
    >
      {message && (
        <Notice tone={message.error ? "error" : "neutral"} className={styles.notice}>
          {message.text}
        </Notice>
      )}
      <Row label="export" hint="Everything as one json file.">
        <Button variant="secondary" size="sm" icon={<Download />} onClick={download}>
          download json
        </Button>
      </Row>
      <Row
        label="import"
        hint={
          signedIn
            ? "Replaces what is stored here. Merged into your account."
            : "Replaces everything currently stored."
        }
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload />}
          onClick={() => fileRef.current?.click()}
        >
          choose file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="import data file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </Row>
      <div className={styles.danger} role="group" aria-label="danger zone">
        <Row
          label="reset all data"
          hint={
            signedIn
              ? "Signs you out and clears this device only. Your account keeps its data."
              : "Deletes lesson progress, stats and settings."
          }
          stack="narrow"
        >
          {confirming ? (
            <span className={styles.inline}>
              <Button
                variant="danger"
                solid
                size="sm"
                icon={<Trash2 />}
                onClick={() => void reset()}
              >
                yes, delete everything
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                cancel
              </Button>
            </span>
          ) : (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 />}
              onClick={() => setConfirming(true)}
            >
              reset all data
            </Button>
          )}
        </Row>
      </div>
    </Panel>
  );
}
