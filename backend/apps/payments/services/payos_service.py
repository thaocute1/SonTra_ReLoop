import os
import hmac
import hashlib
import json
import requests
from django.conf import settings


class PayOSService:
    BASE_URL = "https://api-merchant.payos.vn/v2/payment-requests"
    PAYOUT_BASE_URL = "https://api-merchant.payos.vn/v1/payouts"

    @classmethod
    def get_credentials(cls):
        client_id = os.getenv("PAYOS_CLIENT_ID", getattr(settings, "PAYOS_CLIENT_ID", None))
        api_key = os.getenv("PAYOS_API_KEY", getattr(settings, "PAYOS_API_KEY", None))
        checksum_key = os.getenv("PAYOS_CHECKSUM_KEY", getattr(settings, "PAYOS_CHECKSUM_KEY", None))
        return client_id, api_key, checksum_key

    @classmethod
    def get_payout_credentials(cls):
        mode = (os.getenv("PAYOS_PAYOUT_MODE", "mock") or "mock").strip().lower()
        client_id = os.getenv("PAYOS_PAYOUT_CLIENT_ID", "").strip()
        api_key = os.getenv("PAYOS_PAYOUT_API_KEY", "").strip()
        checksum_key = os.getenv("PAYOS_PAYOUT_CHECKSUM_KEY", "").strip()
        return mode, client_id, api_key, checksum_key

    @classmethod
    def create_signature_from_dict(cls, data: dict, checksum_key: str) -> str:
        """
        Sắp xếp các key theo thứ tự bảng chữ cái và tạo mã băm HMAC-SHA256 theo chuẩn PayOS.
        Chuỗi dạng: key1=value1&key2=value2&...
        """
        sorted_keys = sorted(data.keys())
        parts = []
        for k in sorted_keys:
            val = data[k]
            if val is not None and val != "":
                parts.append(f"{k}={val}")
        sign_string = "&".join(parts)
        return hmac.new(checksum_key.encode("utf-8"), sign_string.encode("utf-8"), hashlib.sha256).hexdigest()

    @classmethod
    def create_payment_link(cls, order_code: int, amount: int, description: str,
                            items=None, cancel_url=None, return_url=None):
        """
        Gửi yêu cầu tạo liên kết thanh toán và mã VietQR qua PayOS API.
        """
        client_id, api_key, checksum_key = cls.get_credentials()
        if not client_id or not api_key or not checksum_key:
            raise ValueError("Chưa cấu hình đầy đủ PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env")

        clean_desc = (description or f"Thanh toan #{order_code}")[:25]
        default_return_url = return_url or "http://localhost:5173/dashboard/trekking?payment=success"
        default_cancel_url = cancel_url or "http://localhost:5173/dashboard/trekking?payment=cancelled"

        # Chuẩn bị dữ liệu để ký
        sign_dict = {
            "amount": int(amount),
            "cancelUrl": default_cancel_url,
            "description": clean_desc,
            "orderCode": int(order_code),
            "returnUrl": default_return_url,
        }
        signature = cls.create_signature_from_dict(sign_dict, checksum_key)

        payload = {
            "orderCode": int(order_code),
            "amount": int(amount),
            "description": clean_desc,
            "cancelUrl": default_cancel_url,
            "returnUrl": default_return_url,
            "signature": signature
        }

        if items:
            payload["items"] = items

        headers = {
            "x-client-id": client_id,
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }

        try:
            resp = requests.post(cls.BASE_URL, json=payload, headers=headers, timeout=12)
            resp_json = resp.json()

            if resp.status_code == 200 and resp_json.get("code") == "00":
                return {
                    "status": "success",
                    "data": resp_json.get("data", {})
                }
            else:
                return {
                    "status": "error",
                    "code": resp_json.get("code"),
                    "message": resp_json.get("desc", "Lỗi tạo link thanh toán PayOS")
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Không thể kết nối máy chủ PayOS: {str(e)}"
            }

    @classmethod
    def get_payment_link_information(cls, order_id_or_code):
        """
        Tra cứu trạng thái đơn thanh toán trực tiếp từ máy chủ PayOS
        """
        client_id, api_key, _ = cls.get_credentials()
        headers = {
            "x-client-id": client_id,
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        url = f"{cls.BASE_URL}/{order_id_or_code}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            resp_json = resp.json()
            if resp.status_code == 200 and resp_json.get("code") == "00":
                return {
                    "status": "success",
                    "data": resp_json.get("data", {})
                }
            return {
                "status": "error",
                "message": resp_json.get("desc", "Không tìm thấy giao dịch")
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }

    @classmethod
    def cancel_payment_link(cls, order_id_or_code, cancellation_reason="Khách hủy thanh toán"):
        """
        Hủy liên kết thanh toán trên PayOS khi đơn bị hủy hoặc quá hạn
        """
        client_id, api_key, _ = cls.get_credentials()
        headers = {
            "x-client-id": client_id,
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        url = f"{cls.BASE_URL}/{order_id_or_code}/cancel"
        try:
            resp = requests.post(url, json={"cancellationReason": cancellation_reason}, headers=headers, timeout=10)
            return resp.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def verify_webhook_data(cls, webhook_payload: dict) -> bool:
        """
        Xác thực chữ ký webhook từ PayOS (sử dụng thư viện payOS chính thức)
        """
        client_id, api_key, checksum_key = cls.get_credentials()
        if not checksum_key:
            return False

        # 1. Thử dùng thư viện payos chính thức
        try:
            from payos import PayOS
            payos_client = PayOS(client_id=client_id, api_key=api_key, checksum_key=checksum_key)
            payos_client.webhooks.verify(webhook_payload)
            return True
        except Exception as e:
            pass

        # 2. Fallback thủ công
        try:
            data = webhook_payload.get("data", {})
            received_signature = webhook_payload.get("signature", "")
            if not data or not received_signature:
                return False
            calculated_signature = cls.create_signature_from_dict(data, checksum_key)
            return hmac.compare_digest(calculated_signature, received_signature)
        except Exception:
            return False

    @classmethod
    def create_payout(cls, reference_id: str, amount: int, description: str,
                      to_bin: str = "", to_account_number: str = ""):
        """
        Thực thi chi hộ / hoàn tiền qua PayOS Kênh chuyển tiền (/v1/payouts).
        Khi PAYOS_PAYOUT_MODE != 'live' (mặc định 'mock'), trả về kết quả mô phỏng an toàn.
        """
        mode, client_id, api_key, checksum_key = cls.get_payout_credentials()
        clean_desc = (description or f"Hoan tien {reference_id}")[:25]
        clean_amount = int(amount)

        if mode != "live":
            return {
                "status": "success",
                "mode": "mock",
                "reference_id": f"PAYOS-MOCK-{reference_id}",
                "data": {
                    "id": f"MOCK-{reference_id}",
                    "referenceId": reference_id,
                    "amount": clean_amount,
                    "description": clean_desc,
                    "approvalState": "SUCCEEDED",
                },
            }

        if not client_id or not api_key or not checksum_key:
            return {
                "status": "error",
                "message": "Chưa cấu hình đầy đủ PAYOS_PAYOUT_CLIENT_ID, PAYOS_PAYOUT_API_KEY, PAYOS_PAYOUT_CHECKSUM_KEY trong .env",
            }
        if not to_bin or not to_account_number:
            return {
                "status": "error",
                "message": "Thiếu mã ngân hàng (BIN) hoặc số tài khoản nhận hoàn tiền.",
            }

        payload = {
            "referenceId": str(reference_id),
            "amount": clean_amount,
            "description": clean_desc,
            "toBin": str(to_bin).strip(),
            "toAccountNumber": str(to_account_number).strip(),
        }
        signature = cls.create_signature_from_dict(payload, checksum_key)
        headers = {
            "x-client-id": client_id,
            "x-api-key": api_key,
            "x-idempotency-key": str(reference_id),
            "x-signature": signature,
            "Content-Type": "application/json",
        }
        try:
            resp = requests.post(cls.PAYOUT_BASE_URL, json=payload, headers=headers, timeout=15)
            resp_json = resp.json()
            if resp.status_code in (200, 201) and resp_json.get("code") == "00":
                data = resp_json.get("data", {})
                return {
                    "status": "success",
                    "mode": "live",
                    "reference_id": str(data.get("id") or reference_id),
                    "data": data,
                }
            return {
                "status": "error",
                "code": resp_json.get("code"),
                "message": resp_json.get("desc", "Lỗi gọi PayOS Kênh chuyển tiền"),
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Không thể kết nối máy chủ PayOS Chi hộ: {str(e)}",
            }
