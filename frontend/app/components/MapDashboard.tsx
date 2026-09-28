"use client";

import {
  Activity,
  ArrowUpRight,
  BusFront,
  X,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Bell,
  LocateFixed,
  MapPinned,
  Minus,
  Plus,
  RefreshCw,
  Route,
  Settings,
  Ship,
  Ticket,
  TrafficCone,
  Wind,
} from "lucide-react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import type { Map } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import BrandMark from "@/components/BrandMark";
import { api } from "@/lib/api";
import LayerToggle from "@/components/LayerToggle";
import OperationsPanel from "@/components/OperationsPanel";
import type { AnalyticsResponse, DemoBooking, FeedResponse, Marker as TransitMarker } from "@/lib/types";

const BERGEN = { lat: 60.39299, lon: 5.32415 };
const POLL_INTERVAL = 15_000;
const BOOKINGS_STORAGE_KEY = "bykart.demo-bookings.v1";

function arabicWeatherDescription(description: string): string {
  const translations: Record<string, string> = {
    clear: "سماء صافية",
    clearsky: "سماء صافية",
    "mostly clear": "صحو غالبًا",
    fair: "طقس صحو",
    partlycloudy: "غائم جزئيًا",
    "partly cloudy": "غائم جزئيًا",
    cloudy: "غائم",
    overcast: "غائم كليًا",
    lightrain: "أمطار خفيفة",
    "light rain": "أمطار خفيفة",
    rain: "ممطر",
    heavyrain: "أمطار غزيرة",
    "heavy rain": "أمطار غزيرة",
    fog: "ضباب",
    snow: "ثلوج",
    sleet: "مطر ثلجي",
    wind: "رياح",
    "light breeze": "نسيم خفيف",
    "lett regn": "أمطار خفيفة",
    "kraftig regn": "أمطار غزيرة",
    "delvis skyet": "غائم جزئيًا",
    "lettskyet": "غائم جزئيًا",
    "skyet": "غائم",
    "klart": "سماء صافية",
    "tåke": "ضباب",
    "snøvær": "ثلوج",
    "sludd": "مطر ثلجي",
    "lett bris": "نسيم خفيف",
  };
  return translations[description.trim().toLowerCase()] ?? description;
}

function readStoredBookings(): DemoBooking[] {
  const stored = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("صيغة الحجوزات المحفوظة غير صالحة.");
  const validBookings = parsed.filter(
    (item): item is DemoBooking =>
      typeof item === "object" &&
      item !== null &&
      typeof item.reference === "string" &&
      typeof item.passengerName === "string" &&
      typeof item.from === "string" &&
      typeof item.to === "string" &&
      typeof item.passengers === "number" &&
      typeof item.farePerPassenger === "number" &&
      typeof item.total === "number" &&
      typeof item.createdAt === "string" &&
      ((item.vehicleName === undefined && item.vehicleKind === undefined) ||
        (typeof item.vehicleName === "string" &&
          (item.vehicleKind === "bus" || item.vehicleKind === "ship")))
  );
  if (validBookings.length !== parsed.length) throw new Error("بعض الحجوزات المحفوظة تالفة ولا يمكن عرضها.");
  return validBookings;
}

function markerIcon(kind: TransitMarker["kind"]): string {
  const icons: Record<TransitMarker["kind"], string> = {
    bus: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V18H5z"/><path d="M5 9h14M8 13h2m4 0h2M7 18v2m10-2v2M3 8h2m14 0h2"/>',
    ship: '<path d="M3 15.5 5.5 19h13l2.5-3.5L12 13z"/><path d="M12 3v10m-5 0V7h10v6M9 9h6"/><path d="M3 20c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0 2.5 1 4 0 2.5-1 4 0"/>',
    traffic: '<path d="m12 3 5 17H7z"/><path d="M9 13h6m-5-4h4M5 21h14"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[kind]}</svg>`;
}

type LayerState = {
  buses: boolean;
  ships: boolean;
  traffic: boolean;
  buildings: boolean;
};

const initialFeed: FeedResponse = {
  buses: [],
  ships: [],
  traffic: [],
  weather: { temperature: null, description: "جارٍ تحميل بيانات الطقس" },
  updated_at: null,
  bus_online: false,
  ship_online: false,
};

export default function MapDashboard() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [feed, setFeed] = useState<FeedResponse>(initialFeed);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [operationsTab, setOperationsTab] = useState<"plan" | "tickets" | "dispatch" | "forecast">("plan");
  const [bookingVehicle, setBookingVehicle] = useState<{ name: string; kind: "bus" | "ship" } | null>(null);
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [bookingStorageError, setBookingStorageError] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    buses: true,
    ships: true,
    traffic: true,
    buildings: true,
  });
  const [selected, setSelected] = useState<TransitMarker | null>(null);
  const [clock, setClock] = useState("");
  const [is3d, setIs3d] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setBookings(readStoredBookings());
      } catch (error) {
        const message = error instanceof Error ? error.message : "تعذر قراءة الحجوزات المحفوظة.";
        setBookingStorageError(message);
        console.error("Unable to load saved demo reservations.", error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveBooking = (booking: DemoBooking) => {
    const nextBookings = [booking, ...bookings];
    setBookings(nextBookings);
    try {
      window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
      setBookingStorageError(null);
    } catch (error) {
      setBookingStorageError("تعذر حفظ الحجز على هذا الجهاز. قد تكون مساحة التخزين غير متاحة.");
      console.error("Unable to save demo reservations.", error);
    }
  };

  const deleteBooking = (reference: string): boolean => {
    const nextBookings = bookings.filter((booking) => booking.reference !== reference);
    if (nextBookings.length === bookings.length) return true;

    try {
      window.localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings));
      setBookings(nextBookings);
      setBookingStorageError(null);
      return true;
    } catch (error) {
      setBookingStorageError("تعذر حذف الحجز من هذا الجهاز. قد تكون مساحة التخزين غير متاحة.");
      console.error("Unable to delete saved demo reservation.", error);
      return false;
    }
  };

  /* ── Clock ───────────────────────────────────────── */
  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("no-NO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          numberingSystem: "arab",
          timeZone: "Europe/Oslo",
        }).format(new Date())
      );
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const compactScreen = window.matchMedia("(max-width: 760px) and (max-height: 600px)");
    const collapseLayersOnCompactScreen = () => {
      if (compactScreen.matches) setLayersOpen(false);
    };

    collapseLayersOnCompactScreen();
    compactScreen.addEventListener("change", collapseLayersOnCompactScreen);
    return () => compactScreen.removeEventListener("change", collapseLayersOnCompactScreen);
  }, []);

  /* ── Data and analytics polling (via Python backend) ─ */
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await api.getFeed();
        if (!active) return;
        setFeed(data);
      } catch {
        if (active) {
          setFeed((current) => ({ ...current, bus_online: false, ship_online: false }));
        }
      }

      try {
        const report = await api.getAnalytics();
        if (!active) return;
        setAnalytics(report);
        setAnalyticsError(null);
      } catch {
        if (active) {
          setAnalyticsError("تعذر تحميل التحليلات. تحقق من اتصال الخادم ثم أعد المحاولة.");
        }
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  /* ── Map initialisation ─────────────────────────── */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [BERGEN.lon, BERGEN.lat],
      zoom: 14.35,
      pitch: 68,
      bearing: -18,
      maxPitch: 75,
    });
    mapRef.current = map;

    map.on("load", () => {
      const firstSymbolLayer = map
        .getStyle()
        .layers?.find((layer) => layer.type === "symbol")?.id;

      if (!map.getLayer("bergen-buildings-3d")) {
        map.addLayer(
          {
            id: "bergen-buildings-3d",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "render_height"]], ["to-number", ["get", "height"]], 8], 8, "#74899d", 36, "#8da1b3", 90, "#a8b7c4"],
              "fill-extrusion-height": ["max", 10, ["coalesce", ["to-number", ["get", "render_height"]], ["to-number", ["get", "height"]], ["*", ["to-number", ["get", "building:levels"], 3], 3], 9]],
              "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"]], ["to-number", ["get", "min_height"]], 0],
              "fill-extrusion-opacity": 1,
              "fill-extrusion-vertical-gradient": true,
            },
          },
          firstSymbolLayer
        );
      }

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Update live map markers ───────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const visibleMarkers = [
      ...(layers.buses ? feed.buses : []),
      ...(layers.ships ? feed.ships : []),
      ...(layers.traffic ? feed.traffic : []),
    ];

    for (const transitMarker of visibleMarkers) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `map-vehicle-marker ${transitMarker.kind}`;
      const markerKindName =
        transitMarker.kind === "bus" ? "حافلة" : transitMarker.kind === "ship" ? "سفينة" : "نقطة مرور";
      element.setAttribute("aria-label", `${markerKindName}: ${transitMarker.name}`);
      element.dataset.latitude = String(transitMarker.lat);
      element.dataset.longitude = String(transitMarker.lon);
      element.title = `${transitMarker.name} · ${transitMarker.lat.toFixed(5)}, ${transitMarker.lon.toFixed(5)}`;
      element.innerHTML = markerIcon(transitMarker.kind);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelected(transitMarker);
        map.easeTo({
          center: [transitMarker.lon, transitMarker.lat],
          duration: 450,
        });
      });

      markerRefs.current.push(
        new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([transitMarker.lon, transitMarker.lat])
          .addTo(map)
      );
    }

    if (map.getLayer("bergen-buildings-3d")) {
      map.setLayoutProperty(
        "bergen-buildings-3d",
        "visibility",
        layers.buildings ? "visible" : "none"
      );
    }

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
    };
  }, [feed, layers, mapReady]);

  /* ── Action helpers ────────────────────────────── */
  const toggleLayer = (layer: keyof LayerState) =>
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  const flyToBergen = () =>
    mapRef.current?.flyTo({
      center: [BERGEN.lon, BERGEN.lat],
      zoom: 14.35,
      pitch: is3d ? 68 : 0,
      bearing: is3d ? -18 : 0,
      duration: 950,
    });

  const setMapMode = (mode3d: boolean) => {
    setIs3d(mode3d);
    mapRef.current?.easeTo({
      pitch: mode3d ? 68 : 0,
      bearing: mode3d ? -18 : 0,
      duration: 750,
    });
  };

  const focusSelected = () => {
    if (!selected) return;
    mapRef.current?.flyTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(mapRef.current.getZoom(), 15.5),
      duration: 700,
    });
  };

  const bookSelectedVehicle = () => {
    if (!selected || selected.kind === "traffic") return;
    setBookingVehicle({
      name: selected.name.trim() || (selected.kind === "bus" ? "حافلة" : "سفينة"),
      kind: selected.kind,
    });
    setOperationsTab("tickets");
    setOperationsOpen(true);
  };

  const refreshAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
      setAnalyticsError(null);
    } catch {
      setAnalyticsError("تعذر تحميل التحليلات. تحقق من اتصال الخادم ثم أعد المحاولة.");
    }
  };

  /* ── Derived display values ────────────────────── */
  const feedStatus =
    feed.bus_online && feed.ship_online
      ? "جميع المصادر متصلة"
      : feed.updated_at
        ? "المصادر متاحة جزئيًا"
        : "جارٍ الاتصال بالمصادر";

  const updatedTime = feed.updated_at
    ? new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      numberingSystem: "arab",
      timeZone: "Europe/Oslo",
    }).format(new Date(feed.updated_at))
    : "بانتظار التحديث";

  /* ── Render ────────────────────────────────────── */
  return (
    <main className="dashboard">
      <header className="dashboard-topbar">
        <Link aria-label="العودة إلى الصفحة الرئيسية" className="dashboard-brand" href="/">
          <BrandMark />
        </Link>
        <div className="dashboard-location">
          <span className={`status-dot ${feed.bus_online && feed.ship_online ? "" : "pending"}`} />
          بيرغن <b>•</b>
          <em className={feed.bus_online && feed.ship_online ? "" : "offline"}>
            {feed.bus_online && feed.ship_online ? "مباشر" : feed.bus_online || feed.ship_online ? "جزئي" : "غير متصل"}
          </em>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-weather">
            <CloudSun size={25} />
            <strong>{feed.weather.temperature === null ? "—°" : `${Math.round(feed.weather.temperature).toLocaleString("ar-EG")}°`}</strong>
            <span>{arabicWeatherDescription(feed.weather.description)}</span>
          </div>
          <div className="dashboard-updated"><RefreshCw size={14} /> آخر تحديث {updatedTime}</div>
          <button
            className="services-launch"
            aria-label="فتح خدمات التنقل"
            aria-expanded={operationsOpen}
            onClick={() => {
              setBookingVehicle(null);
              setOperationsTab("plan");
              setOperationsOpen((open) => !open);
            }}
          >
            <Route size={17} /><span>الخدمات</span>
          </button>
          <button aria-label="التحليلات" title="التحليلات" aria-expanded={analyticsOpen} onClick={() => setAnalyticsOpen((open) => !open)}><Activity size={21} /></button>
          <button aria-label="الإشعارات" title="الإشعارات"><Bell size={22} /></button>
          <button
            className="booking-launch"
            aria-label={`حجوزاتي، ${bookings.length.toLocaleString("ar-EG")} حجز`}
            title="حجوزاتي"
            onClick={() => {
              setBookingVehicle(null);
              setOperationsTab("tickets");
              setOperationsOpen(true);
            }}
          >
            <Ticket size={19} />
            <span>حجوزاتي</span>
            {bookings.length > 0 && <b className="booking-count">{bookings.length.toLocaleString("ar-EG")}</b>}
          </button>
          <button aria-label="الإعدادات" title="الإعدادات"><Settings size={22} /></button>
        </div>
      </header>
      {operationsOpen && (
        <OperationsPanel
          feed={feed}
          bookings={bookings}
          initialTab={operationsTab}
          bookingVehicle={bookingVehicle}
          storageError={bookingStorageError}
          onBookingCreated={saveBooking}
          onBookingDeleted={deleteBooking}
          onClose={() => {
            setOperationsOpen(false);
            setBookingVehicle(null);
          }}
        />
      )}
      {analyticsOpen && (
        <aside className="analytics-panel" aria-label="التحليلات المباشرة" aria-live="polite">
          <div className="analytics-heading">
            <div>
              <span>بايكارت / بيرغن</span>
              <h2>التحليلات المباشرة</h2>
            </div>
            <button aria-label="إغلاق التحليلات" onClick={() => setAnalyticsOpen(false)}><X size={19} /></button>
          </div>
          {analyticsError ? (
            <div className="analytics-error" role="alert">
              <p>{analyticsError}</p>
              <button onClick={() => void refreshAnalytics()}>إعادة المحاولة</button>
            </div>
          ) : analytics ? (
            <>
              <div className="analytics-bars">
                {[
                  { label: "الحافلات", value: analytics.bus_count, color: "blue" },
                  { label: "السفن", value: analytics.ship_count, color: "teal" },
                  { label: "نقاط المرور", value: analytics.traffic_count, color: "orange" },
                ].map((item) => {
                  const total = Math.max(analytics.bus_count, analytics.ship_count, analytics.traffic_count, 1);
                  return (
                    <div className="analytics-bar-row" key={item.label}>
                      <span>{item.label}</span><b>{item.value.toLocaleString("ar-EG")}</b>
                      <i className={item.color}><span style={{ width: `${(item.value / total) * 100}%` }} /></i>
                    </div>
                  );
                })}
              </div>
              <div className="analytics-summary">
                <div><span>الطلبات المعالجة</span><strong>{analytics.total_requests.toLocaleString("ar-EG")}</strong></div>
                <div><span>مدة تشغيل الخادم</span><strong>{Math.floor(analytics.uptime_seconds / 60).toLocaleString("ar-EG")} د {Math.floor(analytics.uptime_seconds % 60).toLocaleString("ar-EG")} ث</strong></div>
                <div><span>الطقس الحالي</span><strong>{analytics.weather_temperature === null ? "غير متاح" : `${Math.round(analytics.weather_temperature).toLocaleString("ar-EG")}° · ${arabicWeatherDescription(analytics.weather_description)}`}</strong></div>
                <div><span>وقت التحديث</span><strong>{new Intl.DateTimeFormat("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit", numberingSystem: "arab", timeZone: "Europe/Oslo" }).format(new Date(analytics.timestamp))}</strong></div>
              </div>
            </>
          ) : (
            <div className="analytics-loading"><span className="status-dot pending" /> جارٍ تحميل التحليلات المباشرة…</div>
          )}
        </aside>
      )}
      <aside className="sidebar">
        <div className="brand-row">
          <BrandMark />
          <div>
            <p className="brand-title">
              بايكارت <span style={{ color: "#788581", fontWeight: 500 }}> / بيرغن</span>
            </p>
            <div className="brand-subtitle">بيانات مفتوحة · مدينة نابضة</div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="city-block">
            <div className="eyebrow">فيستلاند · النرويج</div>
            <h1 className="city-heading">بيرغن</h1>
            <p className="city-subheading">
              <span
                className={`status-dot ${feed.bus_online && feed.ship_online ? "" : "pending"}`}
              />
              {feedStatus}
            </p>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-icon"><BusFront size={19} color="#eaf4ff" /></span>
              <div className="metric-copy">
                <div className="metric-number">{feed.buses.length.toLocaleString("ar-EG")}</div>
                <span className="metric-label">الحافلات</span>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon"><Ship size={19} color="#e8fffd" /></span>
              <div className="metric-copy">
                <div className="metric-number">{feed.ships.length.toLocaleString("ar-EG")}</div>
                <span className="metric-label">السفن</span>
              </div>
            </div>
            <div className="metric-card">
              <span className="metric-icon"><TrafficCone size={19} color="#ff911a" /></span>
              <div className="metric-copy">
                <div className="metric-number">{feed.traffic.length.toLocaleString("ar-EG")}</div>
                <span className="metric-label">المرور</span>
              </div>
            </div>
          </div>

          <section className={`layers-section ${layersOpen ? "open" : "collapsed"}`}>
            <div className="section-heading">
              <h2>طبقات الخريطة</h2>
              <div className="layers-heading-actions">
                <span className="section-label">
                  {feed.updated_at ? `آخر تحديث ${updatedTime}` : "مباشر"}
                </span>
                <button
                  className="layers-collapse"
                  aria-label={layersOpen ? "إخفاء طبقات الخريطة" : "إظهار طبقات الخريطة"}
                  aria-expanded={layersOpen}
                  onClick={() => setLayersOpen((open) => !open)}
                >
                  {layersOpen ? "إخفاء" : "إظهار"}
                  {layersOpen ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                </button>
              </div>
            </div>
            <div className="layer-list">
              <LayerToggle
                active={layers.buses}
                icon={<BusFront size={15} color="#eaf4ff" />}
                label="الحافلات"
                count={feed.buses.length.toLocaleString("ar-EG")}
                onClick={() => toggleLayer("buses")}
              />
              <LayerToggle
                active={layers.ships}
                icon={<Ship size={15} color="#e8fffd" />}
                label="السفن · AIS"
                count={feed.ships.length.toLocaleString("ar-EG")}
                onClick={() => toggleLayer("ships")}
              />
              <LayerToggle
                active={layers.traffic}
                icon={<TrafficCone size={15} color="#fff0d8" />}
                label="المرور"
                count={feed.traffic.length.toLocaleString("ar-EG")}
                onClick={() => toggleLayer("traffic")}
              />
              <LayerToggle
                active={layers.buildings}
                icon={<MapPinned size={15} color="#d5dde5" />}
                label="مبانٍ ثلاثية الأبعاد"
                count=""
                onClick={() => toggleLayer("buildings")}
              />
            </div>
          </section>

          <div className="weather-strip">
            <CloudSun size={20} color="#578879" />
            <div className="weather-temp">
              {feed.weather.temperature === null
                ? "—°"
                : `${Math.round(feed.weather.temperature).toLocaleString("ar-EG")}°`}
            </div>
            <div>
              <div className="section-heading" style={{ margin: 0 }}>
                <strong style={{ fontSize: 11 }}>وسط بيرغن</strong>
              </div>
              <div className="weather-description">{arabicWeatherDescription(feed.weather.description)}</div>
            </div>
            <Wind className="weather-state" size={16} />
          </div>

          {selected && (
            <div className="selected-panel">
              <div className="section-heading">
                <span className="section-label">العنصر المحدد</span>
                <button
                  className="plain-icon-button"
                  aria-label="إغلاق التفاصيل"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>
              <h2 className="selected-title">{selected.name}</h2>
              <p className="selected-description">{selected.detail}</p>
            </div>
          )}
        </div>

        <footer className="sidebar-footer">
          <span className="source-caption">
            <span
              className={`status-dot ${feed.bus_online || feed.ship_online ? "" : "offline"}`}
            />
            بيانات من مصادر مفتوحة
          </span>
          <a
            className="source-caption source-link"
            href="https://allemannsdata.com/wiki/"
            target="_blank"
            rel="noreferrer"
            aria-label="فتح مصادر البيانات"
          >
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </aside>

      <section className="map-stage" aria-label="خريطة النقل المباشر في بيرغن">
        <div className="map-canvas" ref={mapContainer} />
        {!mapReady && (
          <div className="map-loading">
            <span className="status-dot pending" />
            جارٍ تحميل خريطة بيرغن ثلاثية الأبعاد
          </div>
        )}

        <div className="map-topbar">
          <div className="map-location">
            <MapPinned size={16} color="#326a55" />
            <div>
              <strong>وسط بيرغن</strong>
              <span className="coordinate-label" dir="ltr">60.3930° N · 5.3242° E</span>
            </div>
          </div>
          <div className="map-clock">
            <span className="live-dot" />
            <span dir="ltr">{clock || "--:--:--"}</span> · توقيت بيرغن
          </div>
        </div>

        {selected && (
          <aside className="vehicle-popup" aria-live="polite">
            <div className="vehicle-popup-heading">
              <span className={`vehicle-kind ${selected.kind}`}>
                <i /> {selected.kind === "bus" ? "حافلة" : selected.kind === "ship" ? "سفينة" : "مرور"} <i />
              </span>
              <button
                className="plain-icon-button"
                aria-label="إغلاق تفاصيل المركبة"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <h2>{selected.name || (selected.kind === "bus" ? "حافلة" : selected.kind === "ship" ? "سفينة" : "نقطة مرور")}</h2>
            <p>{selected.detail || "موقع مباشر في بيرغن"}</p>
            <div className="vehicle-popup-coordinates">
              <span>الموقع</span>
              <b dir="ltr">{selected.lat.toFixed(4)}° شمالًا · {selected.lon.toFixed(4)}° شرقًا</b>
            </div>
            <button className="vehicle-track" onClick={focusSelected}>
              <MapPinned size={16} /> {selected.kind === "ship" ? "تتبّع السفينة" : selected.kind === "traffic" ? "عرض النقطة" : "تتبّع المركبة"}
            </button>
            {selected.kind !== "traffic" && (
              <button className="vehicle-book" onClick={bookSelectedVehicle}>
                <Ticket size={16} /> احجز مع {selected.kind === "ship" ? "السفينة" : "الحافلة"}
              </button>
            )}
            <button className="vehicle-view" onClick={focusSelected}>
              عرض على الخريطة <ArrowUpRight size={14} />
            </button>
          </aside>
        )}

        <div className="map-mode-control" aria-label="وضع عرض الخريطة">
          <button
            className={`mode-button ${is3d ? "selected" : ""}`}
            aria-label="عرض ثلاثي الأبعاد"
            onClick={() => setMapMode(true)}
          >
            ٣D
          </button>
          <button
            className={`mode-button ${!is3d ? "selected" : ""}`}
            aria-label="عرض ثنائي الأبعاد"
            onClick={() => setMapMode(false)}
          >
            ٢D
          </button>
        </div>
        <div className="map-controls">
          <button
            className="map-control-button"
            title="تكبير"
            aria-label="تكبير"
            onClick={() => mapRef.current?.zoomIn()}
          >
            <Plus size={17} />
          </button>
          <button
            className="map-control-button"
            title="تصغير"
            aria-label="تصغير"
            onClick={() => mapRef.current?.zoomOut()}
          >
            <Minus size={17} />
          </button>
          <button
            className="map-control-button"
            title="العودة إلى وسط بيرغن"
            aria-label="العودة إلى وسط بيرغن"
            onClick={flyToBergen}
          >
            <LocateFixed size={16} />
          </button>
        </div>

        <div className="map-note">
          مواقع الحافلات والسفن من Entur وAIS. نقاط المرور مواقع قياس وليست تدفقًا مروريًا مباشرًا.
        </div>
      </section>
      <footer className="dashboard-statusbar">
        <strong>مصادر البيانات</strong>
        <span><i className={feed.bus_online ? "" : "offline"} /> Entur <b>{feed.bus_online ? "مباشر" : "غير متصل"}</b></span>
        <span><i className={feed.ship_online ? "" : "offline"} /> AIS <b>{feed.ship_online ? "مباشر" : "غير متصل"}</b></span>
        <span><i className={feed.traffic.length ? "" : "pending"} /> Vegvesenet <b>{feed.traffic.length ? "متاح" : "بانتظار البيانات"}</b></span>
        <span><i className={feed.weather.temperature !== null ? "" : "pending"} /> MET <b>{feed.weather.temperature !== null ? "مباشر" : "بانتظار البيانات"}</b></span>
        <em>
          {feed.bus_online && feed.ship_online && feed.weather.temperature !== null
            ? "جميع الأنظمة تعمل"
            : "بعض المصادر غير متاحة"}
         　<span>♢</span>
        </em>
      </footer>
    </main>
  );
}
