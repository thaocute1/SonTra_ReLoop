from io import BytesIO
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import Users

from .models import Posts


class CommunityUploadTests(TestCase):
    def test_photo_is_private_until_post_is_approved(self):
        buyer = Users.objects.create(name='Khách', role='customer')
        admin = Users.objects.create(name='Admin', role='system_admin')
        buffer = BytesIO()
        Image.new('RGB', (10, 10), 'green').save(buffer, format='PNG')
        photo = SimpleUploadedFile('son-tra.png', buffer.getvalue(), content_type='image/png')

        with TemporaryDirectory() as directory, override_settings(COMMUNITY_MEDIA_ROOT=directory, DEBUG=False):
            client = APIClient()
            client.force_authenticate(buyer)
            create = '/api/v1/cms-chatbot/community/posts/create/'
            result = client.post(create, {'title': 'Ảnh Sơn Trà', 'image': photo}, format='multipart')
            self.assertEqual(result.status_code, 201, result.data)
            self.assertTrue(result.data['data']['is_pending'])
            post = Posts.objects.get(pk=result.data['data']['id'])
            self.assertEqual(post.status, 'draft')
            self.assertEqual(client.get(post.thumbnail_url).status_code, 404)
            preview = urlsplit(result.data['data']['thumbnail_url'])
            self.assertTrue(preview.query)
            preview_image = client.get(f'{preview.path}?{preview.query}')
            self.assertEqual(preview_image.status_code, 200)
            self.assertTrue(b''.join(preview_image.streaming_content).startswith(b'\xff\xd8'))

            client.force_authenticate(admin)
            review = client.patch(f'/api/v1/cms-chatbot/community/admin/posts/{post.id}/review/',
                                  {'action': 'approve'}, format='json')
            self.assertEqual(review.status_code, 200, review.data)
            client.force_authenticate(None)
            feed = client.get('/api/v1/cms-chatbot/community/posts/')
            self.assertEqual(feed.data['data'][0]['thumbnail_url'], 'http://testserver' + post.thumbnail_url)
            image = client.get(post.thumbnail_url)
            self.assertEqual(image['Content-Type'], 'image/jpeg')
            self.assertTrue(b''.join(image.streaming_content).startswith(b'\xff\xd8'))

    def test_invalid_image_does_not_create_a_post(self):
        user = Users.objects.create(name='Khách', role='customer')
        client = APIClient()
        client.force_authenticate(user)
        file = SimpleUploadedFile('wrong.jpg', b'<html>not an image</html>', content_type='image/jpeg')
        result = client.post('/api/v1/cms-chatbot/community/posts/create/', {'image': file}, format='multipart')
        self.assertEqual(result.status_code, 400)
        self.assertFalse(Posts.objects.exists())
