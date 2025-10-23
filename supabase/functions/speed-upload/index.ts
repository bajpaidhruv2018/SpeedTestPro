const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = performance.now();
    let receivedBytes = 0;

    // Stream the body and count bytes without storing
    if (req.body) {
      const reader = req.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.length;
      }
    }

    const endTime = performance.now();
    const serverTimeMs = endTime - startTime;

    console.log(`Upload test completed: ${receivedBytes} bytes in ${serverTimeMs}ms`);

    return new Response(
      JSON.stringify({ receivedBytes, serverTimeMs }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
