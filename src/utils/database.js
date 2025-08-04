const { getFirestore } = require('../config/firebase');

// Database utility functions for the ride bot
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
        return doc.data();
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
      const ride = {
        ...rideData,
        attendees: {
          going: [],
          maybe: [],
          weather: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
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
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting ride:', error);
      throw error;
    }
  }

  async updateRide(rideId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
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
      const snapshot = await this.getDb()
        .collection('rides')
        .where('serverId', '==', serverId)
        .where('date', '>=', new Date())
        .orderBy('date', 'asc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting active rides:', error);
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