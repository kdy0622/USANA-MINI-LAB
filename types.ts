
export enum Category {
  VEGETABLE = 'Vegetable',
  SEAFOOD = 'Seafood',
  MEAT = 'Meat'
}

export enum WorkerConcept {
  CONSTRUCTION = 'Construction',
  CHEF = 'Chef',
  FARMER = 'Farmer'
}

export enum AspectRatio {
  ONE_ONE = '1:1',
  THREE_FOUR = '3:4',
  FOUR_THREE = '4:3',
  NINE_SIXTEEN = '9:16',
  SIXTEEN_NINE = '16:9'
}

export enum Resolution {
  AUTO = 'Auto',
  ONE_K = '1K',
  TWO_K = '2K',
  FOUR_K = '4K'
}

export interface GenerationRequest {
  category: Category;
  dishName: string;
  workerConcept: WorkerConcept;
  aspectRatio: AspectRatio;
  resolution: Resolution;
}

export interface GeneratedResult {
  imageUrl: string;
  prompt: string;
}
