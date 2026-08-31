export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("sessionId is required", { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.APP_API_URL}/reservations?session_id=${encodeURIComponent(sessionId)}`,
    );

    if (!response.ok) {
      return new Response("Failed to fetch reservations", { status: 500 });
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
