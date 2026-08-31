export async function POST(request: Request): Promise<Response> {
    const { message, sessionId } = await request.json();
    if(!message || !sessionId) {
        return new Response("Message and sessionId are required", { status: 400 });
    }
    try {
        const response = await fetch(`${process.env.APP_API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message, session_id: sessionId }),
        });
        if (!response.ok) {
            return new Response("Failed to send message", { status: 500 });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
        return new Response("Internal server error", { status: 500 });
    }
}