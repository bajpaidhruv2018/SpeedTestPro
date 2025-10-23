const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get('upgrade') || '';
  
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log('WebSocket ping connection opened');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Echo back with server timestamp
      socket.send(JSON.stringify({
        ...data,
        serverTime: Date.now(),
      }));
    } catch (error) {
      console.error('Ping message error:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket ping connection closed');
  };

  return response;
});
