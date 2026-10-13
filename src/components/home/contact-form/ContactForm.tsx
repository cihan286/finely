// ─────────────────────────────────────────────────────────────────────────────
// Contact form
//
// In plain words: the form on the Contact page — your name, email address,
// company (optional) and message. Sending it emails us; a note then confirms
// it's on its way.
//
// For developers: a client component ("use client") for the submit. Sent with
// onSubmit + startTransition rather than <form action>, so what was typed
// stays in place when the server answers with an error. The "website" box is
// a trap for bots: hidden from people and screen readers.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Textarea } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitContactMessage } from "@/app/(site)/contact/actions";
import { initialActionState } from "@/lib/action-state";
import { CONTACT_LIMITS } from "@/lib/contact";
import styles from "./ContactForm.module.css";

export default function ContactForm() {
  const [state, dispatch, pending] = useActionState(
    submitContactMessage,
    initialActionState,
  );

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  // Sent: the note replaces the form, so it can't be sent twice by accident
  if (state.success) return <Message type="success">{state.success}</Message>;

  return (
    <form className={styles.form} method="post" onSubmit={handleSubmit}>
      {state.error && <Message type="error">{state.error}</Message>}

      <div className={styles.row}>
        <Field label="Name">
          <Input name="name" autoComplete="name" maxLength={CONTACT_LIMITS.name} required />
        </Field>
        <Field label="Work email">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email}
            required
          />
        </Field>
      </div>

      <Field label="Company" optional>
        <Input name="company" autoComplete="organization" maxLength={CONTACT_LIMITS.company} />
      </Field>

      <Field label="How can we help?">
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
          text={pending ? "Sending" : "Send message"}
          disabled={pending}
        />
      </div>
    </form>
  );
}
