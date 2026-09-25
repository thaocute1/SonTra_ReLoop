from rest_framework import permissions

class IsVendor(permissions.BasePermission):
    """
    Allows access only to authenticated vendor_admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'vendor_admin')

class IsBQL(permissions.BasePermission):
    """
    Allows access to Ban Quan Ly (BQL) - system_admin or active staff members.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = getattr(request.user, 'role', '')
        return role in ['system_admin', 'staff']

class IsGuide(permissions.BasePermission):
    """
    Allows access to tour guides.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, 'role', '') == 'guide')
