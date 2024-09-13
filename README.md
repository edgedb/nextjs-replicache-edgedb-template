# 🎉 Next.js + Replicache + EdgeDB Todo App Starter

This starter template is crafted to help developers build and deploy applications using Next.js, Replicache, and EdgeDB. It includes essential functionalities for real-time collaboration with offline capabilities and a ready-to-use API setup.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fedgedb%2Fnextjs-replicache-edgedb-starter&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22edgedb%22%2C%22productSlug%22%3A%22edgedb%22%7D%5D)

## 🚀 Features

- [**Next.js**](https://nextjs.org/) for building the React frontend.
- [**Replicache**](https://replicache.dev/) for enabling real-time collaborative features and offline capabilities.
- [**EdgeDB**](https://edgedb.com/) as the backend database to store and sync data efficiently.
- [**TypeScript**](https://www.typescriptlang.org/) for static type-checking along with modern JavaScript features.
- [**Tailwind CSS**](https://tailwindcss.com/) for utility-first CSS styling.

### Data Synchronization and Conflict Resolution

This project implements Replicache's "reset strategy" for data synchronization and conflict resolution.

For more details on the reset strategy and other synchronization approaches with Replicache, visit the [synchronization strategies overview](https://doc.replicache.dev/strategies/overview) on their documentation site.

## 🧐 What's Inside?
This project follows a structured approach typical of Next.js applications with additional directories specific to Replicache and EdgeDB:

```bash
.
├── app                    # Next.js pages and components
│   ├── api                # API routes
│   │   ├── pull           # Pull endpoint for Replicache
│   │   │   └── route.ts
│   │   └── push           # Push endpoint for Replicache
│   │       └── route.ts
│   ├── components         # React components
│   │   └── TodoList.tsx   # Todo list component
│   ├── favicon.ico        # Favicon
│   ├── globals.css        # Global CSS styles
│   ├── layout.tsx         # Layout component
│   └── page.tsx           # Entry point for the app
├── dbschema               # EdgeDB schema files
│   ├── default.esdl       # EdgeDB schema definition
│   └── migrations         # Schema migrations
├── lib                    # Library functions and components
│   ├── edgedb.ts          # EdgeDB client configuration
│   ├── mutators.ts        # Replicache mutator functions
│   └── types.ts           # TypeScript types for the project
├── public                 # Static assets like images and fonts
├── edgedb.toml            # EdgeDB configuration file
├── eslint.config.js       # ESLint configuration
├── next-env.d.ts          # Next.js types
├── next.config.js         # Next.js configuration
├── package.json           # NPM dependencies and scripts
├── pnpm-lock.yaml         # pnpm lockfile
├── postcss.config.js      # PostCSS configuration
├── README.md              # Project README
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## 🏁 Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/edgedb/nextjs-replicache-edgedb-starter.git
cd nextjs-replicache-edgedb-starter
```

### 2. Install dependencies

```sh
pnpm install # or npm install or yarn install
```

### 3. Set up EdgeDB

Run the EdgeDB project initialization:

```sh
npx edgedb project init
```

### 4. Set up environment variables

Create a `.env.local` file in the root directory and add the following environment variables:

```sh
NEXT_PUBLIC_REPLICACHE_LICENSE_KEY = "your-replicache-license-key"
```

You can get your Replicache license key by running:

```sh
npx replicache@latest get-license
```

Replace the Replicache key in the `page.tsx` file with your license key.

```diff
  const replicache = new Replicache({
    name: userID,
-   licenseKey: TEST_LICENSE_KEY,
+   licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY,
    mutators: { createTodo, updateTodo, deleteTodo },
    puller: pull,
  });
```

### 5. Start the development server

```sh
pnpm dev # or npm run dev or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 🔧 Extend and customize

### Modify the schema

Adjust the schema in `dbschema/default.esdl` to meet your application's needs. For example, add new types or extend existing ones with additional properties.

### Update data fetching

Modify data fetching logic in the lib directory to enhance or alter how data interacts between the client and the database.

### Enhance styles

Update the global CSS styles in `app/globals.css` or add new styles using Tailwind CSS utility classes.

## 🌐 Deployment

Deploy your application to production using Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fedgedb%2Fnextjs-replicache-edgedb-starter&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22edgedb%22%2C%22productSlug%22%3A%22edgedb%22%7D%5D)

## 👀 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Replicache Documentation](https://replicache.dev/docs)
- [EdgeDB Documentation](https://www.edgedb.com/docs)
