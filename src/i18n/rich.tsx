// ─────────────────────────────────────────────────────────────────────────────
// Languages: sentences with a link or bold words inside
//
// In plain words: some sentences have a link or a few bold words in the
// middle ("See our <privacy>Privacy policy</privacy>."), and where they
// fall differs between English and Turkish. The words mark those parts with
// tags, and this fills each tag in with the real link or bold text.
//
// For developers: rich("Read the <b>terms</b>", { b: (text) => <strong>{text}</strong> }).
// Tags can't be nested. Works in server and client components (no hooks).
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, type ReactNode } from "react";

type Tags = Record<string, (text: string) => ReactNode>;

/** Bold text, the most common tag */
export const bold = { b: (text: string) => <strong>{text}</strong> };

export function rich(text: string, tags: Tags): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, tag, inner] = match;
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[tag];
    parts.push(<Fragment key={match.index}>{render ? render(inner) : inner}</Fragment>);
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
