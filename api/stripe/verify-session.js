import Stripe from "stripe";
import { recordSubscription, setSubscriptionStatus, upsertUser, normalizeStatus } from "../../lib/db";

const isProd = process.env.NODE_ENV === "production";
const stripeSecretKey = isProd
  ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-06-20",
});

const subscriptionStatusFromStripe = (subscription) => {
  if (!subscription) return "INACTIVE";
  const normalized = normalizeStatus(subscription.status) || "INACTIVE";
  return normalized.toLowerCase();
};

export const verifySession = async (sessionId) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  const email = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const priceId = session?.line_items?.data?.[0]?.price?.id;

  let currentPeriodEnd = null;
  let subscriptionStatus = "active";

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    currentPeriodEnd = subscription?.current_period_end || null;
    subscriptionStatus = subscriptionStatusFromStripe(subscription) || "active";
  }

  if (email || customerId) {
    const user = upsertUser({
      email,
      stripeCustomerId: customerId,
      subscriptionStatus,
      plan: "monthly",
      trial: false,
      currentPeriodEnd,
    });

    if (subscriptionId) {
      recordSubscription({
        userId: user.id,
        email: user.email,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: subscriptionStatus,
        priceId,
        lastPaymentDate: currentPeriodEnd,
      });
      setSubscriptionStatus(user.email, subscriptionStatus, currentPeriodEnd, customerId, subscriptionId, currentPeriodEnd);
    }
  }

  return { email, active: subscriptionStatus === "active" };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = req.query?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const result = await verifySession(sessionId.toString());
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to verify session", error);
    res.status(500).json({ error: "Unable to confirm session" });
  }
}
