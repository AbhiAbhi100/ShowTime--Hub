
import dotenv from "dotenv";
import path from "path";
import sequelize from "../config/database";
import { Theatre } from "../models/Theatre";
import { Screen } from "../models/Screen";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function fixMissingScreens() {
  console.log("🛠️  Starting Screen Backfill...");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    const theatres = await Theatre.findAll({
      include: [{ model: Screen, as: "screens" }],
    });

    console.log(`Found ${theatres.length} theatres.`);

    let fixedCount = 0;

    for (const theatre of theatres) {
      if (!theatre.screens || theatre.screens.length === 0) {
        console.log(`⚠️  Theatre "${theatre.name}" has NO screens. Creating one...`);
        
        await Screen.create({
          name: "Screen 1",
          theatreId: theatre.id,
          totalSeats: 150,
          seatLayout: { rows: 10, cols: 15 },
          type: "Standard",
        });

        fixedCount++;
        console.log(`   ✅ Created "Screen 1" for "${theatre.name}"`);
      } else {
        console.log(`   OK: "${theatre.name}" has ${theatre.screens.length} screens.`);
      }
    }

    console.log(`\n🎉 Backfill complete! Fixed ${fixedCount} theatres.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

fixMissingScreens();
