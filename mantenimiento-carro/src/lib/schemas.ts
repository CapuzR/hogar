import { z } from "zod";

/** Payload de un pago enlazado a un evento (enlace a YNAB o monto historico). */
export const paymentInput = z.object({
  ynab_transaction_id: z.string().optional(),
  notion_client_id: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  amount_usdt: z.number().optional(),
  rate_used: z.number().optional(),
  rate_source: z.string().optional(),
  money_source: z.enum(["ynab", "historical", "manual_estimate"]).optional(),
});

/** Payload de ingesta / alta de evento (PLAN.md §9). */
export const eventInput = z.object({
  client_id: z.string().min(1).optional(), // idempotencia; se genera si falta
  car: z.string().optional(), // slug (optra | clio); ausente/unknown -> sin carro
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "fecha ISO (YYYY-MM-DD)"),
  odometer: z.number().int().nonnegative().optional(),
  // key ya resuelta; acepta string O lista (el skill de agentes manda lista aqui).
  service_type: z.union([z.string(), z.array(z.string())]).optional(),
  service_types: z.array(z.string()).optional(), // varias por visita (forma alterna)
  text: z.string().optional(), // texto libre a normalizar
  title: z.string().optional(),
  description: z.string().optional(),
  vendor: z.string().optional(),
  performed_by: z.enum(["shop", "self"]).optional(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  needs_review: z.boolean().optional(),
  payments: z.array(paymentInput).optional(),
});
export type EventInput = z.infer<typeof eventInput>;

/** PATCH de un evento (edicion / aprobacion desde la cola de revision). */
export const eventPatch = z.object({
  car: z.string().nullable().optional(), // slug o null (des-asignar)
  date: z.string().optional(),
  odometer: z.number().int().nonnegative().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  service_type: z.string().optional(), // reemplaza el/los servicios por esta key
  service_types: z.array(z.string()).optional(),
  needs_review: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  approve: z.boolean().optional(), // atajo: aprobar (needs_review=0, confidence=1)
  amount_usdt: z.number().optional(), // ajusta el monto del pago principal
});
export type EventPatch = z.infer<typeof eventPatch>;

export const normalizeInput = z.object({ text: z.string().min(1) });
export const batchInput = z.object({ events: z.array(eventInput).min(1).max(50) });
