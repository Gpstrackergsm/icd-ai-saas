import Stripe from "stripe";
import { upsertUser, recordSubscription, setSubscriptionStatus } from "../lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export default async function handler(req, res) {
  const sessionId = req.query?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session?.line_items?.data?.[0]?.price?.id;

    let currentPeriodEnd = null;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      currentPeriodEnd = subscription?.current_period_end || null;
      setSubscriptionStatus(subscription?.customer_email || email, subscription?.status || "active", currentPeriodEnd);
    }

    if (email || customerId) {
      const user = upsertUser({
        email,
        stripeCustomerId: customerId,
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd,
      });
      if (subscriptionId) {
        recordSubscription({
          userId: user.id,
          stripeSubscriptionId: subscriptionId,
          status: "ACTIVE",
          priceId,
        });
      }
    }

    res.status(200).json({ email, active: true });
  } catch (error) {
    console.error("Failed to confirm success session", error);
    res.status(500).json({ error: "Unable to confirm session" });
  }
}
