from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    自定义权限：
    - 允许任何人进行只读操作 (GET, HEAD, OPTIONS)
    - 仅允许管理员 (is_staff=True) 进行增删改操作
    """
    def has_permission(self, request, view):
        # 如果是安全的方法（只读），则允许
        if request.method in permissions.SAFE_METHODS:
            return True

        # 否则，必须是管理员
        return request.user and request.user.is_staff
