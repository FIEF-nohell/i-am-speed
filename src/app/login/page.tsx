import type { Metadata } from "next";
import { LoginView } from "@/features/auth/LoginView";

export const metadata: Metadata = {
  title: "sign in",
  alternates: { canonical: "/login/" },
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginView />;
}
