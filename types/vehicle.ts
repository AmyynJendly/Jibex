export type VehicleType = 'motorcycle' | 'car' | 'van' | 'bicycle';

/**
 * The driver's vehicle. The real server only knows the plate (on each
 * runsheet, when dispatch filled it in), so everything else is optional.
 */
export interface Vehicle {
  plate: string;
  type?: VehicleType;
  model?: string;
  color?: string;
}
