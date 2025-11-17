/**
 * DeviceDetection.js
 * Utility for detecting device type, screen size, and capabilities
 */

export class DeviceDetection {
    constructor() {
        this.userAgent = navigator.userAgent.toLowerCase();
        this.touchSupport = this._checkTouchSupport();
        this.deviceType = this._detectDeviceType();
        this.screenSize = this._getScreenSize();
        this.orientation = this._getOrientation();

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            this.orientation = this._getOrientation();
            this._notifyOrientationChange();
        });

        window.addEventListener('resize', () => {
            this.screenSize = this._getScreenSize();
            this.orientation = this._getOrientation();
        });
    }

    /**
     * Check if device has touch support
     * @returns {boolean}
     */
    _checkTouchSupport() {
        return (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    }

    /**
     * Detect device type
     * @returns {string} 'mobile', 'tablet', or 'desktop'
     */
    _detectDeviceType() {
        const ua = this.userAgent;

        // Check for mobile devices
        const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
        if (mobileRegex.test(ua)) {
            return 'mobile';
        }

        // Check for tablets
        const tabletRegex = /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i;
        if (tabletRegex.test(ua)) {
            return 'tablet';
        }

        // Check screen size as fallback
        const width = window.innerWidth;
        if (width < 768 && this.touchSupport) {
            return 'mobile';
        } else if (width >= 768 && width < 1024 && this.touchSupport) {
            return 'tablet';
        }

        return 'desktop';
    }

    /**
     * Get screen size category
     * @returns {string} 'small', 'medium', 'large', or 'xlarge'
     */
    _getScreenSize() {
        const width = window.innerWidth;

        if (width < 480) return 'small';      // Phone portrait
        if (width < 768) return 'medium';     // Phone landscape / small tablet
        if (width < 1024) return 'large';     // Tablet
        return 'xlarge';                       // Desktop
    }

    /**
     * Get device orientation
     * @returns {string} 'portrait' or 'landscape'
     */
    _getOrientation() {
        if (window.matchMedia("(orientation: portrait)").matches) {
            return 'portrait';
        }
        return 'landscape';
    }

    /**
     * Check if device is mobile (phone or tablet)
     * @returns {boolean}
     */
    isMobile() {
        return this.deviceType === 'mobile' || this.deviceType === 'tablet';
    }

    /**
     * Check if device is a phone
     * @returns {boolean}
     */
    isPhone() {
        return this.deviceType === 'mobile';
    }

    /**
     * Check if device is a tablet
     * @returns {boolean}
     */
    isTablet() {
        return this.deviceType === 'tablet';
    }

    /**
     * Check if device is desktop
     * @returns {boolean}
     */
    isDesktop() {
        return this.deviceType === 'desktop';
    }

    /**
     * Check if device has touch support
     * @returns {boolean}
     */
    hasTouch() {
        return this.touchSupport;
    }

    /**
     * Check if screen is in portrait orientation
     * @returns {boolean}
     */
    isPortrait() {
        return this.orientation === 'portrait';
    }

    /**
     * Check if screen is in landscape orientation
     * @returns {boolean}
     */
    isLandscape() {
        return this.orientation === 'landscape';
    }

    /**
     * Get pixel ratio for high-DPI displays
     * @returns {number}
     */
    getPixelRatio() {
        return window.devicePixelRatio || 1;
    }

    /**
     * Check if device is iOS
     * @returns {boolean}
     */
    isIOS() {
        return /iphone|ipad|ipod/.test(this.userAgent);
    }

    /**
     * Check if device is Android
     * @returns {boolean}
     */
    isAndroid() {
        return /android/.test(this.userAgent);
    }

    /**
     * Get viewport dimensions
     * @returns {{width: number, height: number}}
     */
    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Check if device supports vibration API
     * @returns {boolean}
     */
    supportsVibration() {
        return 'vibrate' in navigator;
    }

    /**
     * Trigger haptic feedback (if supported)
     * @param {number|number[]} pattern - Vibration pattern in milliseconds
     */
    vibrate(pattern = 10) {
        if (this.supportsVibration()) {
            navigator.vibrate(pattern);
        }
    }

    /**
     * Register callback for orientation changes
     * @param {Function} callback
     */
    onOrientationChange(callback) {
        if (!this._orientationCallbacks) {
            this._orientationCallbacks = [];
        }
        this._orientationCallbacks.push(callback);
    }

    /**
     * Notify orientation change callbacks
     * @private
     */
    _notifyOrientationChange() {
        if (this._orientationCallbacks) {
            this._orientationCallbacks.forEach(callback => {
                callback(this.orientation);
            });
        }
    }

    /**
     * Get a summary of device capabilities
     * @returns {Object}
     */
    getDeviceInfo() {
        return {
            deviceType: this.deviceType,
            screenSize: this.screenSize,
            orientation: this.orientation,
            touchSupport: this.touchSupport,
            viewport: this.getViewportSize(),
            pixelRatio: this.getPixelRatio(),
            isIOS: this.isIOS(),
            isAndroid: this.isAndroid(),
            supportsVibration: this.supportsVibration()
        };
    }

    /**
     * Add device-specific classes to body element
     */
    addDeviceClasses() {
        const body = document.body;

        // Add device type class
        body.classList.add(`device-${this.deviceType}`);

        // Add screen size class
        body.classList.add(`screen-${this.screenSize}`);

        // Add orientation class
        body.classList.add(`orientation-${this.orientation}`);

        // Add touch support class
        if (this.touchSupport) {
            body.classList.add('touch-enabled');
        } else {
            body.classList.add('no-touch');
        }

        // Add OS classes
        if (this.isIOS()) {
            body.classList.add('os-ios');
        } else if (this.isAndroid()) {
            body.classList.add('os-android');
        }
    }

    /**
     * Update device classes (call on resize/orientation change)
     */
    updateDeviceClasses() {
        const body = document.body;

        // Remove old classes
        body.classList.remove('screen-small', 'screen-medium', 'screen-large', 'screen-xlarge');
        body.classList.remove('orientation-portrait', 'orientation-landscape');

        // Add updated classes
        body.classList.add(`screen-${this.screenSize}`);
        body.classList.add(`orientation-${this.orientation}`);
    }
}

// Create singleton instance
export const deviceDetection = new DeviceDetection();

// Auto-update classes on resize
window.addEventListener('resize', () => {
    deviceDetection.updateDeviceClasses();
});
