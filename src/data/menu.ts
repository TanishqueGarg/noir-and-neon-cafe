import { images } from "./images";
import type { MenuCategory, MenuItem } from "@/types";

export const categories: MenuCategory[] = [
  "Signature Coffee", "Cold Brews", "Matcha & Specialty Drinks", "Breakfast",
  "Sandwiches & Savory", "Desserts", "Seasonal Specials",
];

const base = (allergens: string[] = ["Milk"]) => ({
  image: images.drinks,
  imagePosition: "50% 50%",
  dietary: ["vegetarian"] as MenuItem["dietary"],
  ingredients: ["Specialty coffee", "Filtered water", "House recipe"],
  allergens,
});

export const menuItems: MenuItem[] = [
  { id:"sig-1",slug:"midnight-cortado",name:"Midnight Cortado",description:"Double ristretto, textured milk, cacao nib.",longDescription:"Our short, velvet-smooth signature with a deep chocolate finish and precise milk balance.",category:"Signature Coffee",price:260,badge:"Bestseller",...base() },
  { id:"sig-2",slug:"cobalt-flat-white",name:"Cobalt Flat White",description:"Honey-processed espresso, microfoam, sea salt.",longDescription:"A rich flat white built around honey-processed beans and a whisper of mineral salt.",category:"Signature Coffee",price:285,badge:"Popular",...base() },
  { id:"sig-3",slug:"after-hours-mocha",name:"After Hours Mocha",description:"70% dark chocolate, espresso, smoked vanilla.",longDescription:"Bittersweet couverture and espresso with restrained smoked vanilla—not a dessert in disguise.",category:"Signature Coffee",price:320,...base() },
  { id:"sig-4",slug:"lime-tonic-espresso",name:"Lime Tonic Espresso",description:"Espresso, tonic, makrut lime, black salt.",longDescription:"Sparkling, aromatic and sharply refreshing, poured over hand-cut ice.",category:"Signature Coffee",price:310,badge:"New",...base([]),dietary:["vegan","gluten-free"] },

  { id:"cold-1",slug:"blackout-cold-brew",name:"Blackout Cold Brew",description:"18-hour steep, jaggery cold foam.",longDescription:"Slow-steeped for a round body, finished with a light jaggery cream cap.",category:"Cold Brews",price:295,badge:"Bestseller",...base() },
  { id:"cold-2",slug:"orange-bloom-cold-brew",name:"Orange Bloom",description:"Cold brew, orange blossom, sparkling water.",longDescription:"Floral citrus lifts a chocolate-toned cold brew without masking the coffee.",category:"Cold Brews",price:310,...base([]),dietary:["vegan","gluten-free"] },
  { id:"cold-3",slug:"coconut-cloud",name:"Coconut Cloud",description:"Cold brew, tender coconut, coconut cream.",longDescription:"A tropical, dairy-free cold brew with a soft coconut finish.",category:"Cold Brews",price:335,badge:"Popular",...base(["Coconut"]),dietary:["vegan","gluten-free"] },

  { id:"mat-1",slug:"acid-lime-matcha",name:"Acid Lime Matcha",description:"Ceremonial matcha, lime leaf, oat milk.",longDescription:"Vivid matcha sharpened with fragrant lime leaf and creamy oat milk.",category:"Matcha & Specialty Drinks",price:345,badge:"Bestseller",...base(["Oats"]),dietary:["vegan"] },
  { id:"mat-2",slug:"blue-pea-yuzu-fizz",name:"Blue Pea Yuzu Fizz",description:"Butterfly pea, yuzu, soda, basil seed.",longDescription:"A bright, botanical zero-caffeine fizz with natural blue pea infusion.",category:"Matcha & Specialty Drinks",price:295,...base([]),dietary:["vegan","gluten-free"] },
  { id:"mat-3",slug:"hojicha-cloud",name:"Hojicha Cloud",description:"Roasted tea, vanilla, cashew milk.",longDescription:"Nutty Japanese roasted tea with a calm sweetness and silky cashew milk.",category:"Matcha & Specialty Drinks",price:330,badge:"New",...base(["Cashew"]),dietary:["vegan","gluten-free"] },

  { id:"brk-1",slug:"truffle-egg-fold",name:"Truffle Egg Fold",description:"Soft eggs, sourdough, parmesan, herbs.",longDescription:"Slow-folded eggs on toasted country sourdough with parmesan and truffle.",category:"Breakfast",price:425,badge:"Bestseller",...base(["Egg","Milk","Gluten"]),ingredients:["Free-range eggs","Sourdough","Parmesan","Truffle"] },
  { id:"brk-2",slug:"paneer-chilli-scramble",name:"Paneer Chilli Scramble",description:"Paneer bhurji, chilli crisp, milk bun.",longDescription:"Creamy paneer bhurji with our house chilli crisp and a toasted milk bun.",category:"Breakfast",price:395,...base(["Milk","Gluten"]),ingredients:["Paneer","Tomato","Chilli crisp","Milk bun"] },
  { id:"brk-3",slug:"buckwheat-granola-bowl",name:"Buckwheat Granola Bowl",description:"Coconut yogurt, seasonal fruit, cacao.",longDescription:"Crunchy buckwheat clusters, cultured coconut yogurt and market fruit.",category:"Breakfast",price:360,...base(["Nuts","Coconut"]),dietary:["vegan","gluten-free"],ingredients:["Buckwheat","Coconut yogurt","Seasonal fruit","Cacao"] },
  { id:"brk-4",slug:"miso-mushroom-toast",name:"Miso Mushroom Toast",description:"Wild mushrooms, miso butter, sourdough.",longDescription:"Umami-rich mushrooms on charred sourdough with miso butter and herbs.",category:"Breakfast",price:440,badge:"Popular",...base(["Milk","Soy","Gluten"]),ingredients:["Mushrooms","Miso butter","Sourdough","Herbs"] },

  { id:"sav-1",slug:"gochujang-paneer-melt",name:"Gochujang Paneer Melt",description:"Paneer, gochujang, cheddar, focaccia.",longDescription:"A bold paneer melt with fermented chilli warmth and a crisp focaccia crust.",category:"Sandwiches & Savory",price:475,badge:"Bestseller",...base(["Milk","Soy","Gluten"]),ingredients:["Paneer","Gochujang","Cheddar","Focaccia"] },
  { id:"sav-2",slug:"roast-chicken-club",name:"Roast Chicken Club",description:"Herb chicken, aioli, pickles, milk bread.",longDescription:"Slow-roasted chicken, sharp house pickles and garlic aioli on toasted bread.",category:"Sandwiches & Savory",price:525,...base(["Egg","Gluten"]),dietary:[],ingredients:["Chicken","Aioli","Pickles","Milk bread"] },
  { id:"sav-3",slug:"kimchi-cheese-toastie",name:"Kimchi Cheese Toastie",description:"House kimchi, cheddar, spring onion.",longDescription:"Crisp-edged comfort food with tangy house kimchi and molten cheddar.",category:"Sandwiches & Savory",price:420,badge:"Popular",...base(["Milk","Soy","Gluten"]),ingredients:["Kimchi","Cheddar","Sourdough","Spring onion"] },
  { id:"sav-4",slug:"pesto-vegetable-focaccia",name:"Pesto Garden Focaccia",description:"Roast vegetables, basil pesto, rocket.",longDescription:"A generous focaccia filled with roasted market vegetables and bright pesto.",category:"Sandwiches & Savory",price:445,...base(["Nuts","Gluten"]),dietary:["vegan"],ingredients:["Focaccia","Roast vegetables","Vegan pesto","Rocket"] },

  { id:"des-1",slug:"burnt-basque-cheesecake",name:"Burnt Basque Cheesecake",description:"Caramelized top, vanilla bean, sea salt.",longDescription:"Deeply burnished, barely set cheesecake served at room temperature.",category:"Desserts",price:385,badge:"Bestseller",...base(["Milk","Egg"]),ingredients:["Cream cheese","Eggs","Vanilla","Sea salt"] },
  { id:"des-2",slug:"dark-chocolate-miso-tart",name:"Chocolate Miso Tart",description:"70% chocolate, white miso, sesame.",longDescription:"A precise dark chocolate tart with subtle savoury depth and sesame crunch.",category:"Desserts",price:360,badge:"Popular",...base(["Milk","Gluten","Sesame","Soy"]),ingredients:["Dark chocolate","White miso","Sesame","Pastry"] },
  { id:"des-3",slug:"tiramisu-after-dark",name:"Tiramisu After Dark",description:"Espresso, mascarpone, dark rum aroma.",longDescription:"Our soft-set house tiramisu with intense espresso and cocoa.",category:"Desserts",price:395,...base(["Milk","Egg","Gluten"]),ingredients:["Mascarpone","Espresso","Cocoa","Savoiardi"] },
  { id:"des-4",slug:"jaggery-choux",name:"Jaggery Choux",description:"Choux, jaggery diplomat, coffee praline.",longDescription:"Crisp choux with caramel-like jaggery cream and coffee praline.",category:"Desserts",price:325,badge:"New",...base(["Milk","Egg","Gluten","Nuts"]),ingredients:["Choux pastry","Jaggery","Coffee","Hazelnut"] },

  { id:"sea-1",slug:"monsoon-maple-latte",name:"Monsoon Maple Latte",description:"Espresso, maple, pepper, orange zest.",longDescription:"A rain-season latte with a warming pepper note and fresh orange oils.",category:"Seasonal Specials",price:340,badge:"New",...base() },
  { id:"sea-2",slug:"mango-matcha-soda",name:"Mango Matcha Soda",description:"Alphonso mango, matcha, sparkling water.",longDescription:"Layered mango and matcha with a dry sparkling finish.",category:"Seasonal Specials",price:350,badge:"New",...base([]),dietary:["vegan","gluten-free"] },
  { id:"sea-3",slug:"coffee-cascara-kulfi",name:"Cascara Kulfi",description:"Coffee cherry, cardamom, pistachio.",longDescription:"A café-seasonal kulfi perfumed with coffee cherry and green cardamom.",category:"Seasonal Specials",price:295,...base(["Milk","Pistachio"]),ingredients:["Milk","Cascara","Cardamom","Pistachio"] },
];

export const getMenuItem = (slug: string) => menuItems.find((item) => item.slug === slug);
