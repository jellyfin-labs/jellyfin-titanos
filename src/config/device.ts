import type { TitanSDK, DeviceInfo as NativeDeviceInfo } from '@titan-os/sdk';

export interface DeviceInfo {
	deviceId: string;
	deviceName: string;
	appName: string;
	appVersion: string;
}

export function getDeviceInfo(nativeInfo: NativeDeviceInfo): DeviceInfo {
	return {
		deviceId: nativeInfo.Product.deviceID,
		deviceName: nativeInfo.Product.platform,
		appName: 'Jellyfin for Titan OS',
		appVersion: import.meta.env.VERSION_NAME || 'Unknown',
	};
}
