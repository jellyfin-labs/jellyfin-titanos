/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

(function(AppInfo, deviceInfo) {
    'use strict';

    console.log('TitanOS adapter');

    function postMessage(type, data) {
        window.top.postMessage({
            type: type,
            data: data
        }, '*');
    }

    // List of supported features for TitanOS
    var SupportedFeatures = [
        'displaylanguage',
        'exit',
        'exitmenu',
        'externallinks',
        'htmlaudioautoplay',
        'htmlvideoautoplay',
        'multiserver',
        'remoteaudio',
        'remotecontrol',
        'remotevideo',
        'screensaver',
        'subtitleappearancesettings',
        'subtitleburnsettings',
        'targetblank'
    ];

    // Get device capabilities from Titan SDK
    var deviceCapabilities = null;

    function getDeviceProfile() {
        var profile = {
            enableMkvProgressive: false,
            enableSsaRender: true
        };

        if (deviceCapabilities) {
            profile.supportsDolbyAtmos = deviceCapabilities.supportDolbyAtmos;
            profile.supportsDolbyVision = deviceCapabilities.supportHDR_DV;
            profile.supportsHdr10 = deviceCapabilities.supportHDR_HDR10;
            profile.supportsHdr = deviceCapabilities.supportHDR;
            profile.supportsPhysicalVolumeControl = true;

            // Streaming format support
            profile.supportsMpegDash = deviceCapabilities.supportMPEG_DASH;
            profile.supportsHls = deviceCapabilities.supportAppleHLS;
            profile.supportsSmoothStreaming = deviceCapabilities.supportMSSmoothStreaming;

            // DRM support
            profile.drm = {
                playready: deviceCapabilities.supportPlayready === true || deviceCapabilities.supportPlayready === 'true',
                widevine: deviceCapabilities.supportWidevineModular === true || deviceCapabilities.supportWidevineModular === 'true'
            };
        }

        return profile;
    }

    // Initialize device capabilities from Titan SDK
    function initDeviceCapabilities() {
        if (typeof getTitanSDK === 'function') {
            var titanSDK = getTitanSDK();
            if (titanSDK && titanSDK.isReady) {
                var SDK_TIMEOUT = 10000;
                Promise.race([
                    titanSDK.isReady,
                    new Promise(function(_, reject) {
                        setTimeout(function() { reject(new Error('Titan SDK timed out')); }, SDK_TIMEOUT);
                    })
                ]).then(function() {
                    if (titanSDK.deviceInfo) {
                        titanSDK.deviceInfo.getDeviceInfo().then(function(info) {
                            deviceCapabilities = {
                                supportDolbyAtmos: info.Capability?.supportDolbyAtmos,
                                supportHDR_DV: info.Capability?.supportHDR_DV,
                                supportHDR_HDR10: info.Capability?.supportHDR_HDR10,
                                supportHDR: info.Capability?.supportHDR,
                                supportPlayready: info.Capability?.supportPlayready,
                                supportWidevineModular: info.Capability?.supportWidevineModular,
                                supportMPEG_DASH: info.Capability?.supportMPEG_DASH,
                                supportAppleHLS: info.Capability?.supportAppleHLS,
                                supportMSSmoothStreaming: info.Capability?.supportMSSmoothStreaming
                            };
                            console.log('Device capabilities loaded:', deviceCapabilities);
                        }).catch(function(err) {
                            console.error('Failed to get device capabilities:', err);
                        });
                    }
                }).catch(function(err) {
                    console.error('Titan SDK not ready:', err);
                });
            }
        }
    }

    // Initialize on load
    initDeviceCapabilities();

    window.NativeShell = {
        AppHost: {
            init: function () {
                postMessage('AppHost.init', AppInfo);
                return Promise.resolve(AppInfo);
            },

            appName: function () {
                return AppInfo.appName;
            },

            appVersion: function () {
                return AppInfo.appVersion;
            },

            deviceId: function () {
                return AppInfo.deviceId;
            },

            deviceName: function () {
                return AppInfo.deviceName;
            },

            exit: function () {
                postMessage('AppHost.exit');
                // For TitanOS, try to use the platform exit API
                if (typeof getTitanSDK === 'function') {
                    var titanSDK = getTitanSDK();
                    if (titanSDK && titanSDK.appLifecycle) {
                        titanSDK.appLifecycle.exit();
                    }
                }
            },

            getDefaultLayout: function () {
                return 'tv';
            },

            getDeviceProfile: function (profileBuilder) {
                return profileBuilder(getDeviceProfile());
            },

            getSyncProfile: function (profileBuilder) {
                return profileBuilder({ enableMkvProgressive: false });
            },

            supports: function (command) {
                return command && SupportedFeatures.indexOf(command.toLowerCase()) != -1;
            },

            screen: function () {
                return deviceInfo ? {
                    width: deviceInfo.screenWidth || window.screen.width,
                    height: deviceInfo.screenHeight || window.screen.height
                } : {
                    width: window.screen.width,
                    height: window.screen.height
                };
            }
        },

        selectServer: function () {
            postMessage('selectServer');
        },

        downloadFile: function (url) {
            postMessage('downloadFile', { url: url });
        },

        // NOTE: Titan OS apps already run fullscreen in Chromium. The Fullscreen API
        // may be a no-op or unsupported in the embedded TV browser. Needs real TV testing.
        // No webkit prefix needed — all Titan OS Chromium versions (84+) support unprefixed API.
        enableFullscreen: function () {
            var elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(function (err) {
                    console.warn('Fullscreen request failed:', err);
                });
            }
            postMessage('enableFullscreen');
        },

        disableFullscreen: function () {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(function (err) {
                    console.warn('Exit fullscreen failed:', err);
                });
            }
            postMessage('disableFullscreen');
        },

        getPlugins: function () {
            return [];
        },

        openUrl: function (url, target) {
            postMessage('openUrl', {
                url: url,
                target: target
            });
        },

        updateMediaSession: function (mediaInfo) {
            postMessage('updateMediaSession', { mediaInfo: mediaInfo });
        },

        hideMediaSession: function () {
            postMessage('hideMediaSession');
        }
    };
})(window.AppInfo, window.DeviceInfo);
