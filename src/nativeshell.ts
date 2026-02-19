import { getTitanSDK, type TitanSDK } from '@titan-os/sdk';
import { detectBrowser } from './config/browser';
import { getDeviceInfo, type DeviceInfo, type TitanDeviceCapabilities } from './config/device';
import { features } from './config/features';

// Detect browser capabilities early (no SDK needed)
const browser = detectBrowser();
console.log(`Chrome ${browser.chromeMajor}, model year: ${browser.modelYear || 'unknown'}`);

// Initialize Titan SDK
const titanSDK = getTitanSDK();
console.log(`Using Titan OS SDK version ${titanSDK.VERSION}`);

// Global state
let deviceInfo: DeviceInfo;
let deviceCapabilities: TitanDeviceCapabilities;
let isExiting = false;

// Post message to the parent (jellyfin-web runs in iframe)
function postMessage(type: string, data?: unknown) {
	window.parent?.postMessage({ type, data }, '*');
}

// Get screen dimensions
function getScreenDimensions() {
	return {
		width: window.screen.width,
		height: window.screen.height,
	};
}

// Handle remote control key events
function handleKeyDown(event: KeyboardEvent) {
	const keyCode = event.keyCode;

	// Back button: 8 (Philips), 461 (JVC)
	if (keyCode === 8 || keyCode === 461) {
		event.preventDefault();
		handleBackPress();
	}

	// D-pad navigation
	switch (keyCode) {
		case 38: // Up
			event.preventDefault();
			postMessage('remotecontrol', { action: 'up' });
			break;
		case 40: // Down
			event.preventDefault();
			postMessage('remotecontrol', { action: 'down' });
			break;
		case 37: // Left
			event.preventDefault();
			postMessage('remotecontrol', { action: 'left' });
			break;
		case 39: // Right
			event.preventDefault();
			postMessage('remotecontrol', { action: 'right' });
			break;
		case 13: // OK/Enter
			event.preventDefault();
			postMessage('remotecontrol', { action: 'select' });
			break;
		case 27: // Exit/Back (alternative)
			event.preventDefault();
			handleBackPress();
			break;
		case 403: // Color buttons (Red, Green, Yellow, Blue)
		case 404:
		case 405:
		case 406:
			event.preventDefault();
			const colors = { 403: 'red', 404: 'green', 405: 'yellow', 406: 'blue' };
			postMessage('remotecontrol', { action: 'color', color: colors[keyCode as keyof typeof colors] });
			break;
		case 412: // Rewind
		case 417: // FastForward
		case 415: // Play
		case 413: // Stop
		case 426: // Pause
			event.preventDefault();
			const mediaActions: Record<number, string> = {
				412: 'rewind',
				417: 'fastforward',
				415: 'play',
				413: 'stop',
				426: 'pause',
			};
			postMessage('remotecontrol', { action: 'media', command: mediaActions[keyCode] });
			break;
		case 33: // Page Up
		case 34: // Page Down
			event.preventDefault();
			postMessage('remotecontrol', { action: keyCode === 33 ? 'pageup' : 'pagedown' });
			break;
		case 18: // Menu (Guide)
			event.preventDefault();
			postMessage('remotecontrol', { action: 'menu' });
			break;
		case 457: // Play (Play button on remote)
			event.preventDefault();
			postMessage('remotecontrol', { action: 'media', command: 'play' });
			break;
		case 458: // Pause (Pause button on remote)
			event.preventDefault();
			postMessage('remotecontrol', { action: 'media', command: 'pause' });
			break;
		case 460: // Red/Info button
			event.preventDefault();
			postMessage('remotecontrol', { action: 'info' });
			break;
	}
}

// Handle back press — delegate to parent which shows exit confirmation
function handleBackPress() {
	if (isExiting) return;
	postMessage('AppHost.exit');
}

// Build device profile for video playback capabilities
function getDeviceProfile() {
	const profile: Record<string, unknown> = {
		enableMkvProgressive: false,
		enableSsaRender: true,
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
			widevine: deviceCapabilities.supportWidevineModular === true || deviceCapabilities.supportWidevineModular === 'true',
		};
	}

	return profile;
}

// Handle messages from jellyfin-web (iframe)
function handleMessageEvent(event: MessageEvent) {
	const { type, data } = event.data || {};

	switch (type) {
		case 'selectServer':
			// Trigger server selection UI
			postMessage('selectServer');
			break;
		case 'AppHost.exit':
			isExiting = true;
			titanSDK.appLifecycle?.exit();
			break;
		case 'openUrl':
			// Open external URL
			if (data?.url) {
				window.open(data.url, data.target || '_blank');
			}
			break;
		case 'downloadFile':
			// Handle file download
			if (data?.url) {
				console.log('Download requested:', data.url);
			}
			break;
		case 'enableFullscreen': {
			const elem = document.documentElement;
			if (elem.requestFullscreen) {
				elem.requestFullscreen().catch((err) => console.warn('Fullscreen request failed:', err));
			}
			break;
		}
		case 'disableFullscreen':
			if (document.fullscreenElement) {
				document.exitFullscreen().catch((err) => console.warn('Exit fullscreen failed:', err));
			}
			break;
		case 'updateMediaSession':
			// Media session update (for system media controls)
			console.log('Media session update:', data);
			break;
		case 'hideMediaSession':
			console.log('Hide media session');
			break;
	}
}

// Initialize the native shell
async function init() {
	try {
		// Wait for SDK to be ready, with a timeout to prevent infinite hangs
		const SDK_TIMEOUT = 10000;
		await Promise.race([
			titanSDK.isReady,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error(`Titan SDK initialization timed out after ${SDK_TIMEOUT}ms`)), SDK_TIMEOUT)
			),
		]);
		console.log('Titan SDK is ready');

		// Get device info and capabilities
		deviceInfo = await getDeviceInfo(titanSDK);
		console.log('Device info:', deviceInfo);

		// Get device capabilities from SDK
		const nativeInfo = await titanSDK.deviceInfo.getDeviceInfo();
		deviceCapabilities = {
			supportDolbyAtmos: nativeInfo.Capability?.supportDolbyAtmos,
			supportHDR_DV: nativeInfo.Capability?.supportHDR_DV,
			supportHDR_HDR10: nativeInfo.Capability?.supportHDR_HDR10,
			supportHDR: nativeInfo.Capability?.supportHDR,
			supportPlayready: nativeInfo.Capability?.supportPlayready,
			supportWidevineModular: nativeInfo.Capability?.supportWidevineModular,
			supportMPEG_DASH: nativeInfo.Capability?.supportMPEG_DASH,
			supportAppleHLS: nativeInfo.Capability?.supportAppleHLS,
			supportMSSmoothStreaming: nativeInfo.Capability?.supportMSSmoothStreaming,
		};
		console.log('Device capabilities:', deviceCapabilities);

		// Set up keyboard event listener for remote control
		document.addEventListener('keydown', handleKeyDown);

		// Set up message listener for communication from jellyfin-web
		window.addEventListener('message', handleMessageEvent);

		// Notify the parent (jellyfin-web) that we're initialized
		postMessage('AppHost.init', {
			deviceId: deviceInfo.deviceId,
			deviceName: deviceInfo.deviceName,
			appName: deviceInfo.appName,
			appVersion: deviceInfo.appVersion,
		});

		console.log('Native shell initialized successfully');
	} catch (error) {
		console.error('Failed to initialize native shell:', error);
	}
}

// Expose the NativeShell API to jellyfin-web
window.NativeShell = {
	getPlugins() {
		return [];
	},

	selectServer() {
		postMessage('selectServer');
	},

	downloadFile(url: string) {
		postMessage('downloadFile', { url });
	},

	// NOTE: Titan OS apps already run fullscreen in Chromium. The Fullscreen API
	// may be a no-op or unsupported in the embedded TV browser. Needs real TV testing.
	enableFullscreen() {
		const elem = document.documentElement;
		if (elem.requestFullscreen) {
			elem.requestFullscreen().catch((err) => console.warn('Fullscreen request failed:', err));
		}
	},

	disableFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch((err) => console.warn('Exit fullscreen failed:', err));
		}
	},

	openUrl(url: string, target?: string) {
		window.open(url, target || '_blank');
	},

	updateMediaSession(mediaInfo: unknown) {
		postMessage('updateMediaSession', { mediaInfo });
	},

	hideMediaSession() {
		postMessage('hideMediaSession');
	},

	AppHost: {
		init: async () => {
			await init();
			return {
				deviceId: deviceInfo?.deviceId,
				deviceName: deviceInfo?.deviceName,
				appName: deviceInfo?.appName,
				appVersion: deviceInfo?.appVersion,
			};
		},

		appName: () => deviceInfo?.appName || 'Jellyfin for Titan OS',

		appVersion: () => deviceInfo?.appVersion || '0.0.0',

		deviceId: () => deviceInfo?.deviceId,

		deviceName: () => deviceInfo?.deviceName || 'Titan OS Device',

		exit: () => {
			isExiting = true;
			postMessage('AppHost.exit');
			titanSDK.appLifecycle?.exit();
		},

		getDefaultLayout: () => 'tv',

		getDeviceProfile: () => getDeviceProfile(),

		getSyncProfile: () => ({
			enableMkvProgressive: false,
		}),

		supports: (command: string) => {
			return command && features.includes(command.toLowerCase());
		},

		screen: () => getScreenDimensions(),
	},
};
