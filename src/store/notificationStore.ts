import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@/lib/id";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

interface NotificationState {
  items: AppNotification[];
  push: (n: Omit<AppNotification, "id" | "at" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

const INITIAL: AppNotification[] = [
  {
    id: "n-1",
    title: "Gerçekleşen sonuçlar güncellendi",
    body: "“5 İşleme 150 TL” kampanyasının tahmin-gerçekleşme karşılaştırması eklendi.",
    at: "2026-11-13T08:00:00.000Z",
    read: false,
    href: "/sonuclar",
  },
  {
    id: "n-2",
    title: "Demo motor sürümü: demo-sim 0.3",
    body: "Simülasyon motoru güncellendi. Kaydedilmiş senaryolar kayıt anındaki sonuçlarını korur.",
    at: "2026-11-10T12:00:00.000Z",
    read: false,
    href: "/model",
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      items: INITIAL,
      push: (n) =>
        set({ items: [{ ...n, id: createId("n"), at: new Date().toISOString(), read: false }, ...get().items].slice(0, 30) }),
      markAllRead: () => set({ items: get().items.map((i) => ({ ...i, read: true })) }),
      markRead: (id) => set({ items: get().items.map((i) => (i.id === id ? { ...i, read: true } : i)) }),
      clear: () => set({ items: [] }),
    }),
    { name: "cis.notifications.v1" },
  ),
);
