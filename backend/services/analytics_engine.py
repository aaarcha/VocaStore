from backend.services.analytics_brain import detect_analytics_intent
from backend.services.analytics_service import (
    get_top_product,
    get_low_stock,
    get_total_sales,
    get_sales_trend
)

def handle_analytics(command: str, db):

    intent = detect_analytics_intent(command)

    if intent == "TOP_PRODUCT":
        return {
            "type": "success",
            "message": "Top product retrieved",
            "data": get_top_product(db)
        }

    if intent == "LOW_STOCK":
        return {
            "type": "success",
            "message": "Low stock items",
            "data": get_low_stock(db)
        }

    if intent == "TOTAL_SALES":
        return {
            "type": "success",
            "message": "Total sales computed",
            "data": get_total_sales(db)
        }

    if intent == "SALES_TREND":
        return {
            "type": "success",
            "message": "Sales trend loaded",
            "data": get_sales_trend(db)
        }

    return None