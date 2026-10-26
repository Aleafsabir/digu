# ProGuard / R8 Rules for Holhuashi (Capacitor 8 Mobile)

# 1. Preserve JavaScript Interface methods accessed by WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 2. Capacitor Core and Plugins
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep public class * extends com.getcapacitor.BridgeFragment { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }

# 3. Cordova Plugins Compatibility
-keep class org.apache.cordova.** { *; }

# 4. Firebase Authentication & Google Play Services
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.firebase.** { *; }
-keep class io.capawesome.capacitorjs.plugins.firebase.authentication.** { *; }

# 5. Preserve Line Numbers & Source File for Sentry / Crashlytics / Google Play Vitals
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# 6. Suppress safe warnings for dynamic plugin loading
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.apache.commons.**
