import { getTitanSDK } from '@titan-os/sdk';
import { getDeviceInfo, type DeviceInfo } from './config/device';
import { features } from './config/features';

const titanSDK = getTitanSDK();
console.log(`Using Titan OS SDK version ${titanSDK.VERSION}`);

// Lazily loaded from AppHost.init()
let deviceInfo: DeviceInfo;

window.NativeShell = {
	getPlugins() {
		return ['TitanOsLoaderPlugin'];
	},

	AppHost: {
		init: async () => {
			// Wait for SDK to be ready for use
			await titanSDK.isReady;

			// Get device info
			deviceInfo = await getDeviceInfo(titanSDK);
			console.log('Retrieved device info', deviceInfo);
		},

		getDefaultLayout: () => 'tv',
		supports: (feature: string) => features.includes(feature.toLowerCase()),

		deviceId: () => deviceInfo?.deviceId,
		deviceName: () => deviceInfo?.deviceName,
		appName: () => deviceInfo?.appName,
		appVersion: () => deviceInfo?.appVersion,
	},
};
