import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';

import '../data/mission_repository.dart';
import '../domain/entities/mission.dart';
import '../domain/usecases/complete_mission_use_case.dart';

class MissionVerifyPage extends StatefulWidget {
  const MissionVerifyPage({super.key, required this.mission});

  final Mission mission;

  @override
  State<MissionVerifyPage> createState() => _MissionVerifyPageState();
}

class _MissionVerifyPageState extends State<MissionVerifyPage> {
  final _noteController = TextEditingController();
  final _imagePicker = ImagePicker();
  XFile? _evidenceImage;
  bool _isSubmitting = false;
  Position? _position;
  String _gpsMessage = 'Chưa ghi nhận vị trí GPS';

  Future<void> _captureLocation() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw Exception('GPS đang tắt');
      }
      if (!mounted) return;
      var permission = await Geolocator.checkPermission();
      if (!mounted) return;
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (!mounted) return;
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Chưa cấp quyền vị trí');
      }
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      if (mounted) {
        setState(() {
          _position = position;
          _gpsMessage =
              'Đã ghi nhận GPS (sai số ${position.accuracy.round()} m)';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _position = null;
          _gpsMessage = 'Chưa lấy được GPS. Hãy bật vị trí và thử lại.';
        });
      }
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    if (_evidenceImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vui lòng chụp ảnh minh chứng trước.')));
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      await CompleteMissionUseCase(const MissionRepositoryImpl())(
        widget.mission.id,
        proofPath: _evidenceImage!.path,
        note: _noteController.text.trim(),
        latitude: _position?.latitude,
        longitude: _position?.longitude,
        gpsAccuracy: _position?.accuracy,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Đã xác thực nhiệm vụ và nhận RE-Points!')));
        Navigator.pop(context, true);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(error.toString().replaceFirst('Exception: ', ''))));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _takeEvidencePhoto() async {
    try {
      final image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
        maxWidth: 1600,
      );
      if (mounted && image != null) {
        setState(() => _evidenceImage = image);
        await _captureLocation();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể mở camera: $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF8FAF8),
        appBar: AppBar(
          title: const Text('Xác thực Nhiệm vụ'),
          backgroundColor: const Color(0xFFF8FAF8),
        ),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(widget.mission.title,
                style: const TextStyle(
                    color: Color(0xFF26332D),
                    fontSize: 20,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 22),
            const Text('Ảnh minh chứng',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: _takeEvidencePhoto,
              child: Container(
                height: 150,
                decoration: BoxDecoration(
                    color: const Color(0xFFF0F1EC),
                    borderRadius: BorderRadius.circular(16)),
                clipBehavior: Clip.antiAlias,
                child: _evidenceImage == null
                    ? const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.camera_alt_outlined,
                                color: Color(0xFF89968F), size: 28),
                            SizedBox(height: 8),
                            Text('Chụp ảnh để xác thực tại Checkpoint GPS',
                                style: TextStyle(color: Color(0xFF89968F))),
                          ],
                        ),
                      )
                    : Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.file(
                            File(_evidenceImage!.path),
                            fit: BoxFit.cover,
                          ),
                          Positioned(
                            right: 10,
                            bottom: 10,
                            child: FilledButton.icon(
                              onPressed: _takeEvidencePhoto,
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('Chụp lại'),
                              style: FilledButton.styleFrom(
                                  backgroundColor: Colors.black54),
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xFFE6EFEB),
                  borderRadius: BorderRadius.circular(10)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_gpsMessage,
                        style: const TextStyle(
                            color: Color(0xFF4E7567), fontSize: 11)),
                    TextButton(
                        onPressed: _isSubmitting ? null : _captureLocation,
                        child: const Text('Cập nhật vị trí GPS')),
                  ]),
            ),
            const SizedBox(height: 18),
            const Text('Ghi chú trải nghiệm',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            TextField(
              controller: _noteController,
              maxLines: 3,
              decoration: const InputDecoration(
                  hintText: 'Chia sẻ cảm nhận của bạn về chuyến đi...',
                  border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4E7567),
                  minimumSize: const Size.fromHeight(48),
                  shape: const StadiumBorder()),
              child: Text(_isSubmitting
                  ? 'Đang gửi...'
                  : 'Gửi xác thực & Nhận ${widget.mission.points} RE-Points'),
            ),
          ],
        ),
      );
}
