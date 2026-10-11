import Link from "next/link";
import { Mark } from "@/components/icons/Mark";
import { SITE } from "@/config/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={`site-chrome ${styles.footer}`}>
      <div className={styles.inner}>
        <p className={styles.note}>
          <Mark size={14} />
          <span>stays in your browser unless you sign in</span>
        </p>
        <nav aria-label="footer" className={styles.links}>
          <Link href="/about/">about</Link>
          <Link href="/about/#privacy">privacy</Link>
          <a href={SITE.repository} rel="noreferrer">
            source
          </a>
        </nav>
      </div>
    </footer>
  );
}
