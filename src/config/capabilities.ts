import type { TitanSDK, DeviceInfo } from '@titan-os/sdk';

export interface DeviceCapabilities {
  supportsHdr10: boolean;
  supportsDolbyVision: boolean;
}

export function getDeviceCapabilities(nativeInfo: DeviceInfo): DeviceCapabilities {
  return {
    supportsHdr10: !!nativeInfo.Capability.supportHDR_HDR10,
    supportsDolbyVision: !!nativeInfo.Capability.supportHDR_DV,
  };
}
