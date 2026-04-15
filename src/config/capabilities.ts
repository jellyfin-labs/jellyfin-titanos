import type { TitanSDK } from '@titan-os/sdk';

export interface DeviceCapabilities {
  supportsHdr10: boolean;
  supportsDolbyVision: boolean;
}

export async function getDeviceCapabilities(titanSDK: TitanSDK): Promise<DeviceCapabilities> {
  const nativeInfo = await titanSDK.deviceInfo.getDeviceInfo();

  return {
    supportsHdr10: !!nativeInfo.Capability.supportHDR_HDR10,
    supportsDolbyVision: !!nativeInfo.Capability.supportHDR_DV,
  };
}
