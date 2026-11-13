import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Authenticated Google user details returned by [GoogleAuthService].
class GoogleAuthUser {
  final String id;
  final String email;
  final String displayName;
  final String? photoUrl;
  final String? idToken;

  const GoogleAuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    this.photoUrl,
    this.idToken,
  });
}

/// Outcome state of an interactive Google Sign-In attempt.
enum GoogleAuthStatus {
  success,
  cancelled,
  failure,
}

/// Result wrapper distinguishing successful sign-in, user cancellation, and errors.
class GoogleAuthOutcome {
  final GoogleAuthStatus status;
  final GoogleAuthUser? user;
  final String? errorMessage;

  const GoogleAuthOutcome._({
    required this.status,
    this.user,
    this.errorMessage,
  });

  factory GoogleAuthOutcome.success(GoogleAuthUser user) {
    return GoogleAuthOutcome._(
      status: GoogleAuthStatus.success,
      user: user,
    );
  }

  factory GoogleAuthOutcome.cancelled() {
    return const GoogleAuthOutcome._(
      status: GoogleAuthStatus.cancelled,
    );
  }

  factory GoogleAuthOutcome.failure(String message) {
    return GoogleAuthOutcome._(
      status: GoogleAuthStatus.failure,
      errorMessage: message,
    );
  }

  bool get isSuccess => status == GoogleAuthStatus.success && user != null;
  bool get isCancelled => status == GoogleAuthStatus.cancelled;
  bool get isFailure => status == GoogleAuthStatus.failure;
}

/// Adapter interface allowing deterministic unit testing of [GoogleAuthService].
abstract class GoogleAuthAdapter {
  Future<GoogleAuthUser?> signIn();
  Future<void> signOut();
}

class _DefaultGoogleSignInAdapter implements GoogleAuthAdapter {
  static const String _configuredServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
  );

  GoogleSignIn? _googleSignIn;

  GoogleSignIn get _client {
    return _googleSignIn ??= GoogleSignIn(
      scopes: const ['email', 'profile'],
      serverClientId:
          _configuredServerClientId.isEmpty ? null : _configuredServerClientId,
    );
  }

  @override
  Future<GoogleAuthUser?> signIn() async {
    final account = await _client.signIn();
    if (account == null) {
      return null;
    }

    String? idToken;
    try {
      final auth = await account.authentication;
      idToken = auth.idToken;
    } catch (_) {
      idToken = null;
    }

    final resolvedName = (account.displayName != null &&
            account.displayName!.trim().isNotEmpty)
        ? account.displayName!.trim()
        : account.email.split('@').first;

    return GoogleAuthUser(
      id: account.id,
      email: account.email,
      displayName: resolvedName,
      photoUrl: account.photoUrl,
      idToken: idToken,
    );
  }

  @override
  Future<void> signOut() async {
    try {
      await _client.signOut();
    } catch (_) {
      // Safe no-op on unsupported or uninitialized platforms.
    }
  }
}

/// Service handling real Google Sign-In without synthesizing mock accounts on failure.
class GoogleAuthService {
  final GoogleAuthAdapter _adapter;

  GoogleAuthService({GoogleAuthAdapter? adapter})
      : _adapter = adapter ?? _DefaultGoogleSignInAdapter();

  Future<GoogleAuthOutcome> signIn() async {
    try {
      final user = await _adapter.signIn();
      if (user == null) {
        return GoogleAuthOutcome.cancelled();
      }
      return GoogleAuthOutcome.success(user);
    } on PlatformException catch (e) {
      final code = e.code.toLowerCase();
      if (code == GoogleSignIn.kSignInCanceledError ||
          code.contains('cancel')) {
        return GoogleAuthOutcome.cancelled();
      }
      if (code == GoogleSignIn.kNetworkError || code.contains('network')) {
        return GoogleAuthOutcome.failure(
          'Network unavailable. Please check your connection and try again.',
        );
      }
      return GoogleAuthOutcome.failure(
        e.message?.trim().isNotEmpty == true
            ? e.message!.trim()
            : 'Google Sign-In failed (${e.code}).',
      );
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('cancel')) {
        return GoogleAuthOutcome.cancelled();
      }
      return GoogleAuthOutcome.failure(
        'Could not complete Google Sign-In. Please try again.',
      );
    }
  }

  Future<void> signOut() async {
    try {
      await _adapter.signOut();
    } catch (_) {
      // Ignore sign-out errors on unsupported platforms.
    }
  }
}
