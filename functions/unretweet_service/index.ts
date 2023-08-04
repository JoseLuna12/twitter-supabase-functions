
import { serve, } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0"


const RETWEET = {
  retweeted: "RETWEETED",
  unretweeted: "UNRETWEETED"
}

const MAXRETWEETTIME = 480 * 60000
//480 * 60000

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const currDate = new Date()
  const rangeDate = new Date(currDate.getTime() - MAXRETWEETTIME);
  const { data } = await supabaseClient.from("movies_retweeted").select().lt('created_at', rangeDate.toISOString()).eq('status', RETWEET.retweeted);

  if (!data) {
    throw ("data is empty")
  }

  const toUnretweet = data.map(d => d.tweet_id)

  await fetch('https://twitter-bot-movie.onrender.com/api/tweet/unretweet/', { method: "POST", body: JSON.stringify({ tweetIds: toUnretweet }), headers: { "Content-Type": "application/json", auth: "1718556598" } })

  const unretweetPromises = data.map(u => {
    return supabaseClient.from('movies_retweeted').update({ status: RETWEET.unretweeted }).eq('id', u.id).select()
  })

  const result = await Promise.all(unretweetPromises)

  return new Response(
    JSON.stringify(result),
    { headers: { "Content-Type": "application/json" } },
  )
})


//curl -L -X POST 'https://lgjdnrdbptnmmkehwbag.functions.supabase.co/unretweet_service' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnamRucmRicHRubW1rZWh3YmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njk1NjIxNzIsImV4cCI6MTk4NTEzODE3Mn0.QLbvyxxeHTftESGIhf_G5EtG0m4EgQolPgB-Hgrgtug' --data '{"name":"Functions"}'