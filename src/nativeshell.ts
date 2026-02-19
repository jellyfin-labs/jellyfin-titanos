import { getTitanSDK, type TitanSDK } from '@titan-os/sdk';
import { getDeviceInfo, type DeviceInfo, type TitanDeviceCapabilities } from './config/device';
import { features } from './config/features';

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

// Handle back press with exit confirmation
async function handleBackPress() {
	if (isExiting) return;

	// For TitanOS, we need to handle exit differently
	// The app can request to be closed via the platform
	try {
		// Try to use the app lifecycle API if available
		// For now, just post the exit message back to the parent
		postMessage('AppHost.exit');
	} catch (e) {
		console.error('Error handling back press:', e);
	}
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
		profile.supportsVideoStreamBeization = true;
		profile.supportsPhysicalVolumeControl = true;
		profile.supportsParentalControl = true;
		profile.supportsAdvancedPlayback = true;
		profile.supportsMediaPlayback = true;
		profile.supportsNextupAutoPlay = true;

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
			// Exit the app
			isExiting = true;
			// For TitanOS, we may need to call platform exit API
			// For now, just log and let the platform handle it
			console.log('App exit requested');
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
		case 'enableFullscreen':
			postMessage('enableFullscreen');
			break;
		case 'disableFullscreen':
			postMessage('disableFullscreen');
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
		// Wait for SDK to be ready
		await titanSDK.isReady;
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

	enableFullscreen() {
		postMessage('enableFullscreen');
	},

	disableFullscreen() {
		postMessage('disableFullscreen');
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
			// In a real implementation, this would call the platform exit API
		},

		getDefaultLayout: () => 'tv',

		getDeviceProfile: () => getDeviceProfile(),

		getSyncProfile: () => ({
			enableMkvProgressive: false,
		}),

		supports: (command: string) => {
			const isSupported = command && features.includes(command.toLowerCase());
			postMessage('AppHost.supports', { command, isSupported });
			return isSupported;
		},

		screen: () => getScreenDimensions(),
	},
};

// Also expose for when script is loaded directly
(window as unknown as { NativeShell: typeof window.NativeShell }).NativeShell = window.NativeShell;
