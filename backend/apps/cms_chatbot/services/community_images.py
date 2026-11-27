from io import BytesIO
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from PIL import Image, ImageOps
from rest_framework.exceptions import ValidationError


def community_image_storage():
    return FileSystemStorage(location=settings.COMMUNITY_MEDIA_ROOT)


def save_post_image(upload):
    if upload.size > 8 * 1024 * 1024:
        raise ValidationError('Ảnh phải nhỏ hơn hoặc bằng 8 MB.')

    try:
        with Image.open(upload, formats=('JPEG', 'PNG', 'WEBP')) as source:
            if source.width * source.height > 24_000_000:
                raise ValidationError('Ảnh có độ phân giải quá lớn. Vui lòng chọn ảnh nhỏ hơn.')
            image = ImageOps.exif_transpose(source)
            image.thumbnail((1600, 1600))
            image = image.convert('RGB')
            image.info.clear()
            output = BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
    except (OSError, ValueError, Image.DecompressionBombError) as exc:
        raise ValidationError('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP.') from exc

    return community_image_storage().save(f'{uuid4()}.jpg', ContentFile(output.getvalue()))
