import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

const RETWEET = {
  retweeted: "RETWEETED",
  unretweeted: "UNRETWEETED",
};

interface ReturnCandidateType {
  id: string;
  tweet_id: string;
  status: string;
}

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  const { data } = await supabaseClient
    .from("movies_tweet")
    .select()
    .order("last_retweeted_date", { ascending: true });
  const retweetCandidate = await getRetweetCandidate(
    null,
    data,
    supabaseClient
  );

  if (!retweetCandidate?.tweet_id) {
    throw `error no tweet id: ${JSON.stringify(retweetCandidate)}`;
  }

  await fetch(
    "https://twitter-bot-movie.onrender.com/api/tweet/retweet/" +
      retweetCandidate.tweet_id,
    { headers: { auth: "1718556598" } }
  );

  const currentDate = new Date().toDateString();
  const response = await supabaseClient
    .from("movies_tweet")
    .update({ last_retweeted_date: currentDate })
    .eq("id", retweetCandidate.id)
    .select();
  await supabaseClient
    .from("movies_retweeted")
    .insert({
      status: RETWEET.retweeted,
      tweet_id: retweetCandidate.tweet_id,
      movie_id: retweetCandidate.id,
    });

  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
});

async function getRetweetCandidate(
  currentCandidate: any,
  list: any,
  supabaseClient: any
): Promise<ReturnCandidateType | null> {
  if (currentCandidate == null) {
    currentCandidate = list.pop();

    if (!isCurrentCandidateOldEnough(currentCandidate)) {
      currentCandidate = null;
    }

    if (
      currentCandidate?.tweet_id &&
      currentCandidate?.tweet_type != "thread"
    ) {
      const { data } = await supabaseClient
        .from("movies_retweeted")
        .select()
        .eq("tweet_id", currentCandidate.tweet_id);

      data.forEach((d: ReturnCandidateType) => {
        if (d.status == RETWEET.retweeted) {
          currentCandidate = null;
        }
      });
    } else {
      currentCandidate = null;
    }
    return getRetweetCandidate(currentCandidate, list, supabaseClient);
  } else {
    return currentCandidate;
  }
}

function isCurrentCandidateOldEnough(currCandidate: any) {
  const date = new Date();
  date.setHours(date.getHours() - 168);

  const tweetCreatedAt = new Date(currCandidate?.created_at);

  return tweetCreatedAt.getTime() < date.getTime();
}
