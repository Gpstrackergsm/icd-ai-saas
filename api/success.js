import { verifySession } from "./stripe/verify-session";

export default async function handler(req, res) {
  const sessionId = req.query?.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: "Missing session_id" });
  }

  try {
    const result = await verifySession(sessionId.toString());
    if (result.active) {
      res.writeHead(302, { Location: "/thank-you" });
      res.end();
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to confirm success session", error);
    res.status(500).json({ error: "Unable to confirm session" });
  }
}
