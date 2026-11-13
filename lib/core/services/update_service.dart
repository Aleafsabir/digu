import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../data/local_persistence.dart';
import 'update_installer_io.dart'
    if (dart.library.js_interop) 'update_installer_stub.dart';

/// Metadata describing an available application release update.
class AppUpdateInfo {
  final String tagName;
  final String version;
  final String releaseName;
  final String releaseNotes;
  final String apkUrl;
  final int apkSizeBytes;
  final String htmlUrl;

  const AppUpdateInfo({
    required this.tagName,
    required this.version,
    required this.releaseName,
    required this.releaseNotes,
    required this.apkUrl,
    required this.apkSizeBytes,
    required this.htmlUrl,
  });
}

/// Lifecycle stage of an in-app update download & install operation.
enum UpdateDownloadStage {
  starting,
  downloading,
  installing,
  permissionRequired,
  launched,
  fallback,
  error,
}

/// Progress snapshot emitted while downloading and launching an APK update.
class UpdateDownloadProgress {
  final double progress;
  final int receivedBytes;
  final int totalBytes;
  final UpdateDownloadStage stage;
  final String? message;

  const UpdateDownloadProgress({
    required this.progress,
    this.receivedBytes = 0,
    this.totalBytes = 0,
    required this.stage,
    this.message,
  });
}

/// Service checking GitHub Releases for newer APKs and coordinating in-app updates.
class UpdateService {
  static const String currentVersion = '0.8.0';
  static const String latestReleaseEndpoint =
      'https://api.github.com/repos/Aleafsabir/digu/releases/latest';
  static const Duration checkCooldown = Duration(hours: 4);

  final LocalPersistenceRepository _persistence;
  final http.Client? _client;

  UpdateService({
    LocalPersistenceRepository? persistence,
    http.Client? client,
  })  : _persistence = persistence ?? LocalPersistenceRepository(),
        _client = client;

  /// Compares two semantic version strings (handling optional `v` prefix and `+build`).
  static bool isNewerVersion(String latest, String current) {
    final latestParts = _parseSemver(latest);
    final currentParts = _parseSemver(current);
    if (latestParts == null || currentParts == null) {
      return false;
    }

    for (var i = 0; i < 3; i++) {
      if (latestParts.core[i] > currentParts.core[i]) return true;
      if (latestParts.core[i] < currentParts.core[i]) return false;
    }

    if (latestParts.build != null && currentParts.build != null) {
      return latestParts.build! > currentParts.build!;
    }
    return false;
  }

  static ({List<int> core, int? build})? _parseSemver(String raw) {
    var cleaned = raw.trim();
    if (cleaned.startsWith('v') || cleaned.startsWith('V')) {
      cleaned = cleaned.substring(1).trim();
    }
    if (cleaned.isEmpty) return null;

    int? buildNumber;
    final plusIdx = cleaned.indexOf('+');
    if (plusIdx != -1) {
      final buildStr = cleaned.substring(plusIdx + 1).trim();
      buildNumber = int.tryParse(buildStr);
      cleaned = cleaned.substring(0, plusIdx);
    }

    final dashIdx = cleaned.indexOf('-');
    if (dashIdx != -1) {
      cleaned = cleaned.substring(0, dashIdx);
    }

    final segments = cleaned.split('.');
    if (segments.isEmpty) return null;

    final core = <int>[0, 0, 0];
    for (var i = 0; i < 3 && i < segments.length; i++) {
      final parsed = int.tryParse(segments[i].trim());
      if (parsed == null) return null;
      core[i] = parsed;
    }
    return (core: core, build: buildNumber);
  }

  /// Extracts an [AppUpdateInfo] from a GitHub Release JSON payload if newer than [currentVersion].
  static AppUpdateInfo? parseReleaseJson(
    Map<String, dynamic> json, {
    String currentVersion = currentVersion,
  }) {
    if (json['draft'] == true) return null;

    final tagName = (json['tag_name'] as String?)?.trim() ?? '';
    if (tagName.isEmpty || !isNewerVersion(tagName, currentVersion)) {
      return null;
    }

    final assets = json['assets'];
    if (assets is! List) return null;

    Map<String, dynamic>? preferredApk;
    Map<String, dynamic>? fallbackApk;

    for (final rawAsset in assets) {
      if (rawAsset is! Map) continue;
      final asset = Map<String, dynamic>.from(rawAsset);
      final name = (asset['name'] as String? ?? '').toLowerCase();
      final downloadUrl =
          (asset['browser_download_url'] as String? ?? '').trim();
      if (downloadUrl.isEmpty) continue;

      if (name == 'app-release.apk' || name.endsWith('app-release.apk')) {
        preferredApk = asset;
        break;
      }
      if (name.endsWith('.apk') ||
          downloadUrl.toLowerCase().endsWith('.apk')) {
        fallbackApk ??= asset;
      }
    }

    final chosen = preferredApk ?? fallbackApk;
    if (chosen == null) return null;

    final normalizedVersion = (tagName.startsWith('v') || tagName.startsWith('V'))
        ? tagName.substring(1)
        : tagName;

    return AppUpdateInfo(
      tagName: tagName,
      version: normalizedVersion,
      releaseName: (json['name'] as String?)?.trim().isNotEmpty == true
          ? (json['name'] as String).trim()
          : 'Holhuashi $tagName',
      releaseNotes: (json['body'] as String?)?.trim() ?? '',
      apkUrl: (chosen['browser_download_url'] as String).trim(),
      apkSizeBytes: (chosen['size'] as num?)?.toInt() ?? 0,
      htmlUrl: (json['html_url'] as String?)?.trim() ??
          'https://github.com/Aleafsabir/digu/releases/latest',
    );
  }

  Future<AppUpdateInfo?> checkForUpdate({
    bool force = false,
    http.Client? client,
  }) async {
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    if (!force) {
      try {
        final lastCheckMs = await _persistence.getLastUpdateCheckMs();
        if (lastCheckMs > 0 &&
            (nowMs - lastCheckMs) < checkCooldown.inMilliseconds) {
          return null;
        }
      } catch (_) {}
    }

    final effectiveClient = client ?? _client;
    final ownClient = effectiveClient == null;
    final httpClient = effectiveClient ?? http.Client();

    try {
      final response = await httpClient
          .get(
            Uri.parse(latestReleaseEndpoint),
            headers: const {'Accept': 'application/vnd.github+json'},
          )
          .timeout(const Duration(seconds: 10));

      try {
        await _persistence.setLastUpdateCheckMs(nowMs);
      } catch (_) {}

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final info = parseReleaseJson(decoded);
      if (info == null) return null;

      if (!force) {
        try {
          final ignored = await _persistence.getIgnoredUpdateTag();
          if (ignored != null && ignored == info.tagName) {
            return null;
          }
        } catch (_) {}
      }

      return info;
    } catch (_) {
      return null;
    } finally {
      if (ownClient) {
        httpClient.close();
      }
    }
  }

  Future<void> ignoreUpdateTag(String tagName) async {
    try {
      await _persistence.setIgnoredUpdateTag(tagName);
    } catch (_) {}
  }

  Stream<UpdateDownloadProgress> downloadAndInstallApk(AppUpdateInfo info) {
    return platformDownloadAndInstallApk(
      tagName: info.tagName,
      apkUrl: info.apkUrl,
      htmlUrl: info.htmlUrl,
      client: _client,
    ).map((event) {
      return UpdateDownloadProgress(
        progress: event.progress,
        receivedBytes: event.receivedBytes,
        totalBytes: event.totalBytes,
        stage: _mapStage(event.stage),
        message: event.message,
      );
    });
  }

  static UpdateDownloadStage _mapStage(String raw) {
    switch (raw) {
      case 'starting':
        return UpdateDownloadStage.starting;
      case 'downloading':
        return UpdateDownloadStage.downloading;
      case 'installing':
        return UpdateDownloadStage.installing;
      case 'permission_required':
        return UpdateDownloadStage.permissionRequired;
      case 'launched':
        return UpdateDownloadStage.launched;
      case 'fallback':
        return UpdateDownloadStage.fallback;
      case 'error':
      default:
        return UpdateDownloadStage.error;
    }
  }
}
