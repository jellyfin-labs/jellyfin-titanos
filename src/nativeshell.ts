import { getTitanSDK } from '@titan-os/sdk';
import { getDeviceInfo, type DeviceInfo } from './config/device';
import { features } from './config/features';
import { getDeviceCapabilities, type DeviceCapabilities } from './config/capabilities';

const titanSDK = getTitanSDK();
console.log(`Using Titan OS SDK version ${titanSDK.VERSION}`);

// Lazily loaded from AppHost.init()
let deviceInfo: DeviceInfo;
let deviceCapabilities: DeviceCapabilities;

window.NativeShell = {
	getPlugins() {
		return [];
	},

	AppHost: {
		init: async () => {
			// Wait for SDK to be ready for use
			await titanSDK.isReady;

			// Get device info & capabilities
			[deviceInfo, deviceCapabilities] = await Promise.all([getDeviceInfo(titanSDK), getDeviceCapabilities(titanSDK)]);

			console.log('Device info', deviceInfo);
			console.log('Device capabilities', deviceCapabilities);
		},

		getDefaultLayout: () => 'tv',
		supports: (feature: string) => features.includes(feature.toLowerCase()),

		deviceId: () => deviceInfo?.deviceId,
		deviceName: () => deviceInfo?.deviceName,
		appName: () => deviceInfo?.appName,
		appVersion: () => deviceInfo?.appVersion,

		getDeviceProfile: (profileBuilder: (options: any) => any) => profileBuilder(deviceCapabilities),
	},
};
