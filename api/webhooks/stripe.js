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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

async function buffer(readable) {
  return await getRawBody(readable);
}

const subscriptionStatusFromStripe = (subscription) => {
  if (!subscription) return null;
  if (subscription.status === "canceled") return "CANCELED";
  if (subscription.status === "past_due" || subscription.status === "unpaid") return "PAST_DUE";
  if (subscription.status === "incomplete" || subscription.status === "incomplete_expired") return "PAST_DUE";
  return normalizeStatus(subscription.status);
};

const activateUserFromSession = async (session) => {
  const email = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const priceId =
    session?.metadata?.price_id || session?.line_items?.[0]?.price?.id || session?.metadata?.priceId;

  let currentPeriodEnd = null;
  let subscriptionStatus = "ACTIVE";

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    currentPeriodEnd = subscription?.current_period_end || null;
    subscriptionStatus = subscriptionStatusFromStripe(subscription) || "ACTIVE";
  }

  if (email || customerId) {
    const user = upsertUser({
      email,
      stripeCustomerId: customerId,
      subscriptionStatus,
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
};

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    console.error("[STRIPE EVENT] missing signature header");
    return res.status(400).end("Webhook signature missing");
  }

  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err.message);
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
        console.log(
          "[STRIPE EVENT]",
          type,
          session.customer,
          session.subscription,
          session.customer_details?.email || session.customer_email,
          "active"
        );
        await activateUserFromSession(session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const status = subscriptionStatusFromStripe(subscription);
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const currentPeriodEnd = subscription.current_period_end;
        const email = subscription.customer_email;
        const isActive = status === "ACTIVE";
        console.log("[STRIPE EVENT]", type, customerId, subscription.id, email, status);
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: status,
            currentPeriodEnd,
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
              status: isActive ? "ACTIVE" : status,
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

        console.log("[STRIPE EVENT]", type, customerId, subscriptionId, email, "succeeded");
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: "ACTIVE",
            currentPeriodEnd,
            lastPaymentDate: paidAt,
          });
          recordSubscription({
            userId: user.id,
            email: user.email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "ACTIVE",
            priceId,
            lastPaymentDate: paidAt,
          });
          setSubscriptionStatus(user.email, "ACTIVE", currentPeriodEnd, customerId, subscriptionId, paidAt);
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
        console.log("[STRIPE EVENT]", type, customerId, subscriptionId, email, "failed");
        if (customerId || email) {
          const user = upsertUser({
            stripeCustomerId: customerId,
            email,
            subscriptionStatus: "PAST_DUE",
            currentPeriodEnd,
            lastPaymentDate: paidAt,
          });
          recordSubscription({
            userId: user.id,
            email: user.email,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "PAST_DUE",
            priceId,
            lastPaymentDate: paidAt,
          });
          setSubscriptionStatus(user.email, "PAST_DUE", currentPeriodEnd, customerId, subscriptionId, paidAt);
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
