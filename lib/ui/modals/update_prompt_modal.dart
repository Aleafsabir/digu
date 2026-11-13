import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/audio/sensory_service.dart';
import '../../core/services/update_service.dart';

/// Modal dialog alerting the player about a new application version,
/// displaying release notes in Thaana and English with live download progress.
class UpdatePromptModal extends StatefulWidget {
  final AppUpdateInfo updateInfo;
  final UpdateService? updateService;
  final VoidCallback? onDismiss;

  const UpdatePromptModal({
    super.key,
    required this.updateInfo,
    this.updateService,
    this.onDismiss,
  });

  static Future<void> show(
    BuildContext context, {
    required AppUpdateInfo updateInfo,
    UpdateService? updateService,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => UpdatePromptModal(
        updateInfo: updateInfo,
        updateService: updateService,
        onDismiss: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  @override
  State<UpdatePromptModal> createState() => _UpdatePromptModalState();
}

class _UpdatePromptModalState extends State<UpdatePromptModal> {
  StreamSubscription<UpdateDownloadProgress>? _progressSub;
  UpdateDownloadProgress? _currentProgress;
  String? _errorMessage;

  @override
  void dispose() {
    _progressSub?.cancel();
    super.dispose();
  }

  void _startDownload() {
    final service = widget.updateService ?? UpdateService();
    SensoryService.instance.playButtonTap();

    setState(() {
      _errorMessage = null;
      _currentProgress = const UpdateDownloadProgress(
        progress: 0.0,
        stage: UpdateDownloadStage.starting,
        message: 'Starting update download...',
      );
    });

    _progressSub?.cancel();
    _progressSub = service.downloadAndInstallApk(widget.updateInfo).listen(
      (event) {
        if (!mounted) return;
        setState(() {
          _currentProgress = event;
          if (event.stage == UpdateDownloadStage.error) {
            _errorMessage = event.message ?? 'An error occurred during update download.';
          }
        });
        if (event.stage == UpdateDownloadStage.launched ||
            event.stage == UpdateDownloadStage.installing) {
          SensoryService.instance.playFanfare();
        }
      },
      onError: (err) {
        if (!mounted) return;
        setState(() {
          _currentProgress = UpdateDownloadProgress(
            progress: 0.0,
            stage: UpdateDownloadStage.error,
            message: err.toString(),
          );
          _errorMessage = err.toString();
        });
      },
    );
  }

  String _formatBytes(int bytes) {
    if (bytes <= 0) return '';
    final mb = bytes / (1024 * 1024);
    return '${mb.toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    final info = widget.updateInfo;
    final progress = _currentProgress;
    final isDownloading = progress != null &&
        (progress.stage == UpdateDownloadStage.starting ||
            progress.stage == UpdateDownloadStage.downloading ||
            progress.stage == UpdateDownloadStage.installing);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 460),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 20),
        decoration: BoxDecoration(
          color: const Color(0xF9140506),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: const Color(0xFFD4AF37),
            width: 1.8,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.90),
              blurRadius: 36,
              spreadRadius: 4,
            ),
            BoxShadow(
              color: const Color(0xFFD4AF37).withValues(alpha: 0.25),
              blurRadius: 24,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Close button
            Align(
              alignment: Alignment.topRight,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white70, size: 18),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  final service = widget.updateService ?? UpdateService();
                  unawaited(service.ignoreUpdateTag(info.tagName));
                  SensoryService.instance.playButtonTap();
                  widget.onDismiss?.call();
                },
              ),
            ),

            // Emblem
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const RadialGradient(
                  colors: [Color(0xFF3B1015), Color(0xFF140506)],
                ),
                border: Border.all(color: const Color(0xFFD4AF37), width: 1.5),
              ),
              alignment: Alignment.center,
              child: const Text(
                'ޑ',
                textDirection: TextDirection.rtl,
                style: TextStyle(
                  fontSize: 26,
                  color: Color(0xFFE5C378),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Title
            const Text(
              'އައު އަޕްޑޭޓެއް ލިބެން އެބައޮތް!',
              textDirection: TextDirection.rtl,
              style: TextStyle(
                color: Color(0xFFE5C378),
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            const Text(
              'New Update Available!',
              style: TextStyle(
                color: Color(0xFFF7F0EA),
                fontSize: 14,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),

            // Version Pill: v0.8.0 -> info.version
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF0D0405),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF380C10)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'v${UpdateService.currentVersion}',
                    style: const TextStyle(
                      color: Color(0x99F7F0EA),
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6),
                    child: Icon(Icons.arrow_forward, size: 12, color: Color(0xFFD4AF37)),
                  ),
                  Text(
                    'v${info.version}',
                    style: const TextStyle(
                      color: Color(0xFF00E676),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Release Notes Box
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0D0405),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF380C10)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'WHAT\'S NEW • އައު ބަދަލުތައް',
                        style: TextStyle(
                          color: Color(0xFFD4AF37),
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                      if (info.apkSizeBytes > 0)
                        Text(
                          _formatBytes(info.apkSizeBytes),
                          style: const TextStyle(
                            color: Color(0x66F7F0EA),
                            fontSize: 9,
                            fontFamily: 'monospace',
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    info.releaseNotes.isNotEmpty
                        ? info.releaseNotes
                        : info.releaseName,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xCCF7F0EA),
                      fontSize: 11,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Download Progress / Status Feedback
            if (progress != null) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        progress.stage == UpdateDownloadStage.installing
                            ? 'Opening Installer...'
                            : progress.stage == UpdateDownloadStage.launched
                                ? 'Installer Launched ✓'
                                : 'Downloading APK...',
                        style: TextStyle(
                          color: progress.stage == UpdateDownloadStage.launched
                              ? const Color(0xFF00E676)
                              : const Color(0xFFE5C378),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        progress.totalBytes > 0
                            ? '${_formatBytes(progress.receivedBytes)} / ${_formatBytes(progress.totalBytes)}'
                            : '${(progress.progress * 100).round()}%',
                        style: const TextStyle(
                          color: Color(0xFFE5C378),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: progress.progress.clamp(0.0, 1.0),
                      backgroundColor: const Color(0xFF260A0D),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        progress.stage == UpdateDownloadStage.launched
                            ? const Color(0xFF00E676)
                            : const Color(0xFFD4AF37),
                      ),
                      minHeight: 6,
                    ),
                  ),

                  // Stage-specific messages
                  if (progress.stage == UpdateDownloadStage.permissionRequired) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'Allow unknown app installs in Android Settings, then tap Update Now again.',
                      style: TextStyle(
                        color: Color(0xFFFFA07A),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  if (progress.stage == UpdateDownloadStage.fallback) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'Unable to launch installer directly on this platform.',
                      style: TextStyle(
                        color: Color(0xFFFFA07A),
                        fontSize: 10,
                      ),
                    ),
                  ],
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: Color(0xFFFF8A80),
                        fontSize: 10,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                ],
              ),
            ],

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF380C10)),
                      foregroundColor: const Color(0xBBF7F0EA),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: () {
                      final service = widget.updateService ?? UpdateService();
                      unawaited(service.ignoreUpdateTag(info.tagName));
                      SensoryService.instance.playButtonTap();
                      widget.onDismiss?.call();
                    },
                    child: const Text(
                      'LATER • ފަހުން',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    key: const Key('btn_download_update'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD4AF37),
                      foregroundColor: const Color(0xFF0D0605),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 4,
                    ),
                    onPressed: isDownloading
                        ? null
                        : () {
                            _startDownload();
                          },
                    child: Text(
                      _errorMessage != null
                          ? 'RETRY UPDATE ➜'
                          : 'UPDATE NOW • އަޕްޑޭޓް ކުރޭ',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
