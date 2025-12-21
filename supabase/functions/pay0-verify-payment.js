import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.BASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  try {
    const { order_id, user_id } = req.body;
    if (!order_id || !user_id) {
      return res.status(400).json({ error: "Missing data" });
    }

    // 1. Get order
    const { data: order } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (!order || order.status !== "PENDING") {
      return res.json({ message: "Already processed" });
    }

    // 2. Call Pay0 STATUS API
    const pay0Res = await fetch(process.env.PAY0_STATUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAY0_USER_TOKEN}`
      },
      body: JSON.stringify({ order_id })
    });

    const pay0 = await pay0Res.json();

    // 3. FAILED
    if (pay0.status !== "SUCCESS") {
      await supabase
        .from("payment_orders")
        .update({ status: "FAILED", verified_at: new Date() })
        .eq("order_id", order_id);

      await supabase
        .from("transactions")
        .update({ status: "FAILED" })
        .eq("order_id", order_id);

      return res.json({ status: "FAILED" });
    }

    // 4. SUCCESS (credit only once)
    if (!order.credited) {
      await supabase.rpc("increment_wallet", {
        uid: user_id,
        amt: order.amount
      });

      await supabase
        .from("payment_orders")
        .update({
          status: "SUCCESS",
          credited: true,
          verified_at: new Date()
        })
        .eq("order_id", order_id);

      await supabase
        .from("transactions")
        .update({ status: "SUCCESS" })
        .eq("order_id", order_id);
    }

    res.json({ status: "SUCCESS" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
        }
