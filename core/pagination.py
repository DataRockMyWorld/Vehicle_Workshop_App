"""Custom pagination for dropdowns and lists."""
from rest_framework.pagination import PageNumberPagination


class PageSizePagination(PageNumberPagination):
    """Allows client to request larger page sizes for dropdowns (e.g. ?page_size=500)."""
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 500
