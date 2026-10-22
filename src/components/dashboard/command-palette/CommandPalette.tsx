// ─────────────────────────────────────────────────────────────────────────────
// The Ctrl+K window ("Go to")
//
// In plain words: press Ctrl+K (⌘K on a Mac) anywhere in the dashboard and
// a window opens to jump straight to a page, a part of Settings, or an
// action such as "Add a transaction". Type a few letters to narrow it
// down, choose with the arrow keys and press Enter. Only what your role
// allows is offered.
//
// For developers: a client component, mounted once by dashboard/layout.tsx.
// A native <dialog> opened with showModal() (focus stays inside, Escape
// closes it). The box and the list follow the ARIA combobox pattern: focus
// stays in the box and aria-activedescendant points at the chosen option.
// What's offered and how it's found is in commands.ts.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import {
  buildCommands,
  findCommands,
  type CommandGroup,
  type CommandPermissions,
} from "./commands";
import styles from "./CommandPalette.module.css";

const GROUPS: CommandGroup[] = ["pages", "settings", "actions"];

export default function CommandPalette(permissions: CommandPermissions) {
  const [open, setOpen] = useState(false);

  // Ctrl+K (⌘K) opens it, from anywhere on the page
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return open ? <PaletteWindow {...permissions} onClose={() => setOpen(false)} /> : null;
}

function PaletteWindow({
  onClose,
  ...permissions
}: CommandPermissions & { onClose: () => void }) {
  const { m } = useI18n();
  const t = m.shell.palette;
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(0);

  const { canRecord, canManage, canSeeActivity } = permissions;
  const commands = useMemo(
    () => buildCommands({ canRecord, canManage, canSeeActivity }, m.shell),
    [canRecord, canManage, canSeeActivity, m.shell],
  );
  const found = findCommands(commands, query);
  // The list as shown: grouped, so the arrow keys follow what's on screen
  const shown = GROUPS.flatMap((group) => found.filter((c) => c.group === group));
  const active = shown[Math.min(chosen, shown.length - 1)];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Keep the chosen option in view while moving through a long list
  useEffect(() => {
    if (!active) return;
    document.getElementById(`${listId}-${active.id}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const go = (href: string) => {
    dialogRef.current?.close();
    router.push(href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setChosen((current) => {
        const from = Math.min(current, shown.length - 1);
        return (from + step + shown.length) % shown.length;
      });
    } else if (e.key === "Enter" && active) {
      e.preventDefault();
      go(active.href);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      // A click on the dimmed area outside closes it
      onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      aria-label={t.title}
    >
      <div className={styles.searchRow}>
        <Search size={18} aria-hidden="true" className={styles.searchIcon} />
        <input
          className={styles.input}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          aria-label={t.title}
          placeholder={t.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(0);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div id={listId} role="listbox" aria-label={t.title} className={styles.list}>
        {shown.length === 0 && (
          <p className={styles.empty} role="status">
            {fill(t.noResults, { query: query.trim() })}
          </p>
        )}
        {GROUPS.map((group) => {
          const items = shown.filter((c) => c.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} role="group" aria-labelledby={`${listId}-${group}`}>
              <div id={`${listId}-${group}`} className={styles.groupTitle} aria-hidden="true">
                {t.groups[group]}
              </div>
              {items.map((command) => (
                <div
                  key={command.id}
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={command === active}
                  className={`${styles.option} ${command === active ? styles.active : ""}`}
                  // Keep focus in the box: choosing with the mouse shouldn't move it
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => setChosen(shown.indexOf(command))}
                  onClick={() => go(command.href)}
                >
                  {command.label}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className={styles.hint} aria-hidden="true">
        {t.hint}
      </p>
    </dialog>
  );
}
