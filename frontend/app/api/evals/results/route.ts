export async function GET(): Promise<Response> {
  try {
    const response = await fetch(`${process.env.APP_API_URL}/eval/results`, {
      headers: {
        "x-api-key": process.env.CHAT_API_KEY || "",
      },
    });

    if (!response.ok) {
      return new Response("Failed to fetch eval results", { status: response.status });
    }

    return Response.json(await response.json());
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
