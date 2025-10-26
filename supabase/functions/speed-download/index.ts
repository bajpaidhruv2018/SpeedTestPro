const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sizeParam = url.searchParams.get('size');
    const size = sizeParam ? parseInt(sizeParam, 10) : 10_000_000; // Default 10MB
    
    console.log(`Download test requested: ${size} bytes`);

    // Pre-generate 64KB of random data to reuse (avoid getRandomValues quota)
    const chunkSize = 64 * 1024; // 64KB (WebCrypto limit)
    const chunk = new Uint8Array(chunkSize);
    crypto.getRandomValues(chunk);
    
    console.log(`Starting download stream of ${size} bytes...`);

    const stream = new ReadableStream({
      start(controller) {
        let sent = 0;
        const sendChunk = () => {
          if (sent >= size) {
            controller.close();
            return;
          }
          
          const remaining = size - sent;
          const toSend = remaining < chunkSize ? remaining : chunkSize;
          
          if (toSend < chunkSize) {
            controller.enqueue(chunk.slice(0, toSend));
          } else {
            controller.enqueue(chunk);
          }
          
          sent += toSend;
          
          // Continue sending
          if (sent < size) {
            setTimeout(sendChunk, 0);
          } else {
            controller.close();
          }
        };
        
        sendChunk();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'identity',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Content-Length': size.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
