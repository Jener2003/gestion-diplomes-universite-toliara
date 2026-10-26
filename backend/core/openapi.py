"""
Annotations de la documentation Swagger (drf-spectacular), facultative.

Sans le paquet drf-spectacular, l'application fonctionne normalement : les
annotations deviennent sans effet et la page /api/docs/ n'est pas exposée.
"""
try:
    from drf_spectacular.types import OpenApiTypes
    from drf_spectacular.utils import extend_schema, inline_serializer
except ImportError:
    class OpenApiTypes:
        OBJECT = None

    def extend_schema(*args, **kwargs):
        return lambda vue: vue

    def inline_serializer(*args, **kwargs):
        return None
