
import sequelize from "./src/config/database";

async function fixKeys() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");

    const [results, metadata] = await sequelize.query("SHOW INDEX FROM users");
    console.log("Current Indexes on 'users':");
    
    // Group indexes by name
    const indexes: Record<string, any[]> = {};
    (results as any[]).forEach((row: any) => {
        if (!indexes[row.Key_name]) {
            indexes[row.Key_name] = [];
        }
        indexes[row.Key_name].push(row);
    });

    console.log(Object.keys(indexes));

    // Identify duplicate email indexes
    // Usually they look like 'email', 'email_2', 'email_3'...
    const emailIndexes = Object.keys(indexes).filter(name => name.startsWith('email'));
    
    if (emailIndexes.length > 1) {
        console.log(`Found ${emailIndexes.length} indexes for email. Keeping 'email' and dropping others.`);
        
        for (const indexName of emailIndexes) {
            if (indexName === 'email') continue; // Keep the main one (or PRIMARY if it was covering)
            
            console.log(`Dropping index: ${indexName}`);
            await sequelize.query(`DROP INDEX \`${indexName}\` ON users`);
        }
    } else {
        console.log("No duplicate email indexes found (or only one exists).");
    }

    console.log("Done.");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixKeys();
