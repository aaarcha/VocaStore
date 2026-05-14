def detect_analytics_intent(command: str):
    command = command.lower()

    if any(x in command for x in ["pinakamabenta", "top product", "best selling"]):
        return "TOP_PRODUCT"

    if any(x in command for x in ["low stock", "kulang stock", "ubos stock"]):
        return "LOW_STOCK"

    if any(x in command for x in ["sales trend", "trend", "benta ngayon"]):
        return "SALES_TREND"

    if any(x in command for x in ["total sales", "kita", "revenue"]):
        return "TOTAL_SALES"

    return None