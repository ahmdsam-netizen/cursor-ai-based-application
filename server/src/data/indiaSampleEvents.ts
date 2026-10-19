/**
 * Large India-only sample catalog (Srinagar, Delhi, Mumbai, Hyderabad, and many more).
 * IDs prefixed with `in-` to avoid clashes with global sample events.
 */

const IMG = {
  tech: "https://images.unsplash.com/photo-1540575467063-027aefd2e6b7?w=800&q=80",
  music: "https://images.unsplash.com/photo-1415201364774-f6f0a35c036b?w=800&q=80",
  food: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
  sport: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80",
  art: "https://images.unsplash.com/photo-1536922645426-5b40e9d86777?w=800&q=80",
  biz: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
  fest: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
  edu: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
};

/** City name, state code, lat, lng */
const INDIAN_CITIES: [string, string, number, number][] = [
  ["Srinagar", "JK", 34.0837, 74.7973],
  ["Delhi", "DL", 28.6139, 77.209],
  ["Mumbai", "MH", 19.076, 72.8777],
  ["Hyderabad", "TG", 17.385, 78.4867],
  ["Bengaluru", "KA", 12.9716, 77.5946],
  ["Chennai", "TN", 13.0827, 80.2707],
  ["Kolkata", "WB", 22.5726, 88.3639],
  ["Pune", "MH", 18.5204, 73.8567],
  ["Ahmedabad", "GJ", 23.0225, 72.5714],
  ["Jaipur", "RJ", 26.9124, 75.7873],
  ["Kochi", "KL", 9.9312, 76.2673],
  ["Varanasi", "UP", 25.3176, 82.9739],
  ["Amritsar", "PB", 31.634, 74.8723],
  ["Chandigarh", "CH", 30.7333, 76.7794],
  ["Indore", "MP", 22.7196, 75.8577],
  ["Panaji", "GA", 15.4986, 73.8287],
  ["Nagpur", "MH", 21.1458, 79.0882],
  ["Lucknow", "UP", 26.8467, 80.9462],
  ["Guwahati", "AS", 26.1445, 91.7362],
  ["Thiruvananthapuram", "KL", 8.5241, 76.9366],
  ["Coimbatore", "TN", 11.0168, 76.9558],
  ["Visakhapatnam", "AP", 17.6868, 83.2185],
  ["Bhopal", "MP", 23.2599, 77.4126],
  ["Patna", "BR", 25.5941, 85.1376],
  ["Surat", "GJ", 21.1702, 72.8311],
  ["Vadodara", "GJ", 22.3072, 73.1812],
  ["Rajkot", "GJ", 22.3039, 70.8022],
  ["Nashik", "MH", 19.9975, 73.7898],
  ["Agra", "UP", 27.1767, 78.0081],
  ["Dehradun", "UK", 30.3165, 78.0322],
  ["Shimla", "HP", 31.1048, 77.1734],
  ["Manali", "HP", 32.2432, 77.1892],
  ["Leh", "LA", 34.1526, 77.5771],
  ["Mysuru", "KA", 12.2958, 76.6394],
  ["Mangaluru", "KA", 12.9141, 74.856],
  ["Hubballi", "KA", 15.3647, 75.124],
  ["Madurai", "TN", 9.9252, 78.1198],
  ["Tiruchirappalli", "TN", 10.7905, 78.7047],
  ["Vijayawada", "AP", 16.5062, 80.648],
  ["Guntur", "AP", 16.3067, 80.4365],
  ["Warangal", "TG", 17.9689, 79.5941],
  ["Raipur", "CG", 21.2514, 81.6296],
  ["Ranchi", "JH", 23.3441, 85.3096],
  ["Jodhpur", "RJ", 26.2389, 73.0243],
  ["Udaipur", "RJ", 24.5854, 73.7125],
  ["Ajmer", "RJ", 26.4499, 74.6399],
  ["Gwalior", "MP", 26.2183, 78.1828],
  ["Jabalpur", "MP", 23.1815, 79.9864],
  ["Siliguri", "WB", 26.7271, 88.3953],
  ["Durgapur", "WB", 23.5204, 87.3119],
  ["Cuttack", "OR", 20.4625, 85.8829],
  ["Bhubaneswar", "OR", 20.2961, 85.8245],
  ["Imphal", "MN", 24.817, 93.9368],
  ["Shillong", "ML", 25.5788, 91.8933],
  ["Gangtok", "SK", 27.3389, 88.6065],
  ["Itanagar", "AR", 27.0844, 93.6053],
  ["Kohima", "NL", 25.6747, 94.1086],
  ["Agartala", "TR", 23.8315, 91.2868],
  ["Aizawl", "MZ", 23.7271, 92.7176],
  ["Port Blair", "AN", 11.6234, 92.7265],
  ["Puducherry", "PY", 11.9416, 79.8083],
  ["Thrissur", "KL", 10.5276, 76.2144],
  ["Kozhikode", "KL", 11.2588, 75.7804],
];

const CAT_ROT = ["Tech", "Music", "Food", "Sports", "Art", "Business", "Festivals", "Education"];
const IMG_ROT = [IMG.tech, IMG.music, IMG.food, IMG.sport, IMG.art, IMG.biz, IMG.fest, IMG.edu];

function buildEvents() {
  const out = [];
  let idCounter = 0;
  for (let ci = 0; ci < INDIAN_CITIES.length; ci++) {
    const [city, stateCode, lat, lng] = INDIAN_CITIES[ci];
    const jitter = (ci % 7) * 0.003;
    out.push({
      id: `in-${++idCounter}`,
      source: "sample",
      name: `${city} Tech & Startup Mixer`,
      description: `Founders, designers, and engineers meet for lightning talks and networking in ${city}.`,
      startDate: null,
      venue: `${city} Innovation Hub`,
      address: `Central ${city}`,
      city,
      stateCode,
      countryCode: "IN",
      lat: lat + jitter,
      lng: lng + (ci % 5) * 0.003,
      category: "Tech",
      image: IMG.tech,
      url: `https://example.com/in/${idCounter}`,
      priceRange: "paid",
      organizer: `${city} Startup Network`,
    });
    out.push({
      id: `in-${++idCounter}`,
      source: "sample",
      name: `${city} Food & Culture Night`,
      description: `Street food stalls, live folk fusion, and family activities across ${city}.`,
      startDate: null,
      venue: `${city} Exhibition Grounds`,
      address: `Ring Road, ${city}`,
      city,
      stateCode,
      countryCode: "IN",
      lat: lat - 0.008,
      lng: lng + 0.012,
      category: "Food",
      image: IMG.food,
      url: null,
      priceRange: "free",
      organizer: `${city} Tourism Board`,
    });
    const catIdx = ci % 8;
    out.push({
      id: `in-${++idCounter}`,
      source: "sample",
      name: `${city} ${CAT_ROT[catIdx]} Weekend`,
      description: `Open-air sessions celebrating ${CAT_ROT[catIdx].toLowerCase()} with local artists and experts in ${city}.`,
      startDate: null,
      venue: `${city} Town Hall Lawn`,
      address: `MG Road, ${city}`,
      city,
      stateCode,
      countryCode: "IN",
      lat: lat + 0.006,
      lng: lng - 0.006,
      category: CAT_ROT[catIdx],
      image: IMG_ROT[catIdx],
      url: `https://example.com/in/${idCounter}`,
      priceRange: ci % 3 === 0 ? "free" : "paid",
      organizer: `${city} Events Collective`,
    });
  }
  return out;
}

export const INDIA_SAMPLE_EVENTS = buildEvents();
