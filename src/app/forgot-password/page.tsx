import type { Metadata } from "next";
import { ForgotPasswordView } from "@/features/auth/ForgotPasswordView";

export const metadata: Metadata = {
  title: "reset password",
  alternates: { canonical: "/forgot-password/" },
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
