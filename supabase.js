// supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://zrufavpxsnootmvwybye.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EvHDWxi1BcEjcv_UnycVIQ_3T-V_A5s";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function addReferralIncome(userId, amount) {
  const { error } = await supabase.rpc("increment_referral_income", {
    p_user_id: userId,
    p_amount: amount
  });

  if (error) console.error("Referral wallet update error:", error.message);
}
