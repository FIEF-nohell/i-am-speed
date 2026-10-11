import Link from "next/link";
import { SITE } from "@/config/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Link href="/about/">about and sources</Link>
      <a href={SITE.repository} rel="noreferrer">
        source
      </a>
      <span>stays in your browser unless you sign in</span>
    </footer>
  );
}
