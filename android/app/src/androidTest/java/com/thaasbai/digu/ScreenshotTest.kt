package com.thaasbai.digu

import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Before
import org.junit.ClassRule
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tools.fastlane.screengrab.Screengrab
import tools.fastlane.screengrab.UiAutomatorScreenshotStrategy
import tools.fastlane.screengrab.locale.LocaleTestRule

@RunWith(AndroidJUnit4::class)
@LargeTest
class ScreenshotTest {

    companion object {
        @ClassRule
        @JvmField
        val localeTestRule = LocaleTestRule()
    }

    private lateinit var device: UiDevice

    @Before
    fun setUp() {
        Screengrab.setDefaultScreenshotStrategy(UiAutomatorScreenshotStrategy())
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    }

    @Test
    fun captureStoreScreenshots() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            putExtra("TEST_OFFLINE_MODE", true)
            putExtra("DETERMINISTIC_SEED", 42)
        }

        val scenario = ActivityScenario.launch<MainActivity>(intent)

        // Wait for Capacitor WebView initialization
        Thread.sleep(4000)

        // 1. Capture Main Lobby
        Screengrab.screenshot("01_main_lobby")

        // 2. Navigate to Gameplay Stadium Table
        // Simulate tap on center Play button in Landscape orientation
        val screenWidth = device.displayWidth
        val screenHeight = device.displayHeight
        device.click((screenWidth * 0.5f).toInt(), (screenHeight * 0.75f).toInt())
        Thread.sleep(3000)
        Screengrab.screenshot("02_gameplay_stadium")

        // 3. Trigger Gin Slam Victory State
        device.click((screenWidth * 0.9f).toInt(), (screenHeight * 0.85f).toInt())
        Thread.sleep(2000)
        Screengrab.screenshot("03_gin_slam_victory")

        // 4. Navigate to Bondi Mode
        device.click((screenWidth * 0.5f).toInt(), (screenHeight * 0.2f).toInt())
        Thread.sleep(1000)
        device.click((screenWidth * 0.25f).toInt(), (screenHeight * 0.5f).toInt())
        Thread.sleep(2500)
        Screengrab.screenshot("04_bondi_classic")

        // 5. Open Settings & Themes
        device.click((screenWidth * 0.05f).toInt(), (screenHeight * 0.1f).toInt())
        Thread.sleep(2000)
        Screengrab.screenshot("05_visual_themes")

        scenario.close()
    }
}
