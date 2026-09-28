import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import MobileNavigation from "@/components/MobileNavigation";
import styles from "./landing.module.css";

const navigation = [
  { href: "#routes", label: "خطوط النقل" },
  { href: "/map", label: "الخريطة الحية" },
  { href: "#fares", label: "الأسعار" },
  { href: "#help", label: "المساعدة" },
];

function RouteIllustration() {
  return (
    <div
      aria-label="رسم توضيحي لمسارات النقل في المدينة"
      className={styles.routeVisual}
      role="img"
    >
      <div className={styles.mapGrid} />
      <span className={`${styles.mapLabel} ${styles.mapLabelTop}`}>
        محطة الجامعة
      </span>
      <span className={`${styles.mapLabel} ${styles.mapLabelBottom}`}>
        وسط بيرغن
      </span>
      <svg
        aria-hidden="true"
        className={styles.routeLines}
        fill="none"
        viewBox="0 0 520 390"
      >
        <path
          className={styles.primaryRoute}
          d="M115 72c37 3 54 44 87 54 27 8 57-5 78 12 25 20 16 55 37 77 24 25 71 16 87 45 11 20 1 43 14 62"
          pathLength="1"
          stroke="#0E8A68"
          strokeLinecap="round"
          strokeWidth="8"
        />
        <path
          className={styles.routeTraveler}
          d="M115 72c37 3 54 44 87 54 27 8 57-5 78 12 25 20 16 55 37 77 24 25 71 16 87 45 11 20 1 43 14 62"
          pathLength="1"
          stroke="#B9F3DF"
          strokeDasharray="0.018 0.982"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          className={styles.secondaryRoute}
          d="M82 267c40-28 66-51 103-54 42-4 59 39 100 37 40-2 50-45 89-48 36-2 63 30 96 28"
          pathLength="1"
          stroke="#E7A158"
          strokeLinecap="round"
          strokeWidth="7"
        />
        <path
          className={styles.routeTravelerSecondary}
          d="M82 267c40-28 66-51 103-54 42-4 59 39 100 37 40-2 50-45 89-48 36-2 63 30 96 28"
          pathLength="1"
          stroke="#FFF1DC"
          strokeDasharray="0.018 0.982"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <circle className={styles.stationRipple} cx="115" cy="72" r="13" style={{ animationDelay: "0s" }} />
        <circle className={styles.stationRipple} cx="280" cy="138" r="13" style={{ animationDelay: "0.55s" }} />
        <circle className={styles.stationRipple} cx="404" cy="260" r="13" style={{ animationDelay: "1.1s" }} />
        <circle className={styles.stationRipple} cx="418" cy="322" r="13" style={{ animationDelay: "1.65s" }} />
        <circle className={styles.stationRippleSecondary} cx="82" cy="267" r="12" style={{ animationDelay: "0.2s" }} />
        <circle className={styles.stationRippleSecondary} cx="285" cy="250" r="12" style={{ animationDelay: "0.75s" }} />
        <circle className={styles.stationRippleSecondary} cx="470" cy="230" r="12" style={{ animationDelay: "1.3s" }} />
        <circle cx="115" cy="72" r="8" fill="white" stroke="#0E8A68" strokeWidth="5" />
        <circle cx="280" cy="138" r="8" fill="white" stroke="#0E8A68" strokeWidth="5" />
        <circle cx="404" cy="260" r="8" fill="white" stroke="#0E8A68" strokeWidth="5" />
        <circle cx="418" cy="322" r="8" fill="white" stroke="#0E8A68" strokeWidth="5" />
        <circle cx="82" cy="267" r="7" fill="white" stroke="#E7A158" strokeWidth="4" />
        <circle cx="285" cy="250" r="7" fill="white" stroke="#E7A158" strokeWidth="4" />
        <circle cx="470" cy="230" r="7" fill="white" stroke="#E7A158" strokeWidth="4" />
      </svg>
      <div className={styles.mapCard}>
        <span aria-hidden="true" className={styles.mapCardIcon}>
          ↗
        </span>
        <span className={styles.mapCardText}>
          <strong>خريطة بيرغن</strong>
          <small>الحافلات والسفن والمرور</small>
        </span>
        <span aria-hidden="true" className={styles.mapCardBadge}>
          مباشر
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className={styles.landing}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <Link aria-label="الصفحة الرئيسية" className={styles.brand} href="/">
            <BrandMark />
          </Link>

          <nav aria-label="التنقل الرئيسي" className={styles.primaryNav}>
            <Link aria-current="page" className={`${styles.navLink} ${styles.active}`} href="/">
              الرئيسية
            </Link>
            {navigation.map((item) => (
              <Link className={styles.navLink} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <Link className={styles.headerCta} href="/map">
            ابدأ رحلتك <span aria-hidden="true">←</span>
          </Link>

          <MobileNavigation items={navigation} />
        </div>
      </header>

      <main className={styles.page}>
        <section aria-labelledby="hero-title" className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.eyebrowDot} />
              خريطة النقل الحية في بيرغن
            </p>
            <h1 className={styles.heroTitle} id="hero-title">
              تنقّل في مدينتك
              <br />
              <span>بكل سهولة.</span>
            </h1>
            <p className={styles.heroDescription}>
              تابع الحافلات والسفن وحالة الطرق على خريطة واحدة، واكتشف خيارات
              تنقلك في بيرغن من مكانك.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.buttonPrimary} href="/map">
                ابدأ رحلتك <span aria-hidden="true">←</span>
              </Link>
              <Link className={styles.textLink} href="#routes">
                اكتشف خطوط النقل <span aria-hidden="true">←</span>
              </Link>
            </div>
            <div className={styles.trustNote}>
              <span aria-hidden="true" className={styles.liveIndicator} />
              بيانات النقل والمرور في مكان واحد
            </div>
          </div>
          <RouteIllustration />
        </section>

        <section
          aria-label="خدمات بايكارت"
          className={styles.featureStrip}
          id="routes"
        >
          <Link className={styles.feature} href="/map">
            <span aria-hidden="true" className={styles.featureIcon}>
              ↗
            </span>
            <span>
              <strong>خريطة تفاعلية</strong>
              <small>كل تحركات المدينة في عرض واحد.</small>
            </span>
          </Link>
          <Link className={styles.feature} href="/map">
            <span aria-hidden="true" className={styles.featureIcon}>
              ⌖
            </span>
            <span>
              <strong>تابع وسائل النقل</strong>
              <small>الحافلات والسفن ومواقعها.</small>
            </span>
          </Link>
          <Link className={styles.feature} href="/map">
            <span aria-hidden="true" className={styles.featureIcon}>
              ◷
            </span>
            <span id="fares">
              <strong>خطّط تنقّلك</strong>
              <small>استكشف الخيارات والخدمات المتاحة.</small>
            </span>
          </Link>
          <Link className={styles.feature} href="/map">
            <span aria-hidden="true" className={styles.featureIcon}>
              ؟
            </span>
            <span id="help">
              <strong>كل شيء في مكان واحد</strong>
              <small>ابدأ من الخريطة واستكشف بيرغن.</small>
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
