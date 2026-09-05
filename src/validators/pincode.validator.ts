import { z } from "zod";

// Validates 6-digit Indian PIN Code (first digit 1-9, followed by 5 digits 0-9)
export const pincodeParamSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, {
      message: "Invalid Pincode format. Must be a valid 6-digit Indian PIN code (e.g. 632006).",
    }),
});

export const postOfficeSearchSchema = z.object({
  name: z.string().trim().min(2, { message: "Search term must be at least 2 characters" }),
});

export const filterQuerySchema = z.object({
  district: z.string().trim().optional(),
  state: z.string().trim().optional(),
  delivery_status: z.enum(["Delivery", "Non-Delivery"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
