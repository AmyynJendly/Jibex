export type VehicleType = 'motorcycle' | 'car' | 'van' | 'bicycle';

export interface Vehicle {
  type: VehicleType;
  plate: string;
  model: string;
  color: string;
}
