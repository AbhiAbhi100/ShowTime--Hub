import { SeatLock, Show, User } from "../models";
import sequelize from "../config/database";

async function debugLocks() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    const locks = await SeatLock.findAll({
      include: [
          { model: Show, attributes: ['id', 'showTime'] },
          { model: User, attributes: ['email'] }
      ]
    });

    console.log(`Found ${locks.length} active locks:`);
    locks.forEach(l => {
        console.log(`- Show: ${l.showId} | Seat: ${l.seatId} | User: ${l.user?.email} | Expires: ${l.expiresAt}`);
    });

    if (locks.length === 0) {
        console.log("No locks found. This explains why they are green!");
    }

  } catch (error) {
    console.error("Debug failed:", error);
  } finally {
      process.exit();
  }
}

debugLocks();
