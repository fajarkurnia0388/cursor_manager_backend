// Enhanced Card and Address Generator Service - Inspired by Namso Gen
class GeneratorService {
  constructor() {
    this.defaultBin = "552461"; // MasterCard BIN
    this.defaultCountry = "US";
    
    // Card type configurations
    this.cardTypes = {
      visa: { bins: ["4"], lengths: [16], cvvLength: 3 },
      mastercard: { bins: ["51", "52", "53", "54", "55", "22", "23", "24", "25", "26", "27"], lengths: [16], cvvLength: 3 },
      amex: { bins: ["34", "37"], lengths: [15], cvvLength: 4 },
      discover: { bins: ["60", "65"], lengths: [16], cvvLength: 3 },
      diners: { bins: ["30", "36", "38"], lengths: [14], cvvLength: 3 },
      jcb: { bins: ["35"], lengths: [16], cvvLength: 3 }
    };
  }

  // Enhanced card generation with proper BIN handling and x replacement (Namso Gen Algorithm)
  generateCreditCard(bin = this.defaultBin, options = {}) {
    // Clean and validate BIN
    bin = bin.toString().trim();
    if (!bin) bin = this.defaultBin;

    // Determine card length based on BIN
    const cardLength = this.getCardLength(bin);
    
    // Generate card number with x replacement exactly like Namso Gen
    let cardNumber = this.generateCardNumberNamsoStyle(bin, cardLength);

    // Generate expiry date with Namso Gen style range  
    const expiryData = this.generateExpiryNamsoStyle(options.month, options.year);

    // Generate CVV based on card type (Namso Gen style)
    const cvv = this.generateCVVNamsoStyle(bin, options.cvv);

    return {
      number: cardNumber,
      month: expiryData.month,
      year: expiryData.year,
      cvv: cvv
    };
  }

  // Generate card number exactly like Namso Gen
  generateCardNumberNamsoStyle(bin, targetLength) {
    let processedBin = "";
    
    // Process BIN and replace 'x' with random digits (exact Namso Gen algorithm)
    for (let i = 0; i < bin.length && processedBin.length < targetLength - 1; i++) {
      const char = bin[i].toLowerCase();
      if (char === "x") {
        processedBin += Math.floor(Math.random() * 10);
      } else if (!isNaN(char) && char !== ' ') {
        processedBin += char;
      }
    }

    // Fill remaining digits (except last one for checksum)  
    while (processedBin.length < targetLength - 1) {
      processedBin += Math.floor(Math.random() * 10);
    }

    // Calculate and append Luhn checksum (Namso Gen style)
    const checkDigit = this.calculateLuhnCheckDigitNamso(processedBin);
    return processedBin + checkDigit;
  }

  // Luhn checksum calculation exactly like Namso Gen
  calculateLuhnCheckDigitNamso(cardNumber) {
    const digits = cardNumber.split('').map(Number);
    let sum = 0;

    // Double the value of alternate digits starting from the rightmost
    for (let i = digits.length - 1; i >= 0; i -= 2) {
      digits[i] *= 2;
      if (digits[i] > 9) {
        digits[i] -= 9;
      }
    }

    // Sum all digits
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i];
    }

    // Calculate the checksum
    const mod = sum % 10;
    const checkDigit = mod !== 0 ? 10 - mod : 0;
    return checkDigit;
  }

  // Determine card length based on BIN (enhanced detection)
  getCardLength(bin) {
    // Remove any x's and spaces for detection
    const cleanBin = bin.replace(/[x\s]/gi, '');
    
    // Amex detection
    if (/^3[47]/.test(cleanBin)) return 15;
    
    // Diners Club detection  
    if (/^3[0689]/.test(cleanBin)) return 14;
    
    // Default to 16 for Visa, MasterCard, Discover, etc.
    return 16;
  }

  // Generate expiry date exactly like Namso Gen
  generateExpiryNamsoStyle(monthOption, yearOption) {
    let month, year;
    
    if (monthOption === "Random" || !monthOption || monthOption === "") {
      // Random month from 01-12 (Namso Gen style)
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      month = months[Math.floor(Math.random() * 12)];
    } else {
      month = parseInt(monthOption).toString().padStart(2, '0');
    }
    
    if (yearOption === "Random" || !yearOption || yearOption === "") {
      // Generate year between 2025-2033 (exact Namso Gen range)
      const futureYears = ["2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033"];
      year = futureYears[Math.floor(Math.random() * futureYears.length)];
    } else {
      year = yearOption.toString();
    }

    return {
      month: month,
      year: year.slice(-2) // Always return 2-digit year
    };
  }

  // Generate CVV exactly like Namso Gen 
  generateCVVNamsoStyle(bin, cvvOption) {
    if (cvvOption && cvvOption !== "Random" && cvvOption !== "") {
      return cvvOption.toString().padStart(3, '0');
    }

    // Determine CVV length based on card type (Namso Gen logic)
    const cvvLength = /^3[47]/.test(bin) ? 4 : 3; // Amex has 4-digit CVV
    
    let cvv = "";
    for (let i = 0; i < cvvLength; i++) {
      cvv += Math.floor(Math.random() * 10);
    }
    
    // Ensure 3-digit CVV is padded (like "003")
    return cvv.padStart(cvvLength, '0');
  }

  // Calculate Luhn check digit
  calculateLuhnCheckDigit(cardNumber) {
    const digits = cardNumber.split('').reverse().map(Number);
    let sum = 0;

    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (i % 2 === 1) { // Every second digit from right
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit;
  }

  // Generate multiple credit cards with enhanced options
  generateMultipleCards(quantity = 10, bin = this.defaultBin, options = {}) {
    const cards = [];
    for (let i = 0; i < quantity; i++) {
      cards.push(this.generateCreditCard(bin, options));
    }
    return cards;
  }

  // Format cards for display (pipe format like Namso Gen)
  formatCardsForDisplay(cards) {
    return cards.map(card => 
      `${card.number}|${card.month}|20${card.year}|${card.cvv}`
    ).join('\n');
  }

  // Generate cards with specific BIN pattern (Namso Gen style)
  generateCardsFromBinPattern(binPattern, options = {}) {
    const quantity = options.quantity || 10;
    const month = options.month || "Random";
    const year = options.year || "Random"; 
    const cvv = options.cvv || "Random";

    const cards = [];
    for (let i = 0; i < quantity; i++) {
      const cardOptions = { month, year, cvv };
      cards.push(this.generateCreditCard(binPattern, cardOptions));
    }
    
    return cards;
  }

  // Get popular BIN patterns (like Namso Gen presets)
  getPopularBins() {
    return {
      visa: [
        "4532xxxxxxxxxxxxxxx",
        "4556xxxxxxxxxxxxxxx", 
        "4485xxxxxxxxxxxxxxx",
        "4024xxxxxxxxxxxxxxx",
        "4716xxxxxxxxxxxxxxx"
      ],
      mastercard: [
        "5555xxxxxxxxxxxxxxx",
        "5524xxxxxxxxxxxxxxx",
        "5105xxxxxxxxxxxxxxx", 
        "5454xxxxxxxxxxxxxxx",
        "5424xxxxxxxxxxxxxxx"
      ],
      amex: [
        "3782xxxxxxxxxxxxxxx",
        "3714xxxxxxxxxxxxxxx",
        "3716xxxxxxxxxxxxxxx"
      ],
      discover: [
        "6011xxxxxxxxxxxxxxx",
        "6506xxxxxxxxxxxxxxx"
      ]
    };
  }

  // Generate random name (English)
  generateName() {
    const firstNames = [
      'John', 'James', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
      'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
      'Donald', 'Steven', 'Paul', 'Andrew', 'Kenneth', 'Joshua', 'Kevin', 'Brian',
      'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
      'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra',
      'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly',
      'Deborah', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen'
    ];

    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
      'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
      'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
      'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
      'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
      'Campbell', 'Mitchell', 'Carter', 'Roberts'
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  // Address data by country
  getAddressData(country = this.defaultCountry) {
    const addressData = {
      'US': {
        states: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
        cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
        streets: ['Main St', 'Oak St', 'Pine St', 'Elm St', 'Cedar St', 'Park Ave', 'Maple St', 'Washington St', 'Lincoln Ave', 'Jefferson St'],
        zipPattern: () => Math.floor(Math.random() * 90000 + 10000).toString()
      },
      'CA': {
        provinces: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK'],
        cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Mississauga', 'Winnipeg', 'Quebec City', 'Hamilton'],
        streets: ['King St', 'Queen St', 'Yonge St', 'Bay St', 'Church St', 'College St', 'Dundas St', 'Bloor St', 'Richmond St', 'Adelaide St'],
        zipPattern: () => {
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const nums = Math.floor(Math.random() * 10);
          const let1 = letters[Math.floor(Math.random() * letters.length)];
          const let2 = letters[Math.floor(Math.random() * letters.length)];
          const let3 = letters[Math.floor(Math.random() * letters.length)];
          return `${let1}${nums}${let2} ${nums}${let3}${nums}`;
        }
      },
      'GB': {
        counties: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
        cities: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Sheffield', 'Edinburgh', 'Bristol', 'Cardiff'],
        streets: ['High St', 'Church St', 'Main St', 'Station Rd', 'Victoria St', 'Mill Lane', 'School Lane', 'The Green', 'New St', 'Kings Rd'],
        zipPattern: () => {
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const nums = Math.floor(Math.random() * 10);
          return `${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${nums} ${nums}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}`;
        }
      },
      'DE': {
        states: ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen'],
        cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
        streets: ['Hauptstraße', 'Kirchgasse', 'Schulstraße', 'Bahnhofstraße', 'Gartenstraße', 'Dorfstraße', 'Mühlenstraße', 'Bergstraße', 'Lindenstraße', 'Parkstraße'],
        zipPattern: () => Math.floor(Math.random() * 90000 + 10000).toString()
      },
      'PL': {
        voivodeships: ['Mazowieckie', 'Śląskie', 'Wielkopolskie', 'Małopolskie', 'Dolnośląskie', 'Łódzkie', 'Kujawsko-pomorskie', 'Pomorskie', 'Podkarpackie', 'Lubelskie'],
        cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice'],
        streets: ['ul. Główna', 'ul. Kościelna', 'ul. Szkolna', 'ul. Ogrodowa', 'ul. Leśna', 'ul. Polna', 'ul. Słoneczna', 'ul. Krótka', 'ul. Długa', 'ul. Nowa'],
        zipPattern: () => {
          const first = Math.floor(Math.random() * 90 + 10);
          const second = Math.floor(Math.random() * 900 + 100);
          return `${first}-${second}`;
        }
      }
    };

    return addressData[country] || addressData['US'];
  }

  // Generate address for specific country
  generateAddress(country = this.defaultCountry) {
    const data = this.getAddressData(country);
    
    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streetName = data.streets[Math.floor(Math.random() * data.streets.length)];
    const city = data.cities[Math.floor(Math.random() * data.cities.length)];
    const postalCode = data.zipPattern();
    
    let state = '';
    if (data.states) state = data.states[Math.floor(Math.random() * data.states.length)];
    else if (data.provinces) state = data.provinces[Math.floor(Math.random() * data.provinces.length)];
    else if (data.counties) state = data.counties[Math.floor(Math.random() * data.counties.length)];
    else if (data.voivodeships) state = data.voivodeships[Math.floor(Math.random() * data.voivodeships.length)];

    return {
      street: `${streetNumber} ${streetName}`,
      city: city,
      state: state,
      postalCode: postalCode,
      country: country
    };
  }

  // Format address for display
  formatAddressForDisplay(address) {
    return `${address.street}\n${address.city}, ${address.state} ${address.postalCode}\n${address.country}`;
  }

  // Generate complete payment data with enhanced options
  generatePaymentData(options = {}) {
    const bin = options.bin || this.defaultBin;
    const country = options.country || this.defaultCountry;
    const quantity = options.quantity || 1;

    // Enhanced card generation options
    const cardOptions = {
      month: options.month,
      year: options.year, 
      cvv: options.cvv
    };

    const cards = this.generateMultipleCards(quantity, bin, cardOptions);
    const name = this.generateName();
    const address = this.generateAddress(country);

    return {
      cards: cards,
      name: name,
      address: address,
      formattedCards: this.formatCardsForDisplay(cards),
      formattedAddress: this.formatAddressForDisplay(address),
      // Additional metadata
      metadata: {
        bin: bin,
        cardType: this.detectCardType(bin),
        generatedAt: new Date().toISOString(),
        quantity: quantity
      }
    };
  }

  // Detect card type from BIN
  detectCardType(bin) {
    const cleanBin = bin.replace(/[x\s]/gi, '');
    
    if (/^4/.test(cleanBin)) return 'Visa';
    if (/^5[1-5]/.test(cleanBin) || /^2[2-7]/.test(cleanBin)) return 'MasterCard';
    if (/^3[47]/.test(cleanBin)) return 'American Express';
    if (/^6(?:011|5)/.test(cleanBin)) return 'Discover';
    if (/^3[0689]/.test(cleanBin)) return 'Diners Club';
    if (/^35/.test(cleanBin)) return 'JCB';
    
    return 'Unknown';
  }

  // Validate BIN pattern (Namso Gen style validation)
  validateBinPattern(binPattern) {
    if (!binPattern || binPattern.length < 6) {
      return { valid: false, error: "BIN must be at least 6 digits long" };
    }

    const cleanBin = binPattern.replace(/[x\s]/gi, '');
    if (cleanBin.length < 4) {
      return { valid: false, error: "BIN must contain at least 4 actual digits" };
    }

    // Check if it's a recognized card type
    const cardType = this.detectCardType(binPattern);
    
    return { 
      valid: true, 
      cardType: cardType,
      expectedLength: this.getCardLength(binPattern)
    };
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeneratorService;
}
