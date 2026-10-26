// AppUITests.swift
// Deterministic Automated Store Screenshot Capture Suite for Holhuashi

import XCTest

class AppUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testCaptureStoreScreenshots() {
        let app = XCUIApplication()
        
        // Pass deterministic flags to bypass network latency and seed game state
        app.launchArguments = [
            "-FASTLANE_SNAPSHOT", "YES",
            "-TEST_OFFLINE_MODE", "YES",
            "-DETERMINISTIC_SEED", "42"
        ]
        
        setupSnapshot(app)
        app.launch()

        // Give the Capacitor WebView and animations time to render initial frame
        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 10.0), "Capacitor WebView must load within 10 seconds")

        // 1. Capture Main Lobby
        sleep(2)
        snapshot("01_main_lobby")

        // 2. Navigate to Single-Player / Offline Stadium Table
        // Find play button in webview or simulate tap
        let playButton = webView.buttons["PLAY NOW"].exists ? webView.buttons["PLAY NOW"] : webView.otherElements["PLAY NOW"]
        if playButton.exists {
            playButton.tap()
        } else {
            // Tap the primary center action zone
            webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75)).tap()
        }

        sleep(3)
        snapshot("02_gameplay_stadium")

        // 3. Trigger Deterministic Gin Slam Victory State
        // In test mode, tapping south gin pad or trigger key evokes victory modal
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.85)).tap()
        sleep(2)
        snapshot("03_gin_slam_victory")

        // 4. Navigate to Bondi Mode
        // Dismiss modal and return to lobby/mode selection
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.2)).tap()
        sleep(1)
        // Select Bondi Game Mode
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.5)).tap()
        sleep(2)
        snapshot("04_bondi_classic")

        // 5. Open Settings / Visual Themes Panel
        webView.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.1)).tap()
        sleep(2)
        snapshot("05_visual_themes")
    }
}
