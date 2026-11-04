from django.urls import path
from apps.flash_sales.views.flash_sale_views import (
    ActiveFlashSaleSessionView,
    AdminCampaignListView,
    AdminSessionCreateView,
    VendorCampaignItemRegisterView,
    AdminCampaignItemReviewView
)

app_name = 'flash_sales'

urlpatterns = [
    # 1. Public API cho Du khách săn vé
    path('active-session/', ActiveFlashSaleSessionView.as_view(), name='active-session'),
    
    # 2. BQL Admin Quản lý Chiến dịch & Phiên
    path('admin/campaigns/', AdminCampaignListView.as_view(), name='admin-campaigns'),
    path('admin/sessions/', AdminSessionCreateView.as_view(), name='admin-create-session'),
    path('admin/items/<int:item_id>/review/', AdminCampaignItemReviewView.as_view(), name='admin-review-item'),
    
    # 3. Đơn vị Lữ Hành (Vendor) Đăng ký Tour tham gia
    path('vendor/register-item/', VendorCampaignItemRegisterView.as_view(), name='vendor-register-item'),
]
