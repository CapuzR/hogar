/**
 * Cliente tipado de la API + hooks de React Query. Same-origin: en dev, Vite
 * proxya /api -> wrangler (:8787); en prod lo sirve el mismo Worker.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* ───────────────────────── Tipos (espejo de la API) ───────────────────────── */
export interface ServiceRef {
  key: string;
  labelEs: string;
  systemKey: string;
  lineCost: number | null;
}
export interface PaymentRef {
  id: string;
  ynabTransactionId: string | null;
  amount: number | null;
  currency: string | null;
  amountUsdt: number | null;
  rateUsed: number | null;
  rateSource: string | null;
  moneySource: string | null;
  voided: boolean;
}
export interface EventDTO {
  id: string;
  vehicleId: string | null;
  carSlug: string | null;
  carLabel: string | null;
  carColor: string | null;
  carNickname: string | null;
  serviceDate: string;
  odometer: number | null;
  odometerUnit: string;
  title: string | null;
  description: string | null;
  vendorId: string | null;
  vendorName: string | null;
  vendorCanonical: string | null;
  performedBy: string | null;
  source: string | null;
  clientId: string;
  confidence: number | null;
  needsReview: boolean;
  rawText: string | null;
  loggedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  services: ServiceRef[];
  payments: PaymentRef[];
  totalUsdt: number;
}
export interface Car {
  id: string;
  slug: string;
  nickname: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  engine: string | null;
  transmissionType: string | null;
  oilSpec: string | null;
  plate: string | null;
  color: string | null;
  ownerName: string | null;
  currentOdometer: number | null;
  odometerUnit: string;
  isActive: boolean;
  label: string;
  eventCount: number;
  totalUsdt: number;
  lastServiceDate: string | null;
}
export interface ServiceType {
  key: string;
  labelEs: string;
  systemKey: string;
  systemLabel: string;
  nature: string | null;
  defaultIntervalKm: number | null;
  defaultIntervalMonths: number | null;
}
export interface SystemRef {
  key: string;
  label: string;
}
export interface Stats {
  totals: {
    maintenanceUsdt: number;
    fuelUsdt: number;
    eventCount: number;
    fuelCount: number;
    needsReviewCount: number;
  };
  byCar: { carSlug: string | null; carLabel: string; count: number; totalUsdt: number }[];
  bySystem: { systemKey: string; systemLabel: string; count: number; totalUsdt: number }[];
  byMonth: { month: string; maintenance: number; fuel: number }[];
}
export interface FuelLog {
  id: string;
  vehicleId: string | null;
  carSlug: string | null;
  fuelDate: string;
  amountUsdt: number | null;
  currency: string | null;
  liters: number | null;
  vendor: string | null;
  owner: string | null;
  source: string | null;
  notes: string | null;
}

export interface EventFilters {
  car?: string;
  system?: string;
  serviceType?: string;
  needsReview?: boolean;
  from?: string;
  to?: string;
  q?: string;
}
export interface EventInput {
  client_id?: string;
  car?: string | null;
  date: string;
  odometer?: number | null;
  service_type?: string;
  text?: string;
  title?: string;
  description?: string;
  vendor?: string;
  performed_by?: "shop" | "self";
  source?: string;
  payments?: { amount?: number; currency?: string; amount_usdt?: number; ynab_transaction_id?: string }[];
}
export interface EventPatch {
  car?: string | null;
  date?: string;
  odometer?: number | null;
  title?: string | null;
  description?: string | null;
  vendor?: string | null;
  service_type?: string;
  needs_review?: boolean;
  confidence?: number;
  approve?: boolean;
  amount_usdt?: number;
}

/* ───────────────────────────── fetch helper ───────────────────────────── */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      detail = j.error ?? j.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

function qs(filters: EventFilters): string {
  const p = new URLSearchParams();
  if (filters.car) p.set("car", filters.car);
  if (filters.system) p.set("system", filters.system);
  if (filters.serviceType) p.set("service_type", filters.serviceType);
  if (filters.needsReview !== undefined) p.set("needs_review", String(filters.needsReview));
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.q) p.set("q", filters.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/* ───────────────────────────── hooks ───────────────────────────── */
export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => api<{ events: EventDTO[]; total: number }>(`/events${qs(filters)}`),
  });
}
export function useCars() {
  return useQuery({ queryKey: ["cars"], queryFn: () => api<{ cars: Car[] }>("/cars") });
}
export function useServiceTypes() {
  return useQuery({
    queryKey: ["service-types"],
    queryFn: () => api<{ systems: SystemRef[]; types: ServiceType[] }>("/service-types"),
    staleTime: 1000 * 60 * 30,
  });
}
export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>("/stats") });
}
export function useFuel(filters: { car?: string; from?: string; to?: string } = {}) {
  const p = new URLSearchParams();
  if (filters.car) p.set("car", filters.car);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  p.set("limit", "1000");
  return useQuery({
    queryKey: ["fuel", filters],
    queryFn: () =>
      api<{ fuel: FuelLog[]; count: number; totalUsdt: number }>(`/fuel?${p.toString()}`),
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    qc.invalidateQueries({ queryKey: ["cars"] });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: EventInput) =>
      api<{ event: EventDTO; replay: boolean }>("/events", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}
export function useUpdateEvent() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EventPatch }) =>
      api<{ event: EventDTO }>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  });
}
export function useDeleteEvent() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean; deleted: string }>(`/events/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/* ───────────────────────── Agenda / Calendario ───────────────────────── */
export type AgendaStatus = "suggested" | "scheduled" | "done" | "dismissed";
export interface AgendaItem {
  id: string;
  vehicleId: string | null;
  carSlug: string | null;
  carLabel: string | null;
  serviceTypeKey: string | null;
  serviceLabel: string | null;
  systemKey: string | null;
  title: string;
  notes: string | null;
  scheduledDate: string;
  scheduledTime: string | null;
  estimatedCost: string | null;
  serviceCenter: string | null;
  status: AgendaStatus;
  source: "auto" | "manual";
  reason: string | null;
  googleEventId: string | null;
  googleHtmlLink: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
export interface AgendaInput {
  car?: string | null;
  service_type?: string | null;
  title: string;
  notes?: string | null;
  date: string;
  time?: string | null;
  estimated_cost?: string | null;
  service_center?: string | null;
}
export interface AgendaPatch extends Partial<AgendaInput> {
  status?: AgendaStatus;
}
export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  calendarName: string | null;
  invitees: string[];
}
export interface ApproveResult {
  item: AgendaItem;
  calendar: { connected: boolean; created: boolean; error: string | null };
}

export function useAgenda(filters: { status?: string; car?: string } = {}) {
  const p = new URLSearchParams();
  if (filters.status) p.set("status", filters.status);
  if (filters.car) p.set("car", filters.car);
  const s = p.toString();
  return useQuery({
    queryKey: ["agenda", filters],
    queryFn: () => api<{ items: AgendaItem[] }>(`/agenda${s ? `?${s}` : ""}`),
  });
}

export function useGoogleStatus() {
  return useQuery({ queryKey: ["google-status"], queryFn: () => api<GoogleStatus>("/google/status") });
}

function useInvalidateAgenda() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["agenda"] });
  };
}

export function useGenerateSuggestions() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: () => api<{ created: number; items: AgendaItem[] }>("/agenda/generate", { method: "POST" }),
    onSuccess: invalidate,
  });
}
export function useCreateAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: AgendaInput) =>
      api<{ item: AgendaItem }>("/agenda", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}
export function useUpdateAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AgendaPatch }) =>
      api<{ item: AgendaItem }>(`/agenda/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: invalidate,
  });
}
export function useApproveAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api<ApproveResult>(`/agenda/${id}/approve`, { method: "POST" }),
    onSuccess: invalidate,
  });
}
export function useDismissAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api<{ item: AgendaItem }>(`/agenda/${id}/dismiss`, { method: "POST" }),
    onSuccess: invalidate,
  });
}
export function useCompleteAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api<{ item: AgendaItem }>(`/agenda/${id}/complete`, { method: "POST" }),
    onSuccess: invalidate,
  });
}
export function useDeleteAgenda() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean; deleted: string }>(`/agenda/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}
