

import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize-typescript";
import config from "../config";

const fixIndexes = async () => {
    console.log("Starting index fix...");
    const sequelize = new Sequelize({
        dialect: "mysql",
        host: config.mysql.host,
        port: config.mysql.port,
        username: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        logging: false,
    });

    try {
        await sequelize.authenticate();
        console.log("Connected to database.");

        const [results] = await sequelize.query("SHOW INDEX FROM cities");
        // console.log("Indexes found:", results); 

        const indexes = results as any[];
        
        // Target 'name' and 'code' indexes specifically
        // Filter out PRIMARY and maybe the ones we WANT to keep if we knew their names, 
        // but since they are likely auto-named 'name', 'name_2', etc., removing all non-primary is safer for a reset.
        const targetIndexes = indexes.filter((idx: any) => 
            (idx.Column_name === 'name' || idx.Column_name === 'code' || idx.Key_name.startsWith('name') || idx.Key_name.startsWith('code')) 
            && idx.Key_name !== 'PRIMARY'
        );

        console.log(`Found ${targetIndexes.length} target indexes to drop.`);

        for (const idx of targetIndexes) {
            try {
                console.log(`Dropping index: ${idx.Key_name}`);
                await sequelize.query(`DROP INDEX \`${idx.Key_name}\` ON cities`);
            } catch (err: any) {
                console.error(`Failed to drop index ${idx.Key_name}:`, err.message);
            }
        }

        console.log("Index cleanup complete.");

    } catch (error: any) {
        console.error("Script error:", error);
    } finally {
        await sequelize.close();
    }
};

fixIndexes();

