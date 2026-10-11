import type { Metadata } from "next";
import { AccountView } from "@/features/auth/AccountView";

export const metadata: Metadata = {
  title: "account",
  alternates: { canonical: "/account/" },
  robots: { index: false },
};

export default function AccountPage() {
  return <AccountView />;
}
