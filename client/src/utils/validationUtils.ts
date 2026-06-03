const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailRequired(value: string | null | undefined): boolean {
  return !String(value ?? "").trim();
}

export function isEmailFormatValid(value: string | null | undefined): boolean {
  return EMAIL_REGEX.test(String(value ?? "").trim());
}

export type EmailValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateEmail(
  value: string | null | undefined,
): EmailValidationResult {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: "이메일을 입력해주세요." };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: "올바른 이메일 형식을 입력해주세요." };
  }
  return { valid: true };
}
