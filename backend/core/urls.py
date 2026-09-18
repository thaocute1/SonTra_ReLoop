from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Router v1 for 9 modular apps
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/vendors/', include('apps.vendors.urls')),
    path('api/v1/tours/', include('apps.tours.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/challenging/', include('apps.challenging.urls')),
    path('api/v1/gamification/', include('apps.gamification.urls')),
    path('api/v1/flash-sales/', include('apps.flash_sales.urls')),
    path('api/v1/cms-chatbot/', include('apps.cms_chatbot.urls')),
]
