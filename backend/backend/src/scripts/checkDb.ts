import { testDbConnection } from "../config/db";

testDbConnection()
  .then(() => {
    console.log("Database connection check passed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Database connection failed:");
    console.error(err.message);
    process.exit(1);
  });
