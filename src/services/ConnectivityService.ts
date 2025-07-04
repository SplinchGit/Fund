const testAPIConnectivity = async (): Promise<void> => {
  const apiBase = import.meta.env.VITE_AMPLIFY_API;
  
  if (!apiBase) {
    console.error('[main.tsx] ❌ VITE_AMPLIFY_API not configured!');
    console.error('[main.tsx] Please add VITE_AMPLIFY_API to your .env.local file');
    return;
  }

  console.log('[main.tsx] 🔍 Testing API connectivity to:', apiBase);
  
  try {
    // Test basic connectivity to campaigns endpoint
    const testUrl = `${apiBase}/campaigns`;
    console.log('[main.tsx] Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    });
    
    console.log('[main.tsx] API Test Result:', {
      url: testUrl,
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (response.ok) {
      console.log('[main.tsx] ✅ API connectivity test PASSED');
      try {
        const data = await response.json();
        console.log('[main.tsx] Sample API response:', data);
      } catch (jsonError) {
        console.log('[main.tsx] ⚠️ Response received but not JSON format');
      }
    } else {
      console.warn('[main.tsx] ⚠️ API responded with error status:', response.status);
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.warn('[main.tsx] Error response:', errorText);
    }
  } catch (error) {
    console.error('[main.tsx] ❌ API connectivity test FAILED:', error);
    
    // Provide specific error guidance
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('[main.tsx] This is likely a CORS or network connectivity issue');
      console.error('[main.tsx] Check: 1) API Gateway CORS settings, 2) Network connection, 3) API URL correctness');
    } else if (error instanceof TypeError && error.message.includes('NetworkError')) {
      console.error('[main.tsx] Network error - check your internet connection');
    }
  }
};

export default testAPIConnectivity;
