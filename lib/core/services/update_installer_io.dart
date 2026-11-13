import 'dart:io';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

const MethodChannel _installerChannel = MethodChannel('com.thaasbai.digu/installer');

/// Native IO (Android) implementation for streaming APK download and invoking PackageInstaller.
Stream<
    ({
      double progress,
      int receivedBytes,
      int totalBytes,
      String stage,
      String? message,
    })> platformDownloadAndInstallApk({
  required String tagName,
  required String apkUrl,
  required String htmlUrl,
  http.Client? client,
}) async* {
  if (!Platform.isAndroid) {
    yield (
      progress: 1.0,
      receivedBytes: 0,
      totalBytes: 0,
      stage: 'fallback',
      message: 'Direct APK install is only supported on Android. Visit $htmlUrl',
    );
    return;
  }

  final ownClient = client == null;
  final httpClient = client ?? http.Client();

  try {
    yield (
      progress: 0.0,
      receivedBytes: 0,
      totalBytes: 0,
      stage: 'starting',
      message: 'Preparing download...',
    );

    final safeTag = tagName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final cachePath = await _installerChannel.invokeMethod<String>(
      'getApkCachePath',
      {'fileName': 'holhuashi-$safeTag.apk'},
    );

    if (cachePath == null || cachePath.isEmpty) {
      yield (
        progress: 0.0,
        receivedBytes: 0,
        totalBytes: 0,
        stage: 'error',
        message: 'Could not resolve temporary download location.',
      );
      return;
    }

    final request = http.Request('GET', Uri.parse(apkUrl));
    final streamedResponse = await httpClient.send(request);

    if (streamedResponse.statusCode < 200 ||
        streamedResponse.statusCode >= 300) {
      yield (
        progress: 0.0,
        receivedBytes: 0,
        totalBytes: 0,
        stage: 'error',
        message: 'Download failed (HTTP ${streamedResponse.statusCode}).',
      );
      return;
    }

    final totalBytes = streamedResponse.contentLength ?? 0;
    final apkFile = File(cachePath);
    if (await apkFile.exists()) {
      await apkFile.delete();
    }
    await apkFile.parent.create(recursive: true);

    final sink = apkFile.openWrite();
    var receivedBytes = 0;

    try {
      await for (final chunk in streamedResponse.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;
        final progress = totalBytes > 0
            ? (receivedBytes / totalBytes).clamp(0.0, 1.0)
            : 0.0;
        yield (
          progress: progress,
          receivedBytes: receivedBytes,
          totalBytes: totalBytes,
          stage: 'downloading',
          message: null,
        );
      }
      await sink.flush();
    } finally {
      await sink.close();
    }

    yield (
      progress: 1.0,
      receivedBytes: receivedBytes,
      totalBytes: totalBytes > 0 ? totalBytes : receivedBytes,
      stage: 'installing',
      message: 'Launching Android installer...',
    );

    final installResult = await _installerChannel.invokeMethod<String>(
      'installApk',
      {'path': cachePath},
    );

    if (installResult == 'permission_required') {
      yield (
        progress: 1.0,
        receivedBytes: receivedBytes,
        totalBytes: totalBytes > 0 ? totalBytes : receivedBytes,
        stage: 'permission_required',
        message:
            'Allow "Install unknown apps" in Android Settings, then tap Install again.',
      );
    } else {
      yield (
        progress: 1.0,
        receivedBytes: receivedBytes,
        totalBytes: totalBytes > 0 ? totalBytes : receivedBytes,
        stage: 'launched',
        message: 'Installer opened.',
      );
    }
  } catch (e) {
    yield (
      progress: 0.0,
      receivedBytes: 0,
      totalBytes: 0,
      stage: 'error',
      message: 'Update failed: $e',
    );
  } finally {
    if (ownClient) {
      httpClient.close();
    }
  }
}
