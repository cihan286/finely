import styles from "./Footer.module.css";
import Link from "next/link";
import Logo from "../logo/Logo";
import {
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaGithub,
  FaYoutube,
} from "react-icons/fa6";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.topSection}>
        <div className={styles.brandSection}>
          <Link href="/" className={styles.brandLink}>
            <Logo />
          </Link>
          <p className={styles.description}>
            Making the world a better place through constructing elegant
            hierarchies.
          </p>
          <div className={styles.socialLinks}>
            <Link href="/" aria-label="Facebook">
              <FaFacebook size={20} />
            </Link>
            <Link href="/" aria-label="Instagram">
              <FaInstagram size={20} />
            </Link>
            <Link href="/" aria-label="X (Twitter)">
              <FaXTwitter size={20} />
            </Link>
            <Link href="/" aria-label="GitHub">
              <FaGithub size={20} />
            </Link>
            <Link href="/" aria-label="YouTube">
              <FaYoutube size={20} />
            </Link>
          </div>
        </div>

        <div className={styles.linksGrid}>
          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Solutions</span>
            <Link href="/" className={styles.link}>
              Marketing
            </Link>
            <Link href="/" className={styles.link}>
              Analytics
            </Link>
            <Link href="/" className={styles.link}>
              Automation
            </Link>
            <Link href="/" className={styles.link}>
              Commerce
            </Link>
            <Link href="/" className={styles.link}>
              Insights
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Support</span>
            <Link href="/" className={styles.link}>
              Submit ticket
            </Link>
            <Link href="/" className={styles.link}>
              Documentation
            </Link>
            <Link href="/" className={styles.link}>
              Guides
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Company</span>
            <Link href="/" className={styles.link}>
              About
            </Link>
            <Link href="/" className={styles.link}>
              Blog
            </Link>
            <Link href="/" className={styles.link}>
              Jobs
            </Link>
            <Link href="/" className={styles.link}>
              Press
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Legal</span>
            <Link href="/" className={styles.link}>
              Terms of service
            </Link>
            <Link href="/" className={styles.link}>
              Privacy policy
            </Link>
            <Link href="/" className={styles.link}>
              License
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.bottomSection}>
        <p>© {currentYear} Finely, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
