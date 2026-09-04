export async function GET(): Promise<Response> {
  try {
    const response = await fetch(`${process.env.APP_API_URL}/prompt/config`, {
      headers: {
        "x-api-key": process.env.CHAT_API_KEY || "",
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch prompt config", { status: response.status });
    }

    return Response.json(await response.json());
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
