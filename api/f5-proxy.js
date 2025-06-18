// Vercel serverless function to proxy F5 API requests
// This solves the Mixed Content issue (HTTPS frontend → HTTP F5 API)

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
      // Forward the request to the F5 API
    const f5Response = await fetch('http://34.100.221.107:8967/f5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    // Check if F5 API request was successful
    if (!f5Response.ok) {
      const errorText = await f5Response.text();
      console.error('F5 API Error:', f5Response.status, errorText);
      return res.status(f5Response.status).json({ 
        error: `F5 API failed: ${f5Response.status}`,
        details: errorText 
      });
    }

    // Get the response data
    const data = await f5Response.json();
    
    // Return the F5 API response
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Proxy request failed',
      details: error.message 
    });
  }
} 