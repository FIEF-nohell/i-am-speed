import type { Metadata } from "next";
import { SignupView } from "@/features/auth/SignupView";

export const metadata: Metadata = {
  title: "create account",
  alternates: { canonical: "/signup/" },
  robots: { index: false },
};

export default function SignupPage() {
  return <SignupView />;
}
