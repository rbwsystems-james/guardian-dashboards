// All counts, names and rates for the synthetic data live here so they can be tuned after feedback.

export const CONFIG = {
  SEED: 20261103,
  DATA_START: '2024-11-01',
  DATA_END: '2026-10-31',

  /** 0 = Sunday, 1 = Monday. Change if the operator's week starts on Monday. */
  WEEK_START: 0,
  /** Fleet uptime target line on S1 (%). */
  UPTIME_TARGET: 98,
  /** P5 excludes sites with fewer active days than this in the period. */
  MIN_ACTIVE_DAYS_P5: 14,
  /** First-time-fix window in days. */
  FTFR_WINDOW_DAYS: 7,
  /** S9 look-back in days. */
  REPEAT_OFFENDER_DAYS: 90,
  /** Range picker cap. */
  RANGE_MAX_MONTHS: 24,

  sites: {
    count: 180,
    opened: 15,
    closed: 5,
    /** Probability of 3,4,5,6 EGMs per site. */
    egmCountWeights: [0.05, 0.1, 0.2, 0.65],
    /** Share of EGMs installed / removed part-way through the window. */
    midWindowInstallShare: 0.08,
    midWindowRemoveShare: 0.04,
    qualitySigma: 0.45,
    typeWeights: { bar: 0.45, restaurant: 0.2, 'truck stop': 0.15, 'convenience store': 0.2 },
  },

  money: {
    /** Plays per EGM-day at quality 1.0. Tuned so NWPD lands around $90–100. */
    basePlays: 1000,
    meanHold: 0.095,
    holdNoiseSd: 0.045,
    floatPerEgm: 430,
  },

  service: {
    /** Calls per EGM per week before repeat calls (spec: 6–9 per 100 EGMs). */
    callsPerEgmWeek: 0.062,
    autoShare: 0.6,
    resolutionMedianHours: 2.8,
    resolutionSigma: 0.85,
    partsWaitShare: 0.18,
    stuckShare: 0.02,
    baseFixProb: 0.84,
    weakCabinetFixPenalty: 0.24,
    weakValidatorJamMultiplier: 3,
    chronicRateMultiplier: 9,
    chronicAssetsPerYear: 4,
  },

  names: {
    companies: ['Northwind Gaming Co.', 'Harbor Light Entertainment'],
    operators: ['Northwind Central', 'Northwind West', 'Harbor Light East', 'Harbor Light South'],
    /** Regions per operator (index into operators). */
    regions: [
      { name: 'North Metro', operator: 0 },
      { name: 'Lakeside', operator: 0 },
      { name: 'River Valley', operator: 1 },
      { name: 'High Plains', operator: 2 },
      { name: 'Coastal', operator: 2 },
      { name: 'Foothills', operator: 3 },
    ],
    manufacturers: { values: ['Apex Gaming', 'Brightstar', 'Cobalt Systems', 'Delta Play', 'Evergreen Games', 'Falcon Digital'], shares: [0.4, 0.22, 0.15, 0.1, 0.08, 0.05] },
    cabinets: { values: ['Slant-Top', 'Upright', 'Dual-Screen', 'Compact', 'Curved 43"', 'Bartop'], shares: [0.35, 0.25, 0.15, 0.12, 0.08, 0.05] },
    gamePacks: { values: ['Classic Reels', 'Fruit Frenzy', 'Gold Rush', 'Poker Plus', 'Mega Link', 'Lucky 7s'], shares: [0.3, 0.22, 0.18, 0.14, 0.1, 0.06] },
    validators: { values: ['BV-200', 'BV-300', 'NoteSafe X1', 'NoteSafe X2', 'ClearPay C5', 'ClearPay C7'], shares: [0.3, 0.2, 0.2, 0.12, 0.1, 0.08] },
    suppliers: { values: ['Midland Distribution', 'Coastal Gaming Supply', 'Summit Amusement', 'Prairie Parts Co.', 'Atlas Route Supply'], shares: [0.35, 0.25, 0.2, 0.12, 0.08] },
    /** Dimension value with ~2x jam rate (index into validators). */
    weakValidator: 1,
    /** Dimension value with weak first-time fix (index into cabinets). */
    weakCabinet: 2,
    games: [
      'Cherry Cascade', 'Golden Pharaoh', 'Lucky Lanterns', 'Wild Stallion', 'Diamond Rush', 'Buffalo Thunder', 'Neon Sevens', 'Triple Jackpot',
      'Pirate Plunder', 'Dragon Fortune', 'Mystic Moon', 'Treasure Trove', 'Fire Frenzy', 'Royal Flush Deluxe', 'Jungle Jewels', 'Ocean Riches',
      'Hot Peppers', 'Lightning Link', 'Silver Bullet', 'Cash Cowboy', 'Emerald Isle', 'Aztec Gold', 'Double Dragon', 'Fortune Wheel',
      'Gold Fever', 'Mega Moolah Mix', 'Safari Spin', 'Ruby Reels', 'Joker Poker', 'Deuces Wild', 'Super Bonus 7s', 'Candy Crush Cash',
      'Viking Voyage', 'Sphinx Secrets', 'Rocket Riches', 'Panda Prize', 'Frosty Fortune', 'Tiki Treasure', 'Midnight Express', 'Big Top Bucks',
    ],
    issueCategories: [
      { name: 'Bill validator jam', weight: 0.4 },
      { name: 'Printer out of paper', weight: 0.3 },
      { name: 'Printer jam', weight: 0.06 },
      { name: 'Communications offline', weight: 0.06 },
      { name: 'Game freeze / reboot', weight: 0.05 },
      { name: 'Touchscreen fault', weight: 0.04 },
      { name: 'Door open alarm', weight: 0.03 },
      { name: 'Cash box full', weight: 0.03 },
      { name: 'Ticket redemption fault', weight: 0.02 },
      { name: 'Other', weight: 0.01 },
    ],
    technicians: ['Alex Morgan', 'Jordan Reyes', 'Sam Patel', 'Casey Nguyen', 'Riley Brooks', 'Taylor Kim', 'Morgan Diaz', 'Jamie Foster'],
    siteBars: ['The Rusty Anchor', 'Lucky Horseshoe Tavern', 'Copper Kettle Pub', 'Red Fox Lounge', 'Blue Heron Bar', 'Dusty Boots Saloon', 'Old Mill Tap House', 'Silver Spur Tavern', 'The Crooked Cue', 'Maple Leaf Pub', 'Twin Pines Tavern', 'Rocky Ridge Bar', 'Gold Coast Lounge', 'The Thirsty Crow', 'Harvest Moon Tavern'],
    siteRestaurants: ['Mama Rosa Pizzeria', 'Riverside Grill', 'Big Sky Diner', 'The Corner Cafe', 'Smokehouse 66', 'Pancake Palace', 'Golden Wok', 'Hearth & Home Kitchen', 'Taco Junction', 'Prairie Rose Cafe'],
    siteTruckStops: ['Mile 42 Travel Plaza', 'Route 9 Truck Stop', 'Eagle Crossing Fuel', 'Interstate 80 Plaza', 'Pilot Rock Travel Center', 'Highway Haven'],
    siteConvenience: ['QuickStop', 'Corner Mart', 'Fuel & Go', 'Handy Stop', 'Neighborhood Market', 'EZ Mart'],
  },
} as const
