export async function POST(request: Request): Promise<Response> {
    const { message, sessionId } = await request.json();
    if(!message || !sessionId) {
        return new Response("Message and sessionId are required", { status: 400 });
    }
    try {
        const apiKey = process.env.CHAT_API_KEY || "";
        if(!apiKey || apiKey === '') throw new Error("CHAT_API_KEY is not set");
        const response = await fetch(`${process.env.APP_API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
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