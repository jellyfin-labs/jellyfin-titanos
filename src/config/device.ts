import type { TitanSDK } from '@titan-os/sdk';

export interface DeviceInfo {
	deviceId: string;
	deviceName: string;
	appName: string;
	appVersion: string;
}

export async function getDeviceInfo(titanSDK: TitanSDK): Promise<DeviceInfo> {
	const nativeInfo = await titanSDK.deviceInfo.getDeviceInfo();

	return {
		deviceId: nativeInfo.Product.deviceID,
		deviceName: nativeInfo.Product.platform,
		appName: 'Jellyfin for Titan OS',
		appVersion: import.meta.env.VERSION_NAME || 'Unknown',
	};
}
