import type { TitanSDK } from '@titan-os/sdk';

export interface DeviceInfo {
	deviceId: string;
	deviceName: string;
	appName: string;
	appVersion: string;
	platform: string;
	year: string;
	firmwareVersion: string;
}

export interface TitanDeviceCapabilities {
	supportDolbyAtmos?: boolean | string;
	supportHDR_DV?: boolean | string;
	supportHDR_HDR10?: boolean | string;
	supportHDR?: boolean | string;
	supportPlayready?: boolean | string;
	supportWidevineModular?: boolean | string;
	supportMPEG_DASH?: boolean | string;
	supportAppleHLS?: boolean | string;
	supportMSSmoothStreaming?: boolean | string;
}

export async function getDeviceInfo(titanSDK: TitanSDK): Promise<DeviceInfo> {
	const nativeInfo = await titanSDK.deviceInfo.getDeviceInfo();

	return {
		deviceId: nativeInfo.Product?.deviceID || 'unknown',
		deviceName: nativeInfo.Product?.platform || 'Titan OS TV',
		appName: 'Jellyfin for Titan OS',
		appVersion: import.meta.env.VERSION_NAME || '0.0.0',
		platform: nativeInfo.Product?.platform || 'TitanOS',
		year: nativeInfo.Product?.year || 'unknown',
		firmwareVersion: nativeInfo.Product?.firmwareVersion || 'unknown',
	};
}
