# chat_app_backend
## Stack used: Nodejs,Typescript,PrismaORM

The database provider is MySQL but you can change it anytime by modifying the "schema.prisma" file, and the database URL.

To migrate the databse:

## npx prisma migrate dev --name"yourMigrationNAme" -init

To generate the prisma client:

## npx prisma generate

Once the prisma client is generated we can run the application (dev environment) using:

npm run dev
