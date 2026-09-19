import { createServerFn } from "@tanstack/react-start";
import { createServerSupabaseClient } from "./server";

export const getSessionServerFn = createServerFn({ method: "GET" }).handler(
  async (ctx) => {
    const req = ctx.request;
    if (!req) {
       console.log('No request found in context');
       return null;
    }
    const supabase = createServerSupabaseClient(req as Request);
    const { data } = await supabase.auth.getSession();
    return data.session;
  }
);
