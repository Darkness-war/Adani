import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));

serve(async () => {
  const { data: rewards } = await supabase
    .from("referral_earnings")
    .select("*")
    .eq("status", "locked");

  const now = Date.now();

  for (const r of rewards) {
    if (now - new Date(r.created_at).getTime() >= 86400000) {
      await supabase
        .from("referral_earnings")
        .update({ status: "ready" })
        .eq("id", r.id);
    }
  }

  return new Response("Done");
});
