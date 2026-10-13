// ─────────────────────────────────────────────────────────────────────────────
// Linked banks (Settings)
//
// In plain words: where owners and admins link the company's bank, so its
// transactions arrive by themselves instead of through CSV files. "Connect a
// bank" opens a window from Plaid, the service that talks to banks: you pick
// your bank and log in there (Finely never sees that login). Each linked
// bank shows when it was last brought up to date, with buttons to sync it
// now or disconnect it.
//
// For developers: a client component ("use client"). Plaid's window ("Link")
// is a script from Plaid's own address, loaded only when the button is
// pressed. The server makes a one-time token for it (createBankLink); what
// the window hands back goes to the server (completeBankLink), which stores
// the bank's key encrypted. Nothing secret reaches this component. Everything
// is checked again on the server; canManage only hides the buttons.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useTransition } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import Spinner from "@/components/common/spinner/Spinner";
import {
  completeBankLink,
  createBankLink,
  removeBankConnection,
  syncBank,
} from "@/app/dashboard/settings/actions";
import type { ActionState } from "@/lib/action-state";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import styles from "./BankConnections.module.css";

const PLAID_SCRIPT = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

// The part of Plaid's script we use
interface PlaidLink {
  create(options: {
    token: string;
    onSuccess: (publicToken: string, metadata: { institution?: { name?: string } | null }) => void;
    onExit: () => void;
  }): { open: () => void };
}
declare global {
  interface Window {
    Plaid?: PlaidLink;
  }
}

// Loads Plaid's script once, when it's first needed
function loadPlaid(): Promise<PlaidLink> {
  return new Promise((resolve, reject) => {
    if (window.Plaid) return resolve(window.Plaid);
    const script = document.createElement("script");
    script.src = PLAID_SCRIPT;
    script.onload = () => (window.Plaid ? resolve(window.Plaid) : reject());
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

export interface BankConnectionRow {
  id: string;
  institutionName: string;
  accountCount: number;
  /** When it was last brought up to date, as text; null if never */
  lastSynced: string | null;
  /** Why the last sync failed; null when it worked */
  lastError: string | null;
}

interface BankConnectionsProps {
  /** Whether you may link and unlink banks (owners and admins) */
  canManage: boolean;
  connections: BankConnectionRow[];
}

export default function BankConnections({ canManage, connections }: BankConnectionsProps) {
  const [message, setMessage] = useState<ActionState | null>(null);
  // What is in progress: "connect", or a connection's ID with what's done to it
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Runs a server action and shows its answer
  const run = (key: string, action: () => Promise<ActionState>) => {
    setBusy(key);
    setMessage(null);
    startTransition(async () => {
      setMessage(await action());
      setBusy(null);
    });
  };

  const handleConnect = async () => {
    setBusy("connect");
    setMessage(null);
    const link = await createBankLink();
    if (!link.token) {
      setMessage({ error: link.error });
      setBusy(null);
      return;
    }
    let plaid;
    try {
      plaid = await loadPlaid();
    } catch {
      setMessage({ error: "The bank window couldn't be loaded. Check your connection and try again." });
      setBusy(null);
      return;
    }
    plaid
      .create({
        token: link.token,
        onSuccess: (publicToken, metadata) =>
          run("connect", () => completeBankLink(publicToken, metadata.institution?.name ?? "")),
        // Closed without linking: nothing happened
        onExit: () => setBusy(null),
      })
      .open();
  };

  const handleDisconnect = (connection: BankConnectionRow) => {
    if (
      !window.confirm(
        `Disconnect ${connection.institutionName}? Its accounts and transactions stay in Finely, but new ones will no longer arrive by themselves.`,
      )
    ) {
      return;
    }
    run(`disconnect-${connection.id}`, () => removeBankConnection(connection.id));
  };

  return (
    <div className={shared.stack} id="banks">
      {message && (message.error || message.success) && (
        <Message type={message.error ? "error" : "success"}>
          {message.error ?? message.success}
        </Message>
      )}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            Linked banks <span className={shared.count}>{connections.length}</span>
          </h2>
          <p className={shared.cardHint}>
            Link your bank and its transactions arrive by themselves, once a
            day. You log in at your bank in a window from Plaid; Finely never
            sees your bank login and can&apos;t move money.
          </p>
        </div>

        {connections.length > 0 && (
          <ul className={`${shared.list} ${styles.list}`}>
            {connections.map((connection) => (
              <li key={connection.id} className={shared.row}>
                <div className={`${shared.avatar} ${shared.avatarMuted}`} aria-hidden="true">
                  <Landmark size={16} />
                </div>
                <div className={shared.who}>
                  <span className={shared.name}>{connection.institutionName}</span>
                  <span className={connection.lastError ? styles.error : shared.email}>
                    {connection.lastError ??
                      `${connection.accountCount} ${connection.accountCount === 1 ? "account" : "accounts"} · ${
                        connection.lastSynced
                          ? `up to date as of ${connection.lastSynced}`
                          : "not synced yet"
                      }`}
                  </span>
                </div>
                {canManage && (
                  <>
                    <button
                      type="button"
                      className={`${shared.rowAction} ${styles.sync}`}
                      onClick={() => run(`sync-${connection.id}`, () => syncBank(connection.id))}
                      disabled={busy !== null}
                    >
                      {busy === `sync-${connection.id}` ? (
                        <>
                          <Spinner size={12} /> Syncing
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} /> Sync now
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className={shared.rowAction}
                      onClick={() => handleDisconnect(connection)}
                      disabled={busy !== null}
                    >
                      {busy === `disconnect-${connection.id}` ? (
                        <>
                          <Spinner size={12} /> Disconnecting
                        </>
                      ) : (
                        "Disconnect"
                      )}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            text={busy === "connect" ? "Connecting" : "Connect a bank"}
            icon={<Landmark size={16} />}
            loading={busy === "connect"}
            action={handleConnect}
            disabled={busy !== null}
          />
        ) : (
          connections.length === 0 && (
            <p className={styles.note}>
              Only owners and admins can link a bank.
            </p>
          )
        )}
      </section>
    </div>
  );
}
