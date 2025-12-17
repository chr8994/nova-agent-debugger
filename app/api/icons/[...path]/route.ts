import { NextRequest, NextResponse } from 'next/server';

// Proxy icon requests to the agent service
// This allows relative URLs like /icons/astro.png to be fetched from the agent
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Get the agent service URL from the query parameter or cookie
    const serviceUrl = request.nextUrl.searchParams.get('serviceUrl') || 
                       request.cookies.get('nova-debugger-service-url')?.value ||
                       'http://localhost:3000';
    
    // Reconstruct the icon path
    const iconPath = params.path.join('/');
    const targetUrl = `${serviceUrl.replace(/\/$/, '')}/icons/${iconPath}`;
    
    console.log(`[Icon Proxy] Fetching ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      console.warn(`[Icon Proxy] Failed to fetch ${targetUrl}: ${response.status}`);
      // Return a transparent 1x1 pixel as fallback
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );
      return new NextResponse(transparentPixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const imageData = await response.arrayBuffer();

    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('[Icon Proxy] Error:', error);
    // Return a transparent 1x1 pixel as fallback
    const transparentPixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    return new NextResponse(transparentPixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    });
  }
}
