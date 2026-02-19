import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.VOLKERN_BASE_URL || 'https://volkern.app/api';
const API_KEY = process.env.VOLKERN_API_KEY;

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

async function handleRequest(request: NextRequest, paramsPromise: Promise<{ path: string[] }>) {
    try {
        const { path: pathSegments } = await paramsPromise;
        const searchParams = request.nextUrl.searchParams.toString();

        let cleanApiKey = (API_KEY || '').trim();
        // Remove quotes and non-printable characters or weird encoding
        cleanApiKey = cleanApiKey.replace(/^["']|["']$/g, '').trim();

        // Final aggressive clean: Volkern keys are vk_prod_ followed by alphanumeric. 
        // If there are leading/trailing spaces or hidden chars (\r, \n) after trim, this hits them.
        cleanApiKey = cleanApiKey.replace(/[^a-zA-Z0-9_-]/g, '');

        // Robust URL building
        const baseUrlClean = BASE_URL.replace(/\/$/, '');
        const pathClean = pathSegments.join('/').replace(/^\//, '');
        const url = `${baseUrlClean}/${pathClean}${searchParams ? `?${searchParams}` : ''}`;

        console.log(`[Proxy] ${request.method} -> ${url}`);


        console.log(`[Proxy] Method: ${request.method} | URL: ${url}`);
        console.log(`[Proxy] API Key check - Length: ${cleanApiKey.length} | Starts with: ${cleanApiKey.substring(0, 10)}...`);

        if (!cleanApiKey) {
            console.error('[Proxy Error] VOLKERN_API_KEY is not defined or is empty after cleaning');
            return NextResponse.json({ error: 'Server Configuration Error: Missing or Malformed API Key' }, { status: 500 });
        }

        let body;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                body = await request.json();
                console.log('[Proxy] Request Body:', JSON.stringify(body, null, 2));
            } catch (e) {
                console.warn('[Proxy] Failed to parse request body or body is empty');
            }
        }

        // IMPORTANT: Using X-API-Key as per working test script
        const response = await fetch(url, {
            method: request.method,
            headers: {
                'X-API-Key': cleanApiKey,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual', // Prevent following redirects (like to login page)
        });

        console.log(`[Proxy] Status: ${response.status} from ${url}`);

        if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
            const location = response.headers.get('location');
            console.error(`[Proxy Error] API redirected to: ${location}.`);
            return NextResponse.json({
                error: 'Authentication Redirect',
                details: 'The API redirected to a login page. Check your VOLKERN_API_KEY.',
                target: location
            }, { status: 401 });
        }

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType?.includes('application/json')) {
            data = await response.json();

            // LOG DATA STRUCTURE FOR DEBUGGING (if services list)
            if (pathClean.includes('servicios') && request.method === 'GET') {
                console.log('[Proxy Debug] Services response keys:', Object.keys(data));
            }
        } else {
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('[Proxy Error]:', error);
        return NextResponse.json({
            error: 'Proxy Internal Error',
            message: error.message
        }, { status: 500 });
    }
}
