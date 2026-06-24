// src/database/typeorm.datasource.ts
import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

console.log(__dirname + "/../../modules/**/*.entity{.ts,.js}");
const dbType = (process.env.DB_TYPE || "mysql") as "mysql" | "postgres";
const dbPrefix = dbType.toUpperCase();

export const AppDataSource = new DataSource({
  type: dbType,
  host: process.env[`${dbPrefix}_HOST`] || "localhost",
  port: Number(
    process.env[`${dbPrefix}_PORT`] || (dbType === "mysql" ? 3306 : 5432),
  ),
  username: process.env[`${dbPrefix}_USERNAME`] || "root",
  password: process.env[`${dbPrefix}_PASSWORD`] || "",
  database: process.env[`${dbPrefix}_DATABASE`] || "test",

  entities: [__dirname + "/../../../modules/**/*.entity{.ts,.js}"],

  migrations: [__dirname + "/../../../migrations/*.{ts,js}"],

  synchronize: false,
  logging: true,
  ...(dbType === "mysql" ? { charset: "utf8mb4" } : {}),
  timezone: "Z",
});

console.log(
  AppDataSource.entityMetadatas.map((e) => ({
    name: e.name,

    table: e.tableName,
  })),
);
