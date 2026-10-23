import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

export function isValidStellarAddress(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (StrKey.isValidEd25519PublicKey(trimmed)) {
    return true;
  }
  if (typeof StrKey.isValidContract === "function" && StrKey.isValidContract(trimmed)) {
    return true;
  }
  return false;
}

export function isSelfEscrowAddress(buyerAddress?: string | null, sellerAddress?: string | null): boolean {
  if (!buyerAddress || !sellerAddress) return false;
  const buyer = buyerAddress.trim().toUpperCase();
  const seller = sellerAddress.trim().toUpperCase();
  return buyer !== "" && buyer === seller;
}

export const step1Schema = z
  .object({
    commodity: z.string().min(1, "Select a commodity"),
    quantity: z.string().refine(
      (val) => {
        const n = parseFloat(val);
        return !isNaN(n) && n > 0;
      },
      { message: "Quantity must be greater than 0" }
    ),
    unit: z.string().min(1, "Select a unit"),
    pricePerUnit: z.string().refine(
      (val) => {
        const n = parseFloat(val);
        return !isNaN(n) && n > 0;
      },
      { message: "Price must be greater than 0" }
    ),
    currency: z.string().min(1),
    buyerAddress: z.string().optional(),
    sellerAddress: z.string().refine(
      (val) => isValidStellarAddress(val),
      { message: "Invalid Stellar public key" }
    ),
  })
  .superRefine((data, ctx) => {
    if (isSelfEscrowAddress(data.buyerAddress, data.sellerAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buyer and seller Stellar addresses cannot be identical",
        path: ["sellerAddress"],
      });
    }
  });

export const step2Schema = z.object({
  buyerRatio: z.number().min(0).max(100),
  sellerRatio: z.number().min(0).max(100),
  deliveryDays: z.string().refine(
    (val) => {
      const n = parseInt(val);
      return !isNaN(n) && n >= 1 && n <= 90;
    },
    { message: "Delivery window must be between 1 and 90 days" }
  ),
});

export const step3Schema = z
  .object({
    commodity: z.string().min(1),
    quantity: z.string().min(1),
    unit: z.string().min(1),
    pricePerUnit: z.string().min(1),
    currency: z.string().min(1),
    buyerAddress: z.string().optional(),
    sellerAddress: z.string().refine((val) => isValidStellarAddress(val), {
      message: "Invalid Stellar public key",
    }),
    buyerRatio: z.number(),
    sellerRatio: z.number(),
    deliveryDays: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (isSelfEscrowAddress(data.buyerAddress, data.sellerAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buyer and seller Stellar addresses cannot be identical",
        path: ["sellerAddress"],
      });
    }
  });

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;

export function validateStep1(
  data: Record<string, unknown>,
  buyerAddress?: string | null
): Record<string, string> {
  const payload =
    buyerAddress && !data.buyerAddress ? { ...data, buyerAddress } : data;
  const result = step1Schema.safeParse(payload);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) errors[path] = issue.message;
  }
  return errors;
}

export function validateStep2(data: { buyerRatio: number; sellerRatio: number; deliveryDays: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.buyerRatio + data.sellerRatio !== 100) {
    errors.sum = "Loss ratios must sum to 100%";
  }
  const result = step2Schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = issue.message;
    }
  }
  return errors;
}
