export async function GET(): Promise<Response> {
  try {
    const response = await fetch(
      `${process.env.APP_API_URL}/guardrails/config`,
      {
        headers: {
          "x-api-key": process.env.CHAT_API_KEY || "",
        },
      },
    );

    if (!response.ok) {
      return new Response("Failed to fetch guardrails config", { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
