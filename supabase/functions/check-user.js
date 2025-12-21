// api/check-user.js
// Vercel Serverless function — checks Supabase Auth users using service_role key.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, phone } = req.body || {};

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      return res.status(500).json({ error: "Server not configured (missing env vars)" });
    }

    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/$/, ""); // no trailing slash

    // Fetch users (paginated). For small projects this is ok.
    // We'll loop pages until found or exhausted.
    let page = 1;
    const perPage = 100; // admin list page size
    let emailExists = false;
    let phoneExists = false;
    let foundEmailForPhone = null;

    while (true) {
      const url = `${SUPABASE_URL}/auth/v1/admin/users?limit=${perPage}&page=${page}`;
      const resp = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apiKey: SERVICE_ROLE,
        },
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(500).json({ error: "Bad response from Supabase admin: " + txt });
      }

      const json = await resp.json();
      const users = json.users || [];

      for (const u of users) {
        if (email && u.email && u.email.toLowerCase() === email.toLowerCase()) {
          emailExists = true;
        }
        // user_metadata may contain phone (depends on how you store it)
        const metaPhone = u.user_metadata && (u.user_metadata.phone || u.user_metadata?.phone_number || null);
        if (phone && metaPhone && metaPhone.toString() === phone.toString()) {
          phoneExists = true;
          // keep the email if we need to log in by phone
          foundEmailForPhone = u.email;
        }
      }

      // stop early if both found
      if ((email && emailExists) && (phone && phoneExists)) break;

      // stop if fewer than page size returned -> no more pages
      if (users.length < perPage) break;

      page += 1;
      // safety: avoid infinite loop
      if (page > 20) break;
    }

    return res.json({ emailExists, phoneExists, foundEmailForPhone: foundEmailForPhone || null });
  } catch (err) {
    console.error("check-user error:", err);
    return res.status(500).json({ error: String(err) });
  }
}
