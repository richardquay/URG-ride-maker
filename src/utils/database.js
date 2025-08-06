const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

// Database utility functions for the ride bot

// Helper function to convert Firestore Timestamps to Date objects
function convertTimestamps(data) {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert common timestamp fields
  if (data.date && typeof data.date.toDate === 'function') {
    converted.date = data.date.toDate();
  }
  if (data.createdAt && typeof data.createdAt.toDate === 'function') {
    converted.createdAt = data.createdAt.toDate();
  }
  if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
    converted.updatedAt = data.updatedAt.toDate();
  }
  
  return converted;
}

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  getDb() {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  // Server Configuration Methods
  async getServerConfig(serverId) {
    try {
      const doc = await this.getDb().collection('serverConfigs').doc(serverId).get();
      if (doc.exists) {
        const data = doc.data();
        return convertTimestamps(data);
      }
      return null;
    } catch (error) {
      console.error('Error getting server config:', error);
      throw error;
    }
  }

  async createServerConfig(serverId, config) {
    try {
      const defaultConfig = {
        timezone: 'America/Chicago',
        channelMappings: {},
        settings: {
          reminderEnabled: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const finalConfig = { ...defaultConfig, ...config };
      await this.getDb().collection('serverConfigs').doc(serverId).set(finalConfig);
      return finalConfig;
    } catch (error) {
      console.error('Error creating server config:', error);
      throw error;
    }
  }

  async updateServerConfig(serverId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      await this.getDb().collection('serverConfigs').doc(serverId).update(updateData);
      return await this.getServerConfig(serverId);
    } catch (error) {
      console.error('Error updating server config:', error);
      throw error;
    }
  }

  // Ride Methods
  async createRide(rideData) {
    try {
      // Convert date to Firestore Timestamp if it's a Date object
      const rideDataWithTimestamps = { ...rideData };
      if (rideDataWithTimestamps.date instanceof Date) {
        rideDataWithTimestamps.date = admin.firestore.Timestamp.fromDate(rideDataWithTimestamps.date);
      }
      
      const ride = {
        ...rideDataWithTimestamps,
        attendees: {
          going: [],
          maybe: [],
          weather: []
        },
        createdAt: admin.firestore.Timestamp.fromDate(new Date()),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      const docRef = await this.getDb().collection('rides').add(ride);
      return { id: docRef.id, ...ride };
    } catch (error) {
      console.error('Error creating ride:', error);
      throw error;
    }
  }

  async getRide(rideId) {
    try {
      const doc = await this.getDb().collection('rides').doc(rideId).get();
      if (doc.exists) {
        const data = doc.data();
        return { id: doc.id, ...convertTimestamps(data) };
      }
      return null;
    } catch (error) {
      console.error('Error getting ride:', error);
      throw error;
    }
  }

  async updateRide(rideId, updates) {
    try {
      // Convert date to Firestore Timestamp if it's a Date object
      const updateDataWithTimestamps = { ...updates };
      if (updateDataWithTimestamps.date instanceof Date) {
        updateDataWithTimestamps.date = admin.firestore.Timestamp.fromDate(updateDataWithTimestamps.date);
      }
      
      const updateData = {
        ...updateDataWithTimestamps,
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      };
      await this.getDb().collection('rides').doc(rideId).update(updateData);
      return await this.getRide(rideId);
    } catch (error) {
      console.error('Error updating ride:', error);
      throw error;
    }
  }

  async getActiveRides(serverId) {
    try {
      console.log('Getting active rides for serverId:', serverId);
      
      // First, try to get all rides for this server
      const snapshot = await this.getDb()
        .collection('rides')
        .where('serverId', '==', serverId)
        .get();

      console.log('Found', snapshot.docs.length, 'total rides for server');
      
      // Filter by date in JavaScript instead of Firestore query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeRides = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, ...convertTimestamps(data) };
        })
        .filter(ride => {
          if (!ride.date) return false;
          const rideDate = new Date(ride.date);
          return rideDate >= today;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      console.log('Found', activeRides.length, 'active rides');
      return activeRides;
      
    } catch (error) {
      console.error('Error getting active rides:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async updateRideAttendees(rideId, attendeeType, userId, action) {
    try {
      const ride = await this.getRide(rideId);
      if (!ride) throw new Error('Ride not found');

      const attendees = { ...ride.attendees };
      
      // Remove user from all lists first
      Object.keys(attendees).forEach(type => {
        attendees[type] = attendees[type].filter(id => id !== userId);
      });

      // Add user to specified list if action is 'add'
      if (action === 'add') {
        attendees[attendeeType].push(userId);
      }

      await this.updateRide(rideId, { attendees });
      return await this.getRide(rideId);
    } catch (error) {
      console.error('Error updating ride attendees:', error);
      throw error;
    }
  }

  // Utility Methods
  async deleteRide(rideId) {
    try {
      await this.getDb().collection('rides').doc(rideId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting ride:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseManager(); 