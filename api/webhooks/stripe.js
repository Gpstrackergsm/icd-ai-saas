import Stripe from "stripe";
import getRawBody from "raw-body";
import {
  upsertUser,
  recordSubscription,
  recordWebhookEvent,
  hasProcessedEvent,
  recordPayment,
  setSubscriptionStatus,
  normalizeStatus,
} from "../../lib/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

const isProd = process.env.NODE_ENV === "production";
const stripeSecretKey = isProd
  ? process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
const webhookSecret = isProd
  ? process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET
  : process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-06-20",
});

async function buffer(readable) {
  return await getRawBody(readable);
}

const subscriptionStatusFromStripe = (subscription) => {
  if (!subscription) return null;
  const value = normalizeStatus(subscription.status);
  if (value === "CANCELED") return "canceled";
  if (value === "PAST_DUE") return "past_due";
  return (value || "").toLowerCase();
};

const activateUserFromSession = async (session) => {
  const email = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const priceId =
    session?.metadata?.price_id || session?.line_items?.[0]?.price?.id || session?.metadata?.priceId;

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
      setSubscriptionStatus(
        user.email,
        subscriptionStatus,
        currentPeriodEnd,
        customerId,
        subscriptionId,
        currentPeriodEnd
      );
    }
  }
};

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || !webhookSecret) {
    console.error("[STRIPE EVENT] missing signature header or secret", {
      hasSignature: Boolean(sig),
      hasSecret: Boolean(webhookSecret),
    });
    return res.status(400).end("Webhook signature missing");
  }

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err?.message || err);
    return res.status(400).end("Invalid signature");
  }

  if (hasProcessedEvent(event.id)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const processEvent = async () => {
    const type = event.type;
    switch (type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("[STRIPE EVENT]", type, {
          customer: session.customer,
          subscription: session.subscription,
          email: session.customer_details?.email || session.customer_email,
          status: "active",
        });
        await activateUserFromSession(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscriptionStatusFromStripe(subscription);
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const currentPeriodEnd = subscription.current_period_end;
        const email = subscription.customer_email;
        const isActive = status === "active";
        console.log("[STRIPE EVENT]", type, {
          customer: customerId,
          subscription: subscription.id,
          email,
          status,
        });
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: status,
            currentPeriodEnd,
            plan: "monthly",
            trial: false,
          });
          if (user) {
            setSubscriptionStatus(
              user.email,
              status,
              currentPeriodEnd,
              customerId,
              subscription.id,
              subscription.current_period_end
            );
            recordSubscription({
              userId: user.id,
              email: user.email,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              status: isActive ? "active" : status,
              priceId,
              lastPaymentDate: subscription.current_period_end,
            });
          }
        }
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const paidAt = invoice.status_transitions?.paid_at || invoice.created;
        const currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end || null;

        console.log("[STRIPE EVENT]", type, {
          customer: customerId,
          subscription: subscriptionId,
          email,
          status: "active",
        });
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: "active",
            currentPeriodEnd,
            lastPaymentDate: paidAt,
            plan: "monthly",
            trial: false,
          });
          recordSubscription({
            userId: user.id,
            email: user.email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            priceId,
            lastPaymentDate: paidAt,
          });
          setSubscriptionStatus(user.email, "active", currentPeriodEnd, customerId, subscriptionId, paidAt);
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
            paidAt,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const paidAt = invoice.status_transitions?.paid_at || invoice.created;
        const currentPeriodEnd = invoice.lines?.data?.[0]?.period?.end || null;
        console.log("[STRIPE EVENT]", type, {
          customer: customerId,
          subscription: subscriptionId,
          email,
          status: "past_due",
        });
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: "past_due",
            currentPeriodEnd,
            lastPaymentDate: paidAt,
            plan: "monthly",
            trial: false,
          });
          recordSubscription({
            userId: user.id,
            email: user.email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "past_due",
            priceId,
            lastPaymentDate: paidAt,
          });
          setSubscriptionStatus(user.email, "past_due", currentPeriodEnd, customerId, subscriptionId, paidAt);
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "failed",
            paidAt,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const email = subscription.customer_email;
        console.log("[STRIPE EVENT]", type, {
          customer: customerId,
          subscription: subscription.id,
          email,
          status: "canceled",
        });
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: "canceled",
            plan: "monthly",
            trial: false,
          });
          setSubscriptionStatus(user.email, "canceled", subscription.current_period_end, customerId, subscription.id, null);
        }
        break;
      }
      default:
        console.log("[STRIPE EVENT]", type, "ignored");
        break;
    }
  };

  try {
    await processEvent();
    recordWebhookEvent(event.id);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    res.status(400).json({ received: false });
  }
}

export default handler;
