from dotenv import load_dotenv

from agent.tools.menu import get_menu

load_dotenv()


print(get_menu())
print(get_menu(category="main"))
print(get_menu(dietary_tag=["vegetarian"]))
