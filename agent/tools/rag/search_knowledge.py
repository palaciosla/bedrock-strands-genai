import boto3
import os
from dotenv import load_dotenv
from strands import tool

load_dotenv()

client = boto3.client("bedrock-agent-runtime", region_name=os.environ.get("AWS_REGION"))


@tool
def search_knowledge(query: str) -> dict:
    """
    Search the knowledge base for policies, history, FAQs, and general information.

    Use for questions about restaurant policies, story, rules, FAQS.
    DO NOT use for menu information, prices or reservations.

    Args:
        query: User's question or search terms

    Returns:
        Dict with success satus and relevant document excerpts
    """

    if not query:
        return {
            "success": False,
            "message": "Es necesario un tema para generar la consulta a la knowledge DB",
        }

    try:
        response = client.retrieve(
            knowledgeBaseId=os.environ["KNOWLEDGE_BASE_ID"],
            retrievalQuery={"text": f"{query}"},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": 3,
                }
            },
        )

        results = []

        for item in response.get("retrievalResults", []):
            results.append(
                {
                    "text": item["content"]["text"],
                    "score": round(item.get("score", 0), 3),
                }
            )

        if not results:
            return {
                "success": False,
                "message": "No encontre informacion sobre tu consulta!",
            }

        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "message": str(e)}
