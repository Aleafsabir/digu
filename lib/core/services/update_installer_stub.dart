import 'package:http/http.dart' as http;

/// Web / non-IO fallback implementation for APK download & installation.
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
  yield (
    progress: 1.0,
    receivedBytes: 0,
    totalBytes: 0,
    stage: 'fallback',
    message: 'Download the latest release ($tagName) from $htmlUrl',
  );
}
