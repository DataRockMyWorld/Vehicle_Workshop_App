/**
 * Popular car makes and models, especially common in Africa.
 * Used for dropdown/autocomplete when adding vehicles.
 */
export const CAR_MAKES_MODELS = {
  Toyota: [
    'Corolla', 'Camry', 'Hilux', 'Land Cruiser', 'Yaris', 'Hiace', 'RAV4',
    'Prado', 'Avensis', 'Fortuner', 'Innova', 'Vitz', 'Premio', 'Wish',
  ],
  Nissan: [
    'Note', 'Patrol', 'Navara', 'Qashqai', 'Juke', 'X-Trail', 'Almera',
    'Sentra', 'Tiida', 'Dualis', 'Terrano', 'Primastar',
  ],
  Honda: [
    'Civic', 'Accord', 'CR-V', 'Fit', 'Jazz', 'HR-V', 'City', 'Pilot',
  ],
  Hyundai: [
    'Tucson', 'Santa Fe', 'i10', 'i20', 'Elantra', 'Getz', 'i30',
    'Kona', 'Creta', 'Accent', 'Venue', 'Sonata',
  ],
  Kia: [
    'Sportage', 'Picanto', 'Rio', 'Sorento', 'Cerato', 'Optima',
    'Seltos', 'Stonic', 'Carens', 'Ceed',
  ],
  Volkswagen: [
    'Polo', 'Golf', 'Passat', 'Tiguan', 'Amarok', 'T-Cross',
    'Touareg', 'Caddy', 'Transporter', 'Jetta',
  ],
  'Mercedes-Benz': [
    'C-Class', 'E-Class', 'A-Class', 'B-Class', 'GLE', 'GLC',
    'Sprinter', 'Vito', 'ML-Class', 'CLA',
  ],
  BMW: [
    '3 Series', '5 Series', '1 Series', 'X1', 'X3', 'X5',
    '2 Series', '4 Series', '320i', '520i',
  ],
  Peugeot: [
    '206', '207', '208', '308', '3008', '508', '2008', '5008',
    'Partner', 'Expert', 'Boxer',
  ],
  Ford: [
    'Ranger', 'Focus', 'Fiesta', 'Everest', 'Figo', 'EcoSport',
    'Kuga', 'Explorer', 'Transit', 'Mustang',
  ],
  Isuzu: [
    'D-Max', 'Trooper', 'MU-X', 'KB', 'Rodeo', 'Pickup',
  ],
  Suzuki: [
    'Swift', 'Vitara', 'Baleno', 'Jimny', 'Alto', 'Celerio',
    'Ertiga', 'Grand Vitara', 'Ignis',
  ],
  Mazda: [
    '3', '6', 'CX-5', 'CX-3', '2', 'CX-30', 'BT-50',
    'Demio', 'Premacy', 'Tribute',
  ],
  Chevrolet: [
    'Spark', 'Aveo', 'Captiva', 'Cruze', 'Orlando', 'Trailblazer',
    'Lumina', 'Corsa', 'Optra',
  ],
  Renault: [
    'Duster', 'Logan', 'Sandero', 'Clio', 'Megane', 'Kadjar',
    'Koleos', 'Captur', 'Kangoo', 'Master',
  ],
  Mitsubishi: [
    'Pajero', 'L200', 'Outlander', 'ASX', 'Triton', 'Colt',
    'Lancer', 'Eclipse Cross',
  ],
  Subaru: [
    'Forester', 'Outback', 'Impreza', 'XV', 'Legacy', 'Tribeca',
  ],
  'Land Rover': [
    'Defender', 'Discovery', 'Range Rover', 'Freelander', 'Evoque',
  ],
  Jeep: [
    'Cherokee', 'Grand Cherokee', 'Compass', 'Wrangler', 'Patriot',
  ],
  Audi: [
    'A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'A1', 'A5',
  ],
  Lexus: [
    'RX', 'IS', 'ES', 'NX', 'LX', 'GS', 'CT', 'UX',
  ],
  'Daihatsu': [
    'Terios', 'Sirion', 'Charade', 'Cuore', 'Materia',
  ],
}

export const CAR_MAKES = Object.keys(CAR_MAKES_MODELS).sort()

export function getModelsForMake(make) {
  return CAR_MAKES_MODELS[make] || []
}
