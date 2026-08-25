"use client";

import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import { useId, useRef, useState } from "react";
import Script from "next/script";
import { LIMITS, type ValidationIssue } from "@/lib/validation/contact";
import { Button, Callout, cx } from "@/components/ui";

/**
 * Contact form.
 *
 * Rendered only when the server has confirmed a submission mode is configured.
 * When nothing is configured the page shows an explanation instead — a form
 * that accepts a message and silently discards it would be worse than no form.
 *
 * Client-side validation is a convenience for the reader. The server validates
 * everything again regardless, and the server is the authority.
 */
export function ContactForm({ turnstileSiteKey,
  words,
}: { turnstileSiteKey: string | null;
  readonly words: LocaleWords;
}) {
  const t = translatorFor(words);
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [issues, setIssues] = useState<readonly ValidationIssue[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();

  const issueFor = (field: string) => issues.find((issue) => issue.field === field)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setIssues([]);
    setErrorMessage(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      subject: String(data.get("subject") ?? ""),
      message: String(data.get("message") ?? ""),
      website: String(data.get("website") ?? ""),
      turnstileToken: String(data.get("cf-turnstile-response") ?? ""),
    };

    try {
      const response = await fetch("/api/contact/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        issues?: ValidationIssue[];
        error?: { message: string };
      };

      if (response.ok && body.ok) {
        setStatus("sent");
        formRef.current?.reset();
        return;
      }

      if (body.issues) setIssues(body.issues);
      setErrorMessage(body.error?.message ?? "The message could not be sent.");
      setStatus("error");
    } catch {
      setStatus("error");
      setErrorMessage(
        t("contact.form.networkFailed"),
      );
    }
  }

  if (status === "sent") {
    return (
      <Callout tone="success" title={t("contact.form.receivedTitle")}>{t("contact.form.body.intro.p1")}</Callout>
    );
  }

  return (
    <>
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
      ) : null}

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {errorMessage ? (
          <div role="alert">
            <Callout tone="danger" title={t("contact.form.couldNotSendTitle")}>
              {errorMessage}
            </Callout>
          </div>
        ) : null}

        <Field
          id={`${formId}-name`}
          name="name"
          label={t("contact.form.name")}
          autoComplete="name"
          maxLength={LIMITS.name.max}
          error={issueFor("name")}
          required
        />
        <Field
          id={`${formId}-email`}
          name="email"
          type="email"
          label={t("contact.form.email")}
          autoComplete="email"
          maxLength={LIMITS.email.max}
          error={issueFor("email")}
          hint={t("contact.form.emailHint")}
          required
        />
        <Field
          id={`${formId}-subject`}
          name="subject"
          label={t("contact.form.subject")}
          maxLength={LIMITS.subject.max}
          error={issueFor("subject")}
          required
        />
        <Field
          id={`${formId}-message`}
          name="message"
          label={t("contact.form.message")}
          multiline
          maxLength={LIMITS.message.max}
          error={issueFor("message")}
          hint={t("contact.form.messageHint", { min: String(LIMITS.message.min) })}
          required
        />

        {/*
          Honeypot. Hidden from sight and from assistive technology, and taken
          out of the tab order — a person will never encounter it, while a bot
          filling every field will.
        */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${formId}-website`}>{t("contact.form.honeypot")}</label>
          <input
            id={`${formId}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {turnstileSiteKey ? (
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-action="contact"
            data-theme="auto"
          />
        ) : null}

        {issueFor("form") ? (
          <p role="alert" className="text-sm font-medium text-(--color-danger)">
            {issueFor("form")}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Sending…" : "Send message"}
          </Button>
        </div>

        <p aria-live="polite" className="sr-only">
          {status === "submitting" ? "Sending your message." : ""}
        </p>
      </form>
    </>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  multiline = false,
  error,
  hint,
  required = false,
  maxLength,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  error?: string | undefined;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  const shared = {
    id,
    name,
    required,
    maxLength,
    autoComplete,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": describedBy || undefined,
    className: cx(
      "control mt-1.5 w-full rounded-(--radius-control) border bg-(--color-surface) px-3 py-2.5 text-(--color-text)",
      multiline ? "min-h-[9rem]" : "min-h-[48px]",
      error ? "border-(--color-danger)" : "border-(--color-border-strong)",
    ),
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-(--color-text)">
        {label}
        {required ? (
          <span className="ml-1 text-(--color-danger)" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>
      {multiline ? <textarea {...shared} /> : <input type={type} {...shared} />}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-(--color-text-muted)">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-(--color-danger)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
