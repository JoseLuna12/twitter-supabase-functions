import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );
  const { data } = await supabaseClient
    .from("tweet_later")
    .select()
    .order("created_at", { ascending: true });
  const tweet_later = data?.pop();

  if (tweet_later) {
    const tweetId = tweet_later.movie_tweetid;
    if (tweetId) {
      await fetch("https://twitter-bot-movie.onrender.com/api/tweet/", {
        method: "POST",
        headers: { auth: "1718556598" },
        body: JSON.stringify({ id: tweetId }),
      });
    }
  }

  return new Response(JSON.stringify(tweet_later), {
    headers: { "Content-Type": "application/json" },
  });
});
