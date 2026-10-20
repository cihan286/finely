// ─────────────────────────────────────────────────────────────────────────────
// Contact form
//
// In plain words: the form on the Contact page — your name, email address,
// company (optional) and message. Sending it emails us; a window then
// confirms it's on its way, and the form is emptied.
//
// For developers: a client component ("use client") for the submit. Sent with
// onSubmit + startTransition rather than <form action>, so what was typed
// stays in place when the server answers with an error. The "website" box is
// a trap for bots: hidden from people and screen readers.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, useRef, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Textarea } from "@/components/common/form/controls";
import { useActionNotice } from "@/components/common/notice/Notice";
import { submitContactMessage } from "@/app/(site)/contact/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { CONTACT_LIMITS } from "@/lib/contact";
import { useI18n } from "@/i18n/client";
import styles from "./ContactForm.module.css";

export default function ContactForm() {
  const t = useI18n().m.home.contactForm;
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await submitContactMessage(previous, formData);
      // Sent: emptied, so it isn't sent twice by accident
      if (!result.error) formRef.current?.reset();
      return result;
    },
    initialActionState,
  );
  useActionNotice(state);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form ref={formRef} className={styles.form} method="post" onSubmit={handleSubmit}>
      <div className={styles.row}>
        <Field label={t.name}>
          <Input name="name" autoComplete="name" maxLength={CONTACT_LIMITS.name} required />
        </Field>
        <Field label={t.workEmail}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email}
            required
          />
        </Field>
      </div>

      <Field label={t.company} optional>
        <Input name="company" autoComplete="organization" maxLength={CONTACT_LIMITS.company} />
      </Field>

      <Field label={t.message}>
        <Textarea name="message" rows={6} maxLength={CONTACT_LIMITS.message} required />
      </Field>

      <div className={styles.trap} aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          text={pending ? t.sending : t.send}
          disabled={pending}
        />
      </div>
    </form>
  );
}
