from agent.db.main import supabase
from strands import tool
from typing import Optional


@tool
def get_menu(
    category: Optional[str] = None,
    dietary_tag: Optional[list] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
) -> list:
    """
    Get menu items from the restaurant database.

    Args:
        category: Filter by category. Options: appetizer, main, dessert, drinks, wine.
        If not provided, returns all items.
        dietary_tag: Check if the dishes has certain restrictions. Examples: vegetarian, vegan, gluten-free

    Returns:
        List of menu items with name, description, price and dieatry tags.
    """

    try:
        query = supabase.table("menu_items").select("*")

        if category:
            query = query.eq("category", category)

        if dietary_tag:
            query = query.contains("dietary_tags", dietary_tag)

        if min_price is not None:
            query = query.gte("price", min_price)
        if max_price is not None:
            query = query.lte("price", max_price)

        result = query.execute()

        return result.data

    except Exception as e:
        return {"error": str(e)}
