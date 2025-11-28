import Stripe from "stripe";
import {
  createSession,
  normalizeStatus,
  recordSubscription,
  setSubscriptionStatus,
  upsertUser,
} from "../../lib/db";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const setSessionCookie = (res, token, ttlSeconds = SESSION_TTL_SECONDS) => {
  const cookie = [
    `session_token=${encodeURIComponent(token)}`,
    `Max-Age=${ttlSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  res.setHeader("Set-Cookie", cookie.join("; "));
};

const redirect = (res, location) => {
  res.writeHead(302, { Location: location });
  res.end();
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end("Method Not Allowed");
    return;
  }

  const sessionId = req.query?.session_id?.toString();
  if (!sessionId) {
    redirect(res, "/error");
    return;
  }

  if (!stripeSecretKey || stripeSecretKey.startsWith("sk_test_")) {
    console.error("Stripe secret key is missing or not a live key");
    redirect(res, "/error");
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "line_items"],
    });

    const isPaid =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      session.subscription?.status === "active";

    if (!isPaid) {
      redirect(res, "/payment-failed");
      return;
    }

    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const subscriptionStatus = normalizeStatus(
      (typeof session.subscription === "string" ? null : session.subscription?.status) ||
        "active"
    );
    const currentPeriodEnd =
      typeof session.subscription === "string"
        ? null
        : session.subscription?.current_period_end || null;
    const priceId = session?.line_items?.data?.[0]?.price?.id;

    if (!email) {
      redirect(res, "/error");
      return;
    }

    const user = upsertUser({
      email,
      stripeCustomerId: customerId,
      subscriptionStatus,
      currentPeriodEnd,
      plan: subscriptionStatus === "ACTIVE" ? "paid" : null,
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
        currentPeriodEnd,
        subscriptionStatus === "ACTIVE" ? "paid" : null
      );
    }

    if (user?.id) {
      const issuedSession = createSession({ userId: user.id, email: user.email });
      setSessionCookie(res, issuedSession.id);
    }

    redirect(res, "/dashboard");
  } catch (error) {
    console.error("Stripe success handler failed", error);
    redirect(res, "/error");
  }
}
