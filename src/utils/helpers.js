const { EmbedBuilder } = require('discord.js');

// Helper utility functions for the ride bot

// Location data with names and URLs
const LOCATIONS = {
  'angry-catfish': {
    name: '🚲 Angry Catfish',
    url: 'https://maps.app.goo.gl/rrxhyZeaJR5UxfKp6'
  },
  'northern-coffeeworks': {
    name: '☕Northern Coffeeworks',
    url: 'https://maps.app.goo.gl/YjYhaHCDZkeggseT9'
  },
  'venn-brewery': {
    name: '🍺 Venn Brewery',
    url: 'https://maps.app.goo.gl/L3qNdfBptyKAZuam8'
  },
  'bull-horns': {
    name: '🐂 Bull Horns',
    url: 'https://maps.app.goo.gl/ZW5c6xZdnPK3URpR8'
  },
  'sea-salt': {
    name: '🐟 Sea Salt',
    url: 'https://maps.app.goo.gl/M9fbExNSi3mWRJzR9'
  }
};

// Get default starting location based on time of day
function getDefaultStartingLocation(hours) {
  // Before noon (12 PM) = Northern Coffeeworks, after noon = Angry Catfish
  return hours < 12 ? 'northern-coffeeworks' : 'angry-catfish';
}

// Validate location
function validateLocation(location) {
  if (typeof location === 'string' && location.trim()) {
    // If it's a predefined location, validate it
    if (LOCATIONS[location]) {
      return location;
    }
    // If it's a custom location, return as is
    return location.trim();
  }
  throw new Error('Invalid location provided');
}

// Format location for display
function formatLocation(location) {
  if (!location) return null;
  
  // Check if it's a predefined location
  if (LOCATIONS[location]) {
    const loc = LOCATIONS[location];
    return `[${loc.name}](${loc.url})`;
  }
  
  // Return custom location as is
  return location;
}

// Parse date string (MM/DD format for MVP)
function parseDate(dateString) {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Handle "Today" and "Tomorrow"
  if (dateString.toLowerCase() === 'today') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  
  if (dateString.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  }
  
  // Handle MM/DD format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
  const match = dateString.match(dateRegex);
  
  if (match) {
    const month = parseInt(match[1]) - 1; // Month is 0-indexed
    const day = parseInt(match[2]);
    
    // Create date for current year
    let date = new Date(currentYear, month, day);
    
    // Create a date object for today at midnight for comparison
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // If the date has already passed this year, assume next year
    if (date < todayAtMidnight) {
      date = new Date(currentYear + 1, month, day);
    }
    
    return date;
  }
  
  throw new Error('Invalid date format. Use MM/DD, "Today", or "Tomorrow"');
}

// Parse time string (HH:MM format, 12 or 24 hour, or lazy formats like "6pm")
function parseTime(timeString) {
  // Handle lazy formats like "6pm", "9am", "12pm"
  const lazyTimeRegex = /^(\d{1,2})(am|pm)$/i;
  const lazyMatch = timeString.match(lazyTimeRegex);
  
  if (lazyMatch) {
    let hours = parseInt(lazyMatch[1]);
    const period = lazyMatch[2].toLowerCase();
    
    // Handle 12-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    // Validate hours
    if (hours < 0 || hours > 23) {
      throw new Error('Invalid time. Hours must be 1-12');
    }
    
    return { hours, minutes: 0 };
  }
  
  // Handle standard formats like "6:30pm", "14:30"
  const timeRegex = /^(\d{1,2}):(\d{2})(\s*(am|pm))?$/i;
  const match = timeString.match(timeRegex);
  
  if (!match) {
    throw new Error('Invalid time format. Use HH:MM, HH:MM AM/PM, or lazy formats like "6pm"');
  }
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[4] ? match[4].toLowerCase() : null;
  
  // Handle 12-hour format
  if (period) {
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
  }
  
  // Validate hours and minutes
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time. Hours must be 0-23, minutes must be 0-59');
  }
  
  return { hours, minutes };
}

// Format time for display (12-hour format)
function formatTime(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Format date for display with "Today" prefix if applicable
function formatDateWithToday(date, format = 'short') {
  if (!date) return 'Date not set';
  
  const today = new Date();
  const rideDate = new Date(date);
  
  // Check if the ride is today
  const isToday = rideDate.getFullYear() === today.getFullYear() &&
                 rideDate.getMonth() === today.getMonth() &&
                 rideDate.getDate() === today.getDate();
  
  if (isToday) {
    if (format === 'long') {
      return `Today, ${rideDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}`;
    } else {
      return `Today, ${rideDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })}`;
    }
  } else {
    if (format === 'long') {
      return rideDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } else {
      return rideDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }
}

// Parse mileage and convert KM to miles if needed
function parseMileage(mileageString) {
  const mileage = parseFloat(mileageString);
  
  if (isNaN(mileage) || mileage <= 0) {
    throw new Error('Mileage must be a positive number');
  }
  
  // Check if it's in kilometers (ends with 'km')
  if (mileageString.toLowerCase().includes('km')) {
    return Math.round(mileage * 0.621371 * 10) / 10; // Convert to miles, round to 1 decimal
  }
  
  return mileage;
}

// Validate route URL (Strava or RideWithGPS)
function validateRouteUrl(url) {
  const validDomains = ['strava.com', 'ridewithgps.com'];
  const urlObj = new URL(url);
  
  if (!validDomains.some(domain => urlObj.hostname.includes(domain))) {
    throw new Error('Route must be a Strava or RideWithGPS URL');
  }
  
  return url;
}

// Format ride post message
function formatRidePost(ride, action = 'created') {
  const meetTime = formatTime(ride.meetTime.hours, ride.meetTime.minutes);
  const rollTime = new Date(ride.date);
  rollTime.setHours(ride.meetTime.hours, ride.meetTime.minutes + (ride.rollTime || 0));
  const rollTimeFormatted = formatTime(rollTime.getHours(), rollTime.getMinutes());
  
  // Format date for display
  const dateDisplay = formatDateWithToday(ride.date, 'short');
  
  // Format timestamp for footer
  const timestamp = action === 'created' ? ride.createdAt : ride.updatedAt;
  const formattedTime = timestamp ? timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : 'Unknown';
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`New ${ride.type.charAt(0).toUpperCase() + ride.type.slice(1)} Ride 🚴🚴‍♀️`)
    .setColor(getRideColor(ride.type))
    .setFooter({ text: `URG Ride Maker • ${action === 'created' ? 'Created' : 'Updated'} ${formattedTime}` });

  // Build description with structured sections
  let description = '';
  
  // First section: Date, Meet, Roll out, Starting, Ending
  description += `**Date:** 📅 ${dateDisplay}\n`;
  description += `**Meet @:** ⏰ ${meetTime} | **Roll out @:** ⏳ ${rollTimeFormatted}\n`;
  
  if (ride.startingLocation) {
    const formattedStart = formatLocation(ride.startingLocation);
    description += `**Starting:** 🕸️ ${formattedStart}`;
  }
  
  if (ride.endLocation) {
    const formattedEnd = formatLocation(ride.endLocation);
    description += ` | **Ending:** 🐟 ${formattedEnd}`;
  }
  description += '\n\n';
  
  // Second section: Vibe, Avg speed, Distance, Route
  const paceText = ride.pace === 'spicy' && ride.avgSpeed 
    ? `${ride.pace} (${ride.avgSpeed} mph)`
    : ride.pace;
  
  // Combine vibe and drop policy
  const vibeText = `${paceText}, ${ride.dropPolicy}`;
  description += `**Vibe:** 🎉 ${vibeText}\n`;
  
  if (ride.avgSpeed) {
    description += `**Avg speed:** 🚤 ${ride.avgSpeed} mph`;
  }
  
  if (ride.mileage) {
    description += ` | **Distance:** 📏 ${ride.mileage} miles`;
  }
  
  if (ride.route) {
    description += `\n**Route:** ${ride.route}`;
  }
  description += '\n\n';
  
  // Third section: Leader, Sweep
  description += `**Leader:** <@${ride.leader.id}>`;
  
  if (ride.sweep) {
    description += ` | **Sweep:** <@${ride.sweep.id}>`;
  }
  description += '\n\n';
  embed.setDescription(description);
  
  return embed;
}

// Get color for ride type
function getRideColor(type) {
  const colors = {
    road: '#ff6b6b',      // Red
    gravel: '#4ecdc4',    // Teal
    trail: '#45b7d1',     // Blue
    social: '#96ceb4'     // Green
  };
  return colors[type] || '#95a5a6'; // Default gray
}

// Get reaction emoji for attendee type
function getReactionEmoji(attendeeType) {
  const emojis = {
    going: '🚴‍♂️',
    maybe: '🤔'
  };
  return emojis[attendeeType] || '❓';
}

// Validate ride type
function validateRideType(type) {
  const validTypes = ['road', 'gravel', 'trail', 'social'];
  if (!validTypes.includes(type.toLowerCase())) {
    throw new Error(`Invalid ride type. Must be one of: ${validTypes.join(', ')}`);
  }
  return type.toLowerCase();
}

// Validate pace
function validatePace(pace) {
  const validPaces = ['spicy', 'party'];
  if (!validPaces.includes(pace.toLowerCase())) {
    throw new Error(`Invalid pace. Must be one of: ${validPaces.join(', ')}`);
  }
  return pace.toLowerCase();
}

// Validate drop policy
function validateDropPolicy(policy) {
  const validPolicies = ['drop', 'no-drop'];
  if (!validPolicies.includes(policy.toLowerCase())) {
    throw new Error(`Invalid drop policy. Must be one of: ${validPolicies.join(', ')}`);
  }
  return policy.toLowerCase();
}

module.exports = {
  parseDate,
  parseTime,
  formatTime,
  formatDateWithToday,
  parseMileage,
  validateRouteUrl,
  formatRidePost,
  getReactionEmoji,
  validateRideType,
  validatePace,
  validateDropPolicy,
  getDefaultStartingLocation,
  validateLocation,
  formatLocation,
  LOCATIONS
}; 