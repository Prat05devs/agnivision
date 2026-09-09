# AgniVision release (R8) rules.
#
# React Native, expo-modules-core, Google Play Services and OkHttp all ship consumer
# ProGuard rules inside their artifacts, and those are merged automatically — do not
# duplicate them here. This file carries only what is specific to this app.

# Keep line numbers so Play Console crash reports stay readable, while still allowing
# class/method names to be obfuscated. Upload mapping.txt with every release.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Annotations drive RN/Expo module and view-manager registration via reflection.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# React Native JNI + JS bridge boundaries. RN's own rules cover the framework, but keep
# the native-call entry points explicitly: they are reached only from C++/JS.
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }
-keep class * implements com.facebook.react.bridge.JavaScriptModule { *; }

# Hermes.
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-maps renders through Google Play Services Maps.
-keep class com.google.android.gms.maps.** { *; }
-keep interface com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Kotlin metadata is used reflectively by the Expo modules runtime.
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings { <fields>; }

# Warnings from optional/compile-only dependencies that are never loaded at runtime.
-dontwarn com.facebook.react.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
