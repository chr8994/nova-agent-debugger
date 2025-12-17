import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Ensure URL has protocol without trailing slash
    let baseUrl = url.replace(/\/$/, '');
    if (!baseUrl.startsWith('http')) {
      // Default to https unless it's localhost
      if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        baseUrl = `http://${baseUrl}`;
      } else {
        baseUrl = `https://${baseUrl}`;
      }
    }
    
    // Config path: try .well-known/agent-config first, then fallback to root
    const pathsToTry = [
      `${baseUrl}/.well-known/agent-config`,
      `${baseUrl}/api/agent-config`,
      baseUrl
    ];

    let metadata: any = null;
    let fetchError: Error | null = null;

    for (const targetUrl of pathsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        console.log(`[Agent Discovery] Trying ${targetUrl}...`);

        const response = await fetch(targetUrl, {
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            metadata = await response.json();
            
            // Basic validation - check if it looks like an agent config
            if (metadata.name || metadata.agent_id) {
              console.log(`[Agent Discovery] Successful discovery at ${targetUrl}`);
              break;
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Agent Discovery] Failed for ${targetUrl}:`, err.message || err);
        fetchError = err;
      }
    }

    if (!metadata) {
      return NextResponse.json(
        { error: `Could not discover agent metadata. Last error: ${fetchError?.message || 'Unknown error'}` },
        { status: 502 }
      );
    }

    // Normalize metadata to ensure AgentConfig structure
    const normalizedMetadata = {
      ...metadata,
      // Ensure we have at least these fields
      name: metadata.name || metadata.agent_id || 'Unknown Agent',
      version: metadata.version || '0.0.0',
    };

    return NextResponse.json({
      success: true,
      data: normalizedMetadata
    });

  } catch (error: any) {
    console.error('Error in agent discovery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
