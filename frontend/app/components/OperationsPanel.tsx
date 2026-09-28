"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BusFront, Check, Clock3, MapPin, Route, Ship, Ticket, Trash2, X } from "lucide-react";

import type { DemoBooking, FeedResponse } from "@/lib/types";

type OperationsPanelProps = {
  feed: FeedResponse;
  bookings: DemoBooking[];
  initialTab: Tab;
  bookingVehicle: { name: string; kind: "bus" | "ship" } | null;
  storageError: string | null;
  onBookingCreated: (booking: DemoBooking) => void;
  onBookingDeleted: (reference: string) => boolean;
  onClose: () => void;
};

type Stop = {
  name: string;
  lat: number;
  lon: number;
};

const STOPS: Stop[] = [
  { name: "وسط بيرغن", lat: 60.39299, lon: 5.32415 },
  { name: "بريغن", lat: 60.3972, lon: 5.3244 },
  { name: "محطة حافلات بيرغن", lat: 60.387, lon: 5.333 },
  { name: "مطار فليسلاند", lat: 60.2934, lon: 5.2181 },
  { name: "محطة أوسانه", lat: 60.464, lon: 5.325 },
  { name: "محطة لاجونن", lat: 60.297, lon: 5.325 },
  { name: "فيلينغسدالن", lat: 60.362, lon: 5.286 },
];

type Tab = "plan" | "tickets" | "dispatch" | "forecast";

function distanceKm(from: Stop, to: Stop): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lonDelta = radians(to.lon - from.lon);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bergenHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Oslo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );
}

function arabicWeatherDescription(description: string): string {
  const normalized = description.trim().toLowerCase();
  const labels: Record<string, string> = {
    rain: "ممطر",
    regn: "ممطر",
    lightrain: "أمطار خفيفة",
    heavyrain: "أمطار غزيرة",
    snow: "ثلوج",
    snøvær: "ثلوج",
    wind: "رياح",
    vind: "رياح",
    cloudy: "غائم",
    skyet: "غائم",
    fog: "ضباب",
    tåke: "ضباب",
    clearsky: "سماء صافية",
    klart: "سماء صافية",
    "delvis skyet": "غائم جزئيًا",
  };
  return labels[normalized] ?? description;
}

function forecastScore(feed: FeedResponse, minutesAhead: number, dispatchApplied: boolean): number {
  const hour = bergenHour();
  const peak = hour >= 7 && hour < 10 ? 24 : hour >= 15 && hour < 18 ? 29 : 8;
  const sensorAdjustment = Math.min(feed.traffic.length, 40) * 0.35;
  const weatherAdjustment = /rain|snow|wind|regn|snø|vind/i.test(feed.weather.description) ? 8 : 0;
  const dailyWave = Math.sin((hour + minutesAhead / 60 - 8) * Math.PI / 12) * 6;
  const dispatchRelief = dispatchApplied ? 9 : 0;
  return Math.max(8, Math.min(92, Math.round(30 + peak + sensorAdjustment + weatherAdjustment + dailyWave - dispatchRelief)));
}

export default function OperationsPanel({
  feed,
  bookings,
  initialTab,
  bookingVehicle,
  storageError,
  onBookingCreated,
  onBookingDeleted,
  onClose,
}: OperationsPanelProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [fromName, setFromName] = useState(STOPS[0].name);
  const [toName, setToName] = useState(STOPS[3].name);
  const [passengers, setPassengers] = useState(1);
  const [travelerName, setTravelerName] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<DemoBooking | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(Boolean(bookingVehicle));
  const [bookingError, setBookingError] = useState("");
  const [dispatchApplied, setDispatchApplied] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const from = STOPS.find((stop) => stop.name === fromName) ?? STOPS[0];
  const to = STOPS.find((stop) => stop.name === toName) ?? STOPS[3];
  const trip = useMemo(() => {
    const km = distanceKm(from, to) * 1.25;
    return {
      km,
      fastestMinutes: Math.max(9, Math.round((km / 26) * 60 + 7)),
      regularMinutes: Math.max(12, Math.round((km / 21) * 60 + 5)),
      fare: Math.max(42, Math.ceil(km / 10) * 42),
    };
  }, [from, to]);

  const createBooking = () => {
    if (!travelerName.trim()) {
      setBookingError("يرجى كتابة اسم المسافر لإنشاء الحجز التجريبي.");
      return;
    }
    setBookingError("");
    const newBooking: DemoBooking = {
      reference: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      passengerName: travelerName.trim(),
      from: from.name,
      to: to.name,
      ...(bookingVehicle
        ? { vehicleName: bookingVehicle.name, vehicleKind: bookingVehicle.kind }
        : {}),
      passengers,
      farePerPassenger: trip.fare,
      total: trip.fare * passengers,
      createdAt: new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
        numberingSystem: "arab",
        timeZone: "Europe/Oslo",
      }).format(new Date()),
    };
    onBookingCreated(newBooking);
    setSelectedBooking(newBooking);
    setCreatingBooking(false);
    setTab("tickets");
  };

  const deleteBooking = (booking: DemoBooking) => {
    const confirmed = window.confirm(`هل تريد حذف الحجز ${booking.reference}؟`);
    if (confirmed && onBookingDeleted(booking.reference)) {
      if (selectedBooking?.reference === booking.reference) {
        setSelectedBooking(null);
      }
    }
  };

  const busLabel = feed.buses[0]?.name ?? "الحافلة رقم ١";
  const forecast = [0, 15, 30, 60].map((minutes) => ({
    minutes,
    score: forecastScore(feed, minutes, dispatchApplied),
  }));
  const currentLoad = forecast[0].score;

  return (
    <div
      className="operations-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="operations-panel" role="dialog" aria-modal="true" aria-labelledby="operations-title">
        <header className="operations-header">
          <div>
            <span className="demo-kicker">بايكارت · نموذج تجريبي</span>
            <h2 id="operations-title">خدمات التنقل</h2>
            <p>أدوات الرحلات وخدمات النقل في بيرغن</p>
          </div>
          <button className="operations-close" aria-label="إغلاق خدمات التنقل" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="operations-demo-notice" role="note">
          <Activity size={16} />
          <span><strong>وضع تجريبي.</strong> لا يوجد دفع فعلي أو تذكرة سفر صالحة أو اتصال بتشغيل المركبات.</span>
        </div>
        {storageError && <p className="demo-storage-error" role="alert">{storageError}</p>}

        <nav className="operations-tabs" aria-label="خدمات التنقل">
          <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}><Route size={15} /> خطط رحلتك</button>
          <button className={tab === "tickets" ? "active" : ""} onClick={() => { setSelectedBooking(null); setCreatingBooking(false); setTab("tickets"); }}><Ticket size={15} /> حجوزاتي ({bookings.length.toLocaleString("ar-EG")})</button>
          <button className={tab === "dispatch" ? "active" : ""} onClick={() => setTab("dispatch")}><BusFront size={15} /> تشغيل تجريبي</button>
          <button className={tab === "forecast" ? "active" : ""} onClick={() => setTab("forecast")}><Activity size={15} /> توقع الازدحام</button>
        </nav>

        <div className="operations-content">
          {tab === "plan" && (
            <div className="operation-view">
              <div className="demo-section-title"><MapPin size={17} /><div><h3>خطط رحلتك</h3><p>خيارات تنقل تقديرية بين مواقع بيرغن.</p></div></div>
              <label className="demo-field">من
                <select
                  value={fromName}
                  onChange={(event) => {
                    const nextFrom = event.target.value;
                    setFromName(nextFrom);
                    if (nextFrom === toName) {
                      setToName(STOPS.find((stop) => stop.name !== nextFrom)?.name ?? STOPS[1].name);
                    }
                  }}
                >
                  {STOPS.map((stop) => <option key={stop.name} value={stop.name}>{stop.name}</option>)}
                </select>
              </label>
              <label className="demo-field">إلى
                <select value={toName} onChange={(event) => setToName(event.target.value)}>
                  {STOPS.filter((stop) => stop.name !== fromName).map((stop) => <option key={stop.name} value={stop.name}>{stop.name}</option>)}
                </select>
              </label>
              <div className="trip-summary"><span>المسافة التقريبية</span><strong dir="ltr">{trip.km.toLocaleString("ar-EG", { maximumFractionDigits: 1 })} كم</strong></div>
              <div className="demo-route-card recommended">
                <div className="route-card-heading"><span className="route-chip">الأسرع · تقديري</span><strong>{trip.fastestMinutes.toLocaleString("ar-EG")} دقيقة</strong></div>
                <div className="route-card-body"><BusFront size={18} /><span>حافلة · تبديل واحد تقريبًا</span><b dir="ltr">{trip.fare.toLocaleString("ar-EG")} كرونة</b></div>
                <small>حساب تقريبي وفق المسافة وسرعة التنقل المعتادة، وليس جدولًا مباشرًا.</small>
              </div>
              <div className="demo-route-card">
                <div className="route-card-heading"><span>مسار بديل</span><strong>{trip.regularMinutes.toLocaleString("ar-EG")} دقيقة</strong></div>
                <div className="route-card-body"><BusFront size={18} /><span>خدمة حافلات محلية متكررة</span><b dir="ltr">{trip.fare.toLocaleString("ar-EG")} كرونة</b></div>
                <small>قد تختلف المدة حسب الخدمة وحركة المرور وعدد مرات التبديل.</small>
              </div>
              <button className="demo-primary-button" onClick={() => { setCreatingBooking(true); setSelectedBooking(null); setTab("tickets"); }}><Ticket size={16} /> متابعة إلى الحجز التجريبي <ArrowRight size={16} /></button>
            </div>
          )}

          {tab === "tickets" && (
            <div className="operation-view">
              <div className="demo-section-title"><Ticket size={17} /><div><h3>حجوزاتي</h3><p>حجوزاتك التجريبية المحفوظة على هذا الجهاز.</p></div></div>
              {selectedBooking ? (
                <div className="booking-success" role="status">
                  <div className="booking-success-icon"><Check size={23} /></div>
                  <h3>تفاصيل الحجز التجريبي</h3>
                  <p>رقم الحجز <strong dir="ltr">{selectedBooking.reference}</strong></p>
                  <div className="booking-details">
                    <span>اسم المسافر</span><b>{selectedBooking.passengerName}</b>
                    <span>مسار الرحلة</span><b>{selectedBooking.from} ← {selectedBooking.to}</b>
                    {selectedBooking.vehicleName && (
                      <>
                        <span>المركبة</span>
                        <b>{selectedBooking.vehicleKind === "ship" ? "سفينة" : "حافلة"} · {selectedBooking.vehicleName}</b>
                      </>
                    )}
                    <span>تاريخ الحجز</span><b>{selectedBooking.createdAt}</b>
                    <span>عدد الركاب</span><b>{selectedBooking.passengers.toLocaleString("ar-EG")}</b>
                    <span>السعر لكل راكب</span><b>{selectedBooking.farePerPassenger.toLocaleString("ar-EG")} كرونة</b>
                    <span>الإجمالي التقديري</span><b>{selectedBooking.total.toLocaleString("ar-EG")} كرونة</b>
                    <span>حالة الحجز</span><b>تجريبي · غير صالح للسفر</b>
                  </div>
                  <div className="demo-ticket-code" aria-label="حجز تجريبي غير صالح للسفر">بايكارت · حجز تجريبي غير صالح للسفر</div>
                  <button className="demo-secondary-button" onClick={() => setSelectedBooking(null)}>العودة إلى حجوزاتي</button>
                </div>
              ) : creatingBooking ? (
                <>
                  {bookingVehicle && (
                    <div className="booking-vehicle-banner" role="note">
                      {bookingVehicle.kind === "ship" ? <Ship size={17} /> : <BusFront size={17} />}
                      <span>
                        الحجز التجريبي مرتبط بـ{bookingVehicle.kind === "ship" ? "السفينة" : "الحافلة"}:{" "}
                        <strong>{bookingVehicle.name}</strong>
                      </span>
                    </div>
                  )}
                  <div className="ticket-route-summary"><span>{from.name}</span><ArrowRight size={15} /><span>{to.name}</span></div>
                  <label className="demo-field">اسم المسافر<input value={travelerName} onChange={(event) => setTravelerName(event.target.value)} placeholder="اكتب اسم المسافر" /></label>
                  <label className="demo-field">عدد الركاب
                    <select value={passengers} onChange={(event) => setPassengers(Number(event.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count.toLocaleString("ar-EG")}</option>)}
                    </select>
                  </label>
                  <div className="fare-total"><span>الإجمالي التقديري · {trip.fare.toLocaleString("ar-EG")} كرونة لكل راكب</span><strong>{(trip.fare * passengers).toLocaleString("ar-EG")} كرونة</strong></div>
                  <button className="demo-primary-button" onClick={createBooking}><Ticket size={16} /> تأكيد الحجز التجريبي</button>
                  {bookingError && <p className="demo-form-error" role="alert">{bookingError}</p>}
                  <p className="demo-fineprint">لن تصدر تذكرة سفر صالحة، ولا توجد أي عملية دفع.</p>
                  <button className="demo-secondary-button" onClick={() => { setCreatingBooking(false); setBookingError(""); }}>إلغاء والعودة إلى الحجوزات</button>
                </>
              ) : (
                <>
                  <button className="demo-primary-button" onClick={() => { setCreatingBooking(true); setSelectedBooking(null); }}>
                    <Ticket size={16} /> إنشاء حجز تجريبي
                  </button>
                  {bookings.length === 0 ? (
                    <div className="booking-empty">
                      <Ticket size={25} />
                      <strong>لا توجد حجوزات بعد</strong>
                      <span>بعد إنشاء حجز تجريبي ستظهر تفاصيله هنا وفي زر حجوزاتي.</span>
                    </div>
                  ) : (
                    <div className="booking-list" aria-label="قائمة الحجوزات">
                      {bookings.map((savedBooking) => (
                        <div className="booking-list-row" key={savedBooking.reference}>
                          <button className="booking-list-item" onClick={() => setSelectedBooking(savedBooking)}>
                            <span className="booking-list-icon"><Ticket size={17} /></span>
                            <span className="booking-list-route"><strong>{savedBooking.from} ← {savedBooking.to}</strong><small>{savedBooking.passengerName} · {savedBooking.passengers.toLocaleString("ar-EG")} ركاب{savedBooking.vehicleName ? ` · ${savedBooking.vehicleKind === "ship" ? "سفينة" : "حافلة"} ${savedBooking.vehicleName}` : ""}</small></span>
                            <span className="booking-list-total">{savedBooking.total.toLocaleString("ar-EG")} كرونة<small dir="ltr">{savedBooking.reference}</small></span>
                          </button>
                          <button
                            aria-label={`حذف الحجز ${savedBooking.reference}`}
                            className="booking-delete-button"
                            onClick={() => deleteBooking(savedBooking)}
                            title="حذف الحجز"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "dispatch" && (
            <div className="operation-view">
              <div className="demo-section-title"><BusFront size={17} /><div><h3>سيناريو تشغيل الحافلات</h3><p>اقتراح تجريبي استنادًا إلى بيانات الخريطة وقواعد افتراضية.</p></div></div>
              <div className="dispatch-kpis"><div><span>الحافلات في البيانات</span><strong>{feed.buses.length.toLocaleString("ar-EG")}</strong></div><div><span>نقاط المرور</span><strong>{feed.traffic.length.toLocaleString("ar-EG")}</strong></div><div><span>مؤشر الضغط</span><strong>{currentLoad.toLocaleString("ar-EG")}٪</strong></div></div>
              <div className="dispatch-recommendation">
                <span className="route-chip">اقتراح · محاكاة</span>
                <h3>{currentLoad >= 62 ? "تعزيز الخدمة برحلة إضافية" : "الحفاظ على وتيرة الخدمة الحالية"}</h3>
                <p>{currentLoad >= 62
                  ? `يقترح النموذج إضافة حافلة احتياطية قرب وسط بيرغن. ${busLabel} معروضة كعينة فقط.`
                  : "مؤشر الضغط التجريبي ضمن النطاق المعتاد. يُقترح إبقاء حافلة احتياطية قرب وسط المدينة."}</p>
                <div className="dispatch-target"><BusFront size={17} /><span>مركبة تجريبية</span><strong>{busLabel}</strong></div>
              </div>
              <button className={`demo-primary-button ${dispatchApplied ? "confirmed" : ""}`} onClick={() => setDispatchApplied((active) => !active)}>
                {dispatchApplied ? <Check size={16} /> : <BusFront size={16} />}
                {dispatchApplied ? "المحاكاة مفعّلة · تراجع" : "تفعيل محاكاة التشغيل"}
              </button>
              <p className="demo-fineprint">لن يتم الاتصال بأي مركبة حقيقية أو تحريكها أو تكليفها بمهمة.</p>
            </div>
          )}

          {tab === "forecast" && (
            <div className="operation-view">
              <div className="demo-section-title"><Activity size={17} /><div><h3>توقع الازدحام</h3><p>تقدير تجريبي للساعة القادمة يتحدث مع بيانات الجلسة.</p></div></div>
              <div className="forecast-current"><div><span>مؤشر ضغط الشبكة التقديري</span><strong>{currentLoad.toLocaleString("ar-EG")}<small>/١٠٠</small></strong></div><span className={`forecast-status ${currentLoad >= 62 ? "busy" : ""}`}>{currentLoad >= 62 ? "مرتفع" : "متوسط"}</span></div>
              <div className="forecast-chart" role="img" aria-label={`توقع ازدحام تجريبي: ${forecast.map((point) => `${point.minutes} دقيقة ${point.score} بالمئة`).join("، ")}`}>
                {forecast.map((point) => <div className="forecast-column" key={point.minutes}><strong>{point.score.toLocaleString("ar-EG")}٪</strong><i><span style={{ height: `${point.score}%` }} /></i><small>{point.minutes === 0 ? "الآن" : `+${point.minutes.toLocaleString("ar-EG")} د`}</small></div>)}
              </div>
              <div className="forecast-factors">
                <div><Clock3 size={16} /><span>نمط الطلب حسب الوقت</span><b>محتسب</b></div>
                <div><Activity size={16} /><span>نقاط قياس المرور المتاحة</span><b>{feed.traffic.length.toLocaleString("ar-EG")}</b></div>
                <div><MapPin size={16} /><span>تأثير الطقس</span><b>{feed.weather.temperature === null ? "غير متاح" : arabicWeatherDescription(feed.weather.description)}</b></div>
              </div>
              <p className="demo-fineprint">هذا تقدير إرشادي مبسط وليس نموذجًا تنبؤيًا مدرّبًا. مواقع أجهزة قياس المرور ليست قراءات لحجم الحركة المباشر.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
