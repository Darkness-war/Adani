// This goes in supabase/functions/pay0-create-order/index.js

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { amount, order_id, user_id, mobile } = await req.json();

    // Verify user exists
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Call PAY0 API (original logic)
    const pay0Response = await fetch('https://api.pay0.in/v1/create-order', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAY0_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        order_id: order_id,
        customer_mobile: mobile,
        callback_url: `${Deno.env.get('SITE_URL')}/payment-success.html?order_id=${order_id}`
      }),
    });

    const pay0Data = await pay0Response.json();

    if (!pay0Data.success) {
      throw new Error(pay0Data.message || 'Payment gateway error');
    }

    // Save payment request to database (original logic)
    const { error: dbError } = await supabaseClient
      .from('payment_requests')
      .insert({
        user_id: user_id,
        user_email: user.email,
        order_id: order_id,
        amount: amount,
        status: 'pending',
        payment_method: 'PAY0',
        gateway_data: pay0Data
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: pay0Data.payment_url,
        order_id: order_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
