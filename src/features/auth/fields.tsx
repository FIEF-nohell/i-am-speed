"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/TextInput";

type InputProps = Omit<ComponentProps<"input">, "id" | "className" | "children">;

interface FieldProps extends InputProps {
  label: string;
  error?: string;
  hint?: string;
}

/** Labelled input with an inline error. The error and hint are linked through aria-describedby. */
export function TextField({ label, error, hint, ...input }: FieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <TextInput {...input} id={id} invalid={Boolean(error)} aria-describedby={describedBy} />
      )}
    </Field>
  );
}

/** Password input with a show/hide toggle inside the box. */
export function PasswordField({ label, error, hint, ...input }: FieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <TextInput
          {...input}
          id={id}
          type={shown ? "text" : "password"}
          autoCapitalize="none"
          spellCheck={false}
          invalid={Boolean(error)}
          aria-describedby={describedBy}
          adornment={
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              aria-label={shown ? `hide ${label}` : `show ${label}`}
              aria-pressed={shown}
              onClick={() => setShown((s) => !s)}
            />
          }
        />
      )}
    </Field>
  );
}
