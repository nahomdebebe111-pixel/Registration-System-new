import { Context } from "@netlify/functions";

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { password } = await request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || 'Nahom@110108';

    if (!password) {
      return new Response(JSON.stringify({ success: false, error: 'Password is required' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (password === expectedPassword) {
      return new Response(JSON.stringify({ success: true, token: 'chercher_authenticated_admin_session' }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Incorrect Password' }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || "Invalid JSON in request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
