/**
 * Next.js API Route - Payment Proof Upload Proxy
 *
 * This proxy route solves CORS issues by making the API request from the server-side
 * instead of the client-side. The browser makes a same-origin request to this route,
 * which then forwards the multipart/form-data request to the backend API.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    // Get the form data from the request
    const formData = await request.formData();

    // Extract notes from FormData if present (backend expects it as query param)
    const notes = formData.get('notes');

    // Create new FormData with only the file
    const backendFormData = new FormData();
    const file = formData.get('file');
    if (file) {
      backendFormData.append('file', file);
    }

    // Get the backend API URL from environment variables
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.uniformesconsuelorios.com';

    // Build URL with payment_notes query parameter if provided
    let url = `${API_URL}/api/v1/portal/orders/${orderId}/upload-payment-proof`;
    if (notes && typeof notes === 'string' && notes.trim()) {
      url += `?payment_notes=${encodeURIComponent(notes.trim())}`;
    }

    // Forward the request to the backend API
    const response = await fetch(url, {
      method: 'POST',
      body: backendFormData,
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          detail: errorData.detail || 'Error al subir el comprobante',
          ...errorData
        },
        { status: response.status }
      );
    }

    // Return the successful response
    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Error in payment proof upload proxy:', error);
    return NextResponse.json(
      {
        detail: 'Error interno del servidor al procesar la solicitud'
      },
      { status: 500 }
    );
  }
}
