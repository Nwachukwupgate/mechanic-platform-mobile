export const VEHICLE_TYPES = [
  { value: 'SEDAN', label: 'Saloon / Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'HATCHBACK', label: 'Hatchback' },
  { value: 'VAN', label: 'Van' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
] as const

export const CAR_BRANDS = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Lexus',
  'Jeep', 'Ram', 'GMC', 'Dodge', 'Tesla', 'Volvo', 'Land Rover',
  'Porsche', 'Jaguar', 'Mini', 'Fiat', 'Peugeot', 'Renault', 'Other',
] as const

export type VehicleTypeValue = typeof VEHICLE_TYPES[number]['value']
export type CarBrand = typeof CAR_BRANDS[number]
