export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface PasswordRule {
  id: "length" | "not-email";
  label: string;
  met: boolean;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** Live checklist for the signup hint. Every rule must be met to submit. */
export function passwordRules(password: string, email = ""): PasswordRule[] {
  const mail = email.trim().toLowerCase();
  return [
    {
      id: "length",
      label: `at least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "not-email",
      label: "not the same as your email",
      met: password.length === 0 || mail === "" || password.toLowerCase() !== mail,
    },
  ];
}

export function passwordProblem(password: string, email = ""): string | null {
  if (password.length === 0) return "Enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!passwordRules(password, email).every((r) => r.met)) {
    return "Pick a password that is different from your email.";
  }
  return null;
}

export function emailProblem(email: string): string | null {
  if (email.trim() === "") return "Enter your email.";
  if (!isValidEmail(email)) return "That does not look like a valid email address.";
  return null;
}

export function confirmProblem(password: string, confirm: string): string | null {
  if (confirm === "") return "Repeat your password.";
  if (password !== confirm) return "The two passwords do not match.";
  return null;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateSignup(input: {
  email: string;
  password: string;
  confirm: string;
}): FieldErrors<"email" | "password" | "confirm"> {
  const errors: FieldErrors<"email" | "password" | "confirm"> = {};
  const email = emailProblem(input.email);
  const password = passwordProblem(input.password, input.email);
  const confirm = confirmProblem(input.password, input.confirm);
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (confirm) errors.confirm = confirm;
  return errors;
}

export function validateLogin(input: {
  email: string;
  password: string;
}): FieldErrors<"email" | "password"> {
  const errors: FieldErrors<"email" | "password"> = {};
  const email = emailProblem(input.email);
  if (email) errors.email = email;
  if (input.password === "") errors.password = "Enter your password.";
  return errors;
}

export function validatePasswordChange(input: {
  current: string;
  next: string;
  confirm: string;
}): FieldErrors<"current" | "next" | "confirm"> {
  const errors: FieldErrors<"current" | "next" | "confirm"> = {};
  if (input.current === "") errors.current = "Enter your current password.";
  const next = passwordProblem(input.next);
  if (next) errors.next = next;
  else if (input.next === input.current) errors.next = "Pick a password you have not used here.";
  const confirm = confirmProblem(input.next, input.confirm);
  if (confirm) errors.confirm = confirm;
  return errors;
}
