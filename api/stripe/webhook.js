import Stripe from "stripe";
import getRawBody from "raw-body";
import { upsertUser, recordSubscription, recordWebhookEvent, hasProcessedEvent, recordPayment, setSubscriptionStatus } from "../../lib/db";

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

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
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

  const processEvent = () => {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (email) {
          const user = upsertUser({ email, stripeCustomerId: customerId, subscriptionStatus: "active" });
          if (subscriptionId) {
            recordSubscription({
              userId: user.id,
              stripeSubscriptionId: subscriptionId,
              status: "active",
              priceId: session?.metadata?.price_id || session?.line_items?.[0]?.price?.id || session?.metadata?.priceId,
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const status = subscription.status === "active" ? "active" : subscription.cancel_at_period_end ? "canceled" : subscription.status;
        const customerId = subscription.customer;
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const currentPeriodEnd = subscription.current_period_end;
        if (customerId) {
          const user = upsertUser({ stripeCustomerId: customerId, email: subscription?.customer_email });
          if (user) {
            setSubscriptionStatus(user.email, status === "active" ? "active" : status, currentPeriodEnd);
            recordSubscription({
              userId: user.id,
              stripeSubscriptionId: subscription.id,
              status,
              priceId,
            });
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        if (customerId || email) {
          const user = upsertUser({ stripeCustomerId: customerId, email, subscriptionStatus: "active" });
          recordSubscription({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            priceId: invoice.lines?.data?.[0]?.price?.id,
          });
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
            paidAt: invoice.status_transitions?.paid_at || invoice.created,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const email = invoice.customer_email;
        const subscriptionId = invoice.subscription;
        if (customerId || email) {
          const user = upsertUser({ stripeCustomerId: customerId, email, subscriptionStatus: "past_due" });
          recordSubscription({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            status: "past_due",
            priceId: invoice.lines?.data?.[0]?.price?.id,
          });
          recordPayment({
            invoiceId: invoice.id,
            customerId,
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            status: "failed",
            paidAt: invoice.created,
          });
        }
        break;
      }
      default:
        break;
    }
  };

  try {
    processEvent();
    recordWebhookEvent(event.id);
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    res.status(500).json({ received: false });
  }
}

export default handler;
