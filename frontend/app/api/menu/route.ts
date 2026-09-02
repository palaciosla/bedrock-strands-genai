export async function GET(): Promise<Response> {
  try {
    const response = await fetch(`${process.env.APP_API_URL}/menu`, {
      headers: {
        "x-api-key": process.env.CHAT_API_KEY || "",
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch menu", { status: 500 });
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
