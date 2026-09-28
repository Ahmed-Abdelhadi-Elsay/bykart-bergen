"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "../landing.module.css";

type NavigationItem = {
  href: string;
  label: string;
};

export default function MobileNavigation({
  items,
}: {
  items: NavigationItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.mobileMenu}>
      <button
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "إغلاق قائمة التنقل" : "فتح قائمة التنقل"}
        className={styles.mobileMenuToggle}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span />
        <span />
      </button>
      <nav
        aria-label="التنقل الرئيسي على الهاتف"
        className={styles.mobileMenuPanel}
        hidden={!isOpen}
        id="mobile-navigation"
      >
        <Link
          aria-current="page"
          className={`${styles.mobileNavLink} ${styles.active}`}
          href="/"
          onClick={() => setIsOpen(false)}
        >
          الرئيسية
        </Link>
        {items.map((item) => (
          <Link
            className={styles.mobileNavLink}
            href={item.href}
            key={item.href}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className={styles.mobileNavCta}
          href="/map"
          onClick={() => setIsOpen(false)}
        >
          ابدأ رحلتك <span aria-hidden="true">←</span>
        </Link>
      </nav>
    </div>
  );
}
