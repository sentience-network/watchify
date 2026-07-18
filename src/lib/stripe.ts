import Stripe from "stripe";
import { getStripePriceId, stripeConfigured, type PlanId } from "./plans";

let stripeClient: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  if (!process.env.STRIPE_SECRET_KEY) {
    stripeClient = null;
    return null;
  }
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function isStripeReady(): boolean {
  return (
    stripeConfigured() &&
    Boolean(getStripePriceId("plus") || getStripePriceId("party"))
  );
}

/** When true, Checkout sessions request automatic_tax (enable Tax in Stripe Dashboard). */
export function stripeTaxEnabled(): boolean {
  return process.env.STRIPE_TAX_ENABLED === "true";
}

export function planFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRICE_PARTY) return "party";
  if (priceId === process.env.STRIPE_PRICE_PLUS) return "plus";
  return "free";
}
