# chat_app_backend
## Stack used: Nodejs,Typescript,PrismaORM

The database provider is MySQL but you can change it anytime by modifying the "schema.prisma" file, and the database URL.

To migrate the databse:

## npx prisma migrate dev --name"yourMigrationNAme" init

To generate the prisma client:

## npx prisma generate

If you want to revert a migration that was completed successfully, you can simply modify your schema, run the up migration and re-generate the prisma client (this will automatically drop the columns or the table that you deleted in your schema).
If the up migration wasn't completed successfully refer to [documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/generating-down-migrations) to generate a down migration

Once the prisma client is generated we can run the application (dev environment) using:

npm run dev
