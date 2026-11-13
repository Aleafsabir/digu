# Flutter ProGuard / R8 Rules for Holhuashi Client

# Flutter Wrapper & Plugins
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Keep Riverpod and state annotations
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# Keep Flame & Flame Audio
-dontwarn com.ryanheise.audioservice.**
-dontwarn xyz.luan.audioplayers.**
-keep class xyz.luan.audioplayers.** { *; }

# Keep shared_preferences
-keep class io.flutter.plugins.sharedpreferences.** { *; }

# Keep WebSocket Channel and networking
-dontwarn okio.**
-dontwarn java.nio.file.**

# Preserve all Native Methods
-keepclasseswithmembernames class * {
    native <methods>;
}
