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
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    // Get the form data from the request
    const formData = await request.formData();

    // Get the backend API URL from environment variables
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.uniformesconsuelorios.com';

    // Forward the request to the backend API
    const response = await fetch(`${API_URL}/api/v1/portal/orders/${orderId}/upload-payment-proof`, {
      method: 'POST',
      body: formData,
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
