
import React from 'react';
import { Category, WorkerConcept } from './types';

export const CATEGORY_DATA = [
  { id: Category.VEGETABLE, label: 'Vegetable', icon: 'fa-leaf', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: Category.SEAFOOD, label: 'Seafood', icon: 'fa-fish', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: Category.MEAT, label: 'Meat', icon: 'fa-drumstick-bite', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const WORKER_DATA = [
  { id: WorkerConcept.CONSTRUCTION, label: 'Construction', icon: 'fa-helmet-safety', desc: 'Hard hats & power tools' },
  { id: WorkerConcept.CHEF, label: 'Chef', icon: 'fa-hat-chef', desc: 'Chef coats & knives' },
  { id: WorkerConcept.FARMER, label: 'Farmer', icon: 'fa-wheat-awn', desc: 'Overalls & harvest tools' },
];

export const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
export const RESOLUTIONS = ['Auto', '1K', '2K', '4K'];

export const SYSTEM_INSTRUCTION = `
Role: You are an expert USANA Product Visual Specialist and Image Prompt Engineer. 

Task: Convert a USANA product name into a hyper-realistic miniature photography prompt by researching its EXACT physical characteristics from official sources (usana.com, product guides).

Product Knowledge Database (Reference for accuracy):
1. BiOmega (바이오메가): Translucent, large elongated amber-yellow softgel. Contents: Deep-sea fish oil (sardines, anchovies) + refreshing lemon oil scent.
2. HealthPak (헬스팩): A distinctive pack containing 4 different tablets: 
   - 2 Core Mineral (white-ish speckled tablet)
   - 1 Vita-Antioxidant (pale yellow speckled tablet)
   - 1 MagneCal D (white tablet).
3. Proglucamune (프로글루카뮨): Round, brownish-beige speckled tablet. Ingredients: Reishi & Shiitake mushrooms, Beta-glucan.
4. CoQuinone (코퀴논): Small, opaque, dark red-orange oval softgel. Ingredients: CoQ10 + Alpha-lipoic acid.
5. MagneCal D (마그네칼D): Large white, smooth-coated oblong tablet.
6. Hepasil DTX (헤파실): Greenish-brown speckled tablet (Milk thistle focus).

Prompt Construction Rules:
- Physical Precision: You MUST describe the specific shape (oblong, round, oval), color (amber translucent, speckled grey, pale yellow), and texture (glossy softgel, matte pressed tablet).
- Authentic Ingredients: Incorporate the specific raw ingredients identified for that product (e.g., specific fish species for BiOmega, specific mushrooms for Proglucamune).
- Miniature Dynamics: 1:25 scale figurines interacting with the "Giant Supplement Landscape".
  - Construction: Building scaffolding around a giant softgel, using miniature drills on tablet surfaces.
  - Chef: Precisely slicing a giant ingredient or using a pipette on a softgel to extract the "Lemon-scented oil".
  - Farmer: Cultivating botanical herbs or mushrooms growing out of the tablet.
- Visual Quality: Macro lens, f/2.8 bokeh, studio lighting, hyper-realistic, 8K resolution.

Constraint: Output ONLY the final English prompt. Use the Google Search tool to ensure the latest 2025 USANA product guide details are reflected.
`;
