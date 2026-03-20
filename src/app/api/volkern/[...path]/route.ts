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
        cleanApiKey = cleanApiKey.replace(/^["']|["']$/g, '').trim();
        cleanApiKey = cleanApiKey.replace(/[^a-zA-Z0-9_-]/g, '');

        const baseUrlClean = BASE_URL.replace(/\/$/, '');
        const pathClean = pathSegments.join('/').replace(/^\//, '');
        const url = `${baseUrlClean}/${pathClean}${searchParams ? `?${searchParams}` : ''}`;

        console.log(`[Proxy] ${request.method} -> ${url}`);

        if (!cleanApiKey) {
            console.error('[Proxy Error] VOLKERN_API_KEY is not defined or is empty');
            return NextResponse.json({ error: 'Server Configuration Error: Missing API Key' }, { status: 500 });
        }

        let body;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                body = await request.json();
                console.log('[Proxy] Request Body JSON size:', JSON.stringify(body).length);
            } catch (e) {
                console.warn('[Proxy] Failed to parse request body');
            }
        }

        // Update: Use Authorization: Bearer as standard, fallback to X-API-Key
        const response = await fetch(url, {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${cleanApiKey}`,
                'X-API-Key': cleanApiKey, // Keep for backward compatibility
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual',
        });

        console.log(`[Proxy] Response Status: ${response.status}`);

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            console.warn(`[Proxy Warning] API Redirect detected: ${location}`);
            if (location?.includes('login')) {
                return NextResponse.json({
                    error: 'Authentication Error',
                    details: 'The API redirected to a login page. Check your API key permissions.'
                }, { status: 401 });
            }
        }

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType?.includes('application/json')) {
            data = await response.json();

            // Special debug for catalog and leads to ensure we see the structure
            if (pathClean.includes('catalogo') || pathClean.includes('leads')) {
                console.log(`[Proxy Debug] ${pathClean} response structure keys:`, Object.keys(data));
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
